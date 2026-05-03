/**
 * TORIAI 計算 V3 「Symbolic Pattern Algebra + Multi-Stock FFD」
 *
 * algorithmV3.js — drop-in patch for production wiring.
 *
 * 設計方針:
 *   - V2 と同じ drop-in パターン。既存ファイルを 1 行も書換えない
 *   - V2 の calcCore 結果に V3 の multi-stock FFD 結果を **追加** する
 *     （allDP に entry を inject、yieldCard1 が自動的に最良解になる）
 *   - V2 が苦手な「単一定尺縮退」を V3 が補正
 *   - feature flag で V2 のみに即ロールバック可能
 *
 * 配線:
 *   patternPacking → repeatPlans → bundlePlan → calcCore → algorithmV2 → algorithmV3
 *
 * Multi-stock FFD ロジックは src/calculation/yield/arcflow/solver.js の
 * `ffdPackMultiStock` と同等（CommonJS の方は Node テスト用、こちらはブラウザ runtime 用）。
 * 将来的に UMD パターンで統合する余地あり。
 *
 * ロールバック:
 *   ns.calculation.yield.v3Config.rollback();   → V2 のみで動作
 *   ns.calculation.yield.v3Config.enable();     → V3 augmentation 復活
 */

(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns || !ns.calculation || !ns.calculation.yield) return;
  var Y = ns.calculation.yield;

  var origCalcCore = Y.calcCore;
  if (typeof origCalcCore !== 'function') {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[TORIAI v3] orig calcCore not found, V3 disabled. Load order: ... calcCore.js → algorithmV2.js → algorithmV3.js');
    }
    return;
  }

  // ===========================================================================
  // 設定 (feature flag + ロールバック制御)
  // ===========================================================================
  var v3Enabled = true;

  // ===========================================================================
  // Multi-Stock FFD（インライン版）
  //
  // arcflow/solver.js の ffdPackMultiStock と同じアルゴリズム。
  //   1. 全 piece 降順、最大定尺で BFD
  //   2. 各バーを「中身が収まる最小定尺」へ downsize
  // ===========================================================================

  // 単一戦略の BFD パッキング
  function _packOneStrategy(spec, strategy) {
    var blade = spec.blade || 0;
    var endLoss = spec.endLoss || 0;
    var stocksAsc = spec.availableStocks.slice().sort(function(a, b) { return a - b; });
    var maxStock = stocksAsc[stocksAsc.length - 1];

    var flat = [];
    spec.pieces.forEach(function(p) {
      for (var i = 0; i < p.count; i++) flat.push(p.length);
    });
    flat.sort(function(a, b) { return b - a; });

    var maxEff = maxStock - endLoss;
    for (var fi = 0; fi < flat.length; fi++) {
      if (flat[fi] > maxEff) return [];
    }

    function chooseStock(len) {
      if (strategy === 'maxStock') return maxStock;
      var chosen = maxStock;
      var bestRatio = Infinity;
      for (var si = 0; si < stocksAsc.length; si++) {
        var s = stocksAsc[si];
        if (s - endLoss < len) continue;
        var piecesPerBar = Math.floor((s - endLoss + blade) / (len + blade));
        if (piecesPerBar === 0) continue;
        var ratio = s / piecesPerBar;
        if (ratio < bestRatio) {
          bestRatio = ratio;
          chosen = s;
        }
      }
      return chosen;
    }

    var bars = [];
    flat.forEach(function(len) {
      var bestIdx = -1;
      var bestRemain = Infinity;
      for (var i = 0; i < bars.length; i++) {
        var bar = bars[i];
        var cost = bar.pieces.length === 0 ? len : len + blade;
        var eff = bar.stock - endLoss;
        var remain = eff - bar.used - cost;
        if (remain >= 0 && remain < bestRemain) {
          bestRemain = remain;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        var b = bars[bestIdx];
        var cost2 = b.pieces.length === 0 ? len : len + blade;
        b.used += cost2;
        b.pieces.push(len);
      } else {
        bars.push({ stock: chooseStock(len), used: len, pieces: [len] });
      }
    });

    bars.forEach(function(bar) {
      for (var i = 0; i < stocksAsc.length; i++) {
        if (stocksAsc[i] - endLoss >= bar.used) {
          bar.stock = stocksAsc[i];
          break;
        }
      }
    });

    return bars;
  }

  function _stockTotal(bars) {
    return bars.reduce(function(s, b) { return s + b.stock; }, 0);
  }

  function _barCount(bars) {
    return bars.length;
  }

  // 2 戦略並走、_pickBetter で良い方を選ぶ
  //   - 母材差 5% 以上 → 母材優先
  //   - それ以外 → バー本数優先
  function ffdPackMultiStockInline(spec) {
    var rawA = _packOneStrategy(spec, 'maxStock');
    var rawB = _packOneStrategy(spec, 'smartStock');
    if (rawA.length === 0 && rawB.length === 0) return [];
    if (rawA.length === 0) return rawB;
    if (rawB.length === 0) return rawA;
    var stA = _stockTotal(rawA);
    var stB = _stockTotal(rawB);
    var bcA = _barCount(rawA);
    var bcB = _barCount(rawB);
    var stockMin = Math.min(stA, stB);
    if (stockMin > 0 && Math.abs(stA - stB) / stockMin > 0.05) {
      return stA <= stB ? rawA : rawB;
    }
    return bcA <= bcB ? rawA : rawB;
  }

  // ===========================================================================
  // V3 result → V2 calcCore allDP entry 形式へのコンバータ
  //
  // V2 calcCore 内の allDP[i] 形式:
  //   { desc, lossRate, lossKg, barKg, bars, slA, slB, bA, bB, chg, type }
  //
  // bars[i] = { pat: [length, ...], loss, sl }
  // ===========================================================================

  function v3BarsToCalcCoreEntry(v3Bars, blade, endLoss, kgm) {
    // v3Bars = [{ stock, used, pieces: [length, ...] }, ...]
    // 各 bar を 1 つずつ展開（count を解いて個別バーに）
    var allBars = [];
    var stockUsed = {};

    v3Bars.forEach(function(bar) {
      var sortedPat = bar.pieces.slice().sort(function(a, b) { return b - a; });
      var pieceLen = sortedPat.reduce(function(s, p) { return s + p; }, 0);
      var sizeWithBlades = pieceLen + Math.max(0, sortedPat.length - 1) * blade;
      var loss = (bar.stock - endLoss) - sizeWithBlades;
      allBars.push({ pat: sortedPat, loss: loss, sl: bar.stock });
      stockUsed[bar.stock] = (stockUsed[bar.stock] || 0) + 1;
    });

    var totalUse = allBars.reduce(function(s, b) { return s + b.sl; }, 0);
    var totalLoss = allBars.reduce(function(s, b) { return s + b.loss; }, 0);
    var totalPieces = allBars.reduce(function(s, b) {
      return s + b.pat.reduce(function(a, p) { return a + p; }, 0);
    }, 0);
    var lossKg = (totalLoss / 1000) * (kgm || 0);
    var barKg = (totalUse / 1000) * (kgm || 0);
    var lossRate = totalUse > 0 ? (1 - totalPieces / totalUse) * 100 : 100;

    var desc = Object.keys(stockUsed).map(Number).sort(function(a, b) { return b - a; })
      .map(function(sl) {
        return sl.toLocaleString() + 'mm × ' + stockUsed[sl] + '本';
      }).join(' + ') + ' [V3]';

    var slKeys = Object.keys(stockUsed);
    var slA = slKeys.length > 0 ? Number(slKeys[0]) : 0;

    return {
      desc: desc,
      lossRate: lossRate,
      lossKg: lossKg,
      barKg: barKg,
      bars: allBars,
      slA: slA,
      slB: slKeys.length > 1 ? Number(slKeys[1]) : null,
      bA: allBars,
      bB: [],
      chg: 0,
      type: 'v3_multi_ffd'
    };
  }

  // ===========================================================================
  // V3 calcCore wrapper
  //
  //   1. V2 origCalcCore を呼ぶ（既存挙動維持）
  //   2. v3Enabled && pieces 揃ってる場合に V3 multi-stock FFD を実行
  //   3. V3 結果を allDP に追加 → 再ソート → yieldCard1 自動更新
  //
  // V2 出力は変えない（pasA/B/C, single, chgPlans 等は触らない）。
  // V3 が劣化解を出す場合でも、ソートで V2 解が選ばれる安全設計。
  // ===========================================================================

  function calcCoreV3(options) {
    var v2Result = origCalcCore(options);

    if (!v3Enabled) return v2Result;

    // V2 が空ピースで終わってたら V3 も走らない
    if (!v2Result || !v2Result.calcPieces || v2Result.calcPieces.length === 0) {
      return v2Result;
    }

    var stocks = (options.stocks || []).map(function(s) { return s.sl; });
    if (stocks.length === 0) return v2Result;

    // V2 origPieces からカウント形式へ集約
    var origPieces = options.pieces || [];
    var pieceCounts = {};
    origPieces.forEach(function(len) { pieceCounts[len] = (pieceCounts[len] || 0) + 1; });
    var v3Pieces = Object.keys(pieceCounts).map(function(k) {
      return { length: Number(k), count: pieceCounts[k] };
    });

    // V3 multi-stock FFD 実行（同期、HiGHS 不要）
    var v3Bars;
    try {
      v3Bars = ffdPackMultiStockInline({
        blade: options.blade || 0,
        endLoss: options.endLoss || 0,
        availableStocks: stocks,
        pieces: v3Pieces
      });
    } catch (e) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[TORIAI v3] FFD failed, fallback to V2-only result:', e && e.message);
      }
      return v2Result;
    }

    if (!v3Bars || v3Bars.length === 0) return v2Result;

    var v3Entry = v3BarsToCalcCoreEntry(v3Bars, options.blade || 0, options.endLoss || 0, options.kgm || 0);

    // V2 の allDP に V3 entry を追加して再ソート
    var newAllDP = (v2Result.allDP || []).slice();
    newAllDP.push(v3Entry);
    newAllDP.sort(function(a, b) { return a.lossRate - b.lossRate; });

    var newYieldCard1 = newAllDP.length > 0 ? newAllDP[0] : v2Result.yieldCard1;

    // Object.assign で v2Result の他フィールドは温存
    return Object.assign({}, v2Result, {
      allDP: newAllDP,
      yieldCard1: newYieldCard1
    });
  }

  // ===========================================================================
  // インストール
  // ===========================================================================
  Y.calcCoreV2OrV1 = origCalcCore; // 元（V2 が patch 済の calcCore）を保存
  Y.calcCoreV3 = calcCoreV3;
  Y.calcCore = calcCoreV3;

  Y.v3Config = {
    isEnabled: function() { return v3Enabled; },
    enable: function() { v3Enabled = true; },
    rollback: function() {
      v3Enabled = false;
      Y.calcCore = origCalcCore;
      if (typeof console !== 'undefined' && console.log) {
        console.log('[TORIAI v3] Rolled back to V2 calcCore.');
      }
    },
    // テスト用
    _ffdPackMultiStockInline: ffdPackMultiStockInline,
    _v3BarsToCalcCoreEntry: v3BarsToCalcCoreEntry
  };

  if (typeof console !== 'undefined' && console.log) {
    console.log('[TORIAI v3] algorithmV3 loaded — multi-stock FFD augmentation active.');
  }

})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
