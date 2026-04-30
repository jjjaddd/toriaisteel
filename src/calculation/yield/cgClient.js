/**
 * src/calculation/yield/cgClient.js
 *
 * Phase 4-F: ブラウザから Supabase Edge Function (CG) を呼ぶ薄い fetch ラッパ。
 *
 * 公開 API:
 *   Toriai.calculation.yield.setSupabaseConfig(url, anonKey)
 *     - 起動時に1回呼ぶ。URL / anon key を内部に保持。
 *   Toriai.calculation.yield.isCGAvailable()
 *     - config が設定されてるか確認
 *   await Toriai.calculation.yield.solveCuttingStockCGRemote(input)
 *     - input: { pieces, stocks, blade, endLoss, maxIter }
 *     - return: { bars, sl, lossRate, yieldPct, totalMaterial, lpValue, gap, ... }
 *
 *   await Toriai.calculation.yield.compareV2vsCG(input)
 *     - v2 (calcCore) と CG を両方実行して比較結果を返す
 *
 * 認証ゲートはまだ無いので、anon key でも誰でも呼べる状態。
 * Pro 化のタイミングで Edge Function 側に認証チェックを追加する想定（README参照）。
 */

(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns) return;
  ns.calculation = ns.calculation || {};
  ns.calculation.yield = ns.calculation.yield || {};
  var Y = ns.calculation.yield;

  var _config = {
    supabaseUrl: null,
    anonKey: null,
    timeoutMs: 90000  // 長考は 90秒上限（Supabase 側 60秒 + 余白）
  };

  function setSupabaseConfig(url, anonKey) {
    _config.supabaseUrl = (url || '').replace(/\/$/, '');
    _config.anonKey = anonKey || '';
  }

  function getSupabaseConfig() {
    return { url: _config.supabaseUrl, anonKey: _config.anonKey ? '***' : '' };
  }

  function isCGAvailable() {
    return !!(_config.supabaseUrl && _config.anonKey);
  }

  function piecesToItemsDemArr(pieces) {
    var cnt = {};
    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      cnt[p] = (cnt[p] || 0) + 1;
    }
    var items = Object.keys(cnt).map(Number).sort(function(a, b) { return b - a; });
    var demArr = items.map(function(l) { return cnt[l]; });
    return { items: items, demArr: demArr };
  }

  // CG 結果を v2 の yieldCard1 と互換にするためのバッジ判定
  function badgeFromGap(gap) {
    if (gap < 1e-9) return 'optimal';
    if (gap < 0.01) return 'lp99';
    if (gap < 0.05) return 'nearOpt';
    return 'heuristic';
  }

  async function solveCuttingStockCGRemote(input) {
    if (!isCGAvailable()) {
      throw new Error('[CG client] Supabase 未設定。setSupabaseConfig(url, anonKey) を起動時に呼んでください。');
    }

    var pieces = (input.pieces || []).filter(function(p) { return p > 0; });
    var stocks = input.stocks || [];
    if (pieces.length === 0) throw new Error('[CG client] pieces 空');
    if (stocks.length === 0) throw new Error('[CG client] stocks 空');

    var blade = +input.blade || 0;
    var endLoss = +input.endLoss || 0;

    var conv = piecesToItemsDemArr(pieces);

    var body = {
      items: conv.items,
      demArr: conv.demArr,
      stocks: stocks.map(function(s) { return { sl: s.sl }; }),
      blade: blade,
      endLoss: endLoss,
      maxIter: input.maxIter || 500
    };

    var url = _config.supabaseUrl + '/functions/v1/cg';
    var t0 = Date.now();

    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function() { ctrl.abort(); }, _config.timeoutMs) : null;

    try {
      var res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + _config.anonKey,
          'Content-Type': 'application/json',
          'apikey': _config.anonKey
        },
        body: JSON.stringify(body),
        signal: ctrl ? ctrl.signal : undefined
      });
      if (timer) clearTimeout(timer);

      if (!res.ok) {
        var txt = await res.text();
        throw new Error('CG API HTTP ' + res.status + ': ' + txt.substring(0, 200));
      }
      var data = await res.json();
      if (!data.ok) throw new Error('CG API error: ' + (data.error || 'unknown'));

      var totalElapsed = Date.now() - t0;

      // 各 bar に sl が入っている前提で、TORIAI の yieldCard1 形式に整形
      var slMap = {};
      data.bars.forEach(function(b) { slMap[b.sl] = (slMap[b.sl] || 0) + 1; });
      var desc = Object.keys(slMap).sort(function(a, b) { return +b - +a; })
        .map(function(sl) { return Number(sl).toLocaleString() + 'mm × ' + slMap[sl] + '本'; })
        .join(' + ');

      return {
        // yieldCard1 互換フィールド
        type: 'cg',
        bars: data.bars,
        sl: data.bars[0] ? data.bars[0].sl : (stocks[0] && stocks[0].sl) || 0,
        slA: data.bars[0] ? data.bars[0].sl : 0,
        slB: null,
        bA: data.bars,
        bB: [],
        chg: 0,
        desc: desc,
        lossRate: data.lossRate,
        // 重量系は kgm を持っていればここで計算（input から取れない場合は 0）
        lossKg: 0,
        barKg: 0,
        // CG 固有情報
        totalMaterial: data.totalMaterial,
        yieldPct: data.yieldPct,
        lpValue: data.lpValue,
        lpLowerBound: Math.ceil(data.lpValue / (data.bars[0] ? data.bars[0].sl : 1)),  // 参考値
        optimalityBadge: badgeFromGap(data.gap),
        optimalityGap: data.gap,
        algorithmTier: 3,
        iterations: data.iterations,
        patternsGenerated: data.patternsGenerated,
        msServer: data.ms,
        msTotal: totalElapsed
      };
    } catch (e) {
      if (timer) clearTimeout(timer);
      throw e;
    }
  }

  /**
   * v2 (ローカル) と CG (リモート) を並列実行して比較結果を返す
   * 結果: { v2: yieldCard1, cg: cgResult, winner: 'v2' | 'cg', ... }
   */
  async function compareV2vsCG(input) {
    if (typeof Y.calcCore !== 'function') {
      throw new Error('[CG compare] Y.calcCore が見つかりません');
    }

    // v2 (ローカル) はすぐ
    var v2t0 = Date.now();
    var v2Result = Y.calcCore({
      pieces: input.pieces, stocks: input.stocks,
      blade: input.blade, endLoss: input.endLoss, kgm: input.kgm,
      remnants: input.remnants || [], minValidLen: input.minValidLen || 500
    });
    var v2Card = v2Result && v2Result.yieldCard1;
    var v2Ms = Date.now() - v2t0;

    // CG (リモート) は async
    var cgPromise = isCGAvailable()
      ? solveCuttingStockCGRemote(input).catch(function(e) { return { error: e.message }; })
      : Promise.resolve({ error: 'CG not configured' });
    var cgResult = await cgPromise;

    var winner = 'v2';
    if (cgResult && !cgResult.error && v2Card && cgResult.lossRate < v2Card.lossRate) {
      winner = 'cg';
    }

    return {
      v2: v2Card ? { ...v2Card, msTotal: v2Ms } : null,
      cg: cgResult.error ? null : cgResult,
      cgError: cgResult.error || null,
      winner: winner,
      lossRateImprovement: (v2Card && cgResult && !cgResult.error)
        ? (v2Card.lossRate - cgResult.lossRate) : null
    };
  }

  Y.setSupabaseConfig = setSupabaseConfig;
  Y.getSupabaseConfig = getSupabaseConfig;
  Y.isCGAvailable = isCGAvailable;
  Y.solveCuttingStockCGRemote = solveCuttingStockCGRemote;
  Y.compareV2vsCG = compareV2vsCG;

  // 自動 config 検出: window.TORIAI_SUPABASE = { url, anonKey } が仕込んであれば即有効化
  try {
    var auto = global.TORIAI_SUPABASE || (typeof window !== 'undefined' && window.TORIAI_SUPABASE);
    if (auto && auto.url && auto.anonKey) {
      setSupabaseConfig(auto.url, auto.anonKey);
      console.log('[TORIAI cgClient] auto-configured from TORIAI_SUPABASE.');
    } else {
      console.log('[TORIAI cgClient] loaded. Set window.TORIAI_SUPABASE = { url, anonKey } or call setSupabaseConfig() to enable CG.');
    }
  } catch (_e) {
    console.log('[TORIAI cgClient] loaded (no auto-config).');
  }

})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
