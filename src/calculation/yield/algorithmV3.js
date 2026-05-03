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

  // ---------------------------------------------------------------------------
  // Local Search 後処理 — バー削減
  // FFD 結果に対し「このバーの中身を他バーに分散できるか」を試す。
  // できれば 1 本削減。FFD の理論限界 (11/9) を一気に詰める。
  // ---------------------------------------------------------------------------
  function _canRedistribute(donorPieces, otherBars, blade, endLoss) {
    var piecesDesc = donorPieces.slice().sort(function(a, b) { return b - a; });
    var temp = otherBars.map(function(b) {
      return { stock: b.stock, used: b.used, count: b.pieces.length };
    });
    for (var i = 0; i < piecesDesc.length; i++) {
      var piece = piecesDesc[i];
      var bestIdx = -1, bestRemain = Infinity;
      for (var j = 0; j < temp.length; j++) {
        var tb = temp[j];
        var cost = tb.count === 0 ? piece : piece + blade;
        var eff = tb.stock - endLoss;
        var remain = eff - tb.used - cost;
        if (remain >= 0 && remain < bestRemain) {
          bestRemain = remain;
          bestIdx = j;
        }
      }
      if (bestIdx < 0) return false;
      var t = temp[bestIdx];
      t.used += (t.count === 0 ? piece : piece + blade);
      t.count++;
    }
    return true;
  }

  function _redistributeInto(donorPieces, otherBars, blade, endLoss) {
    var piecesDesc = donorPieces.slice().sort(function(a, b) { return b - a; });
    for (var i = 0; i < piecesDesc.length; i++) {
      var piece = piecesDesc[i];
      var bestIdx = -1, bestRemain = Infinity;
      for (var j = 0; j < otherBars.length; j++) {
        var tb = otherBars[j];
        var cost = tb.pieces.length === 0 ? piece : piece + blade;
        var eff = tb.stock - endLoss;
        var remain = eff - tb.used - cost;
        if (remain >= 0 && remain < bestRemain) {
          bestRemain = remain;
          bestIdx = j;
        }
      }
      if (bestIdx < 0) return false;
      var t = otherBars[bestIdx];
      var c = t.pieces.length === 0 ? piece : piece + blade;
      t.used += c;
      t.pieces.push(piece);
    }
    return true;
  }

  function _localSearchEliminate(rawBars, blade, endLoss, stocksAsc) {
    if (rawBars.length <= 1) return rawBars;
    var bars = rawBars.map(function(b) {
      return { stock: b.stock, used: b.used, pieces: b.pieces.slice() };
    });
    var improved = true, safety = 0;
    while (improved && safety++ < 1000) {
      improved = false;
      var sortedIdx = bars.map(function(b, i) {
        var eff = b.stock - endLoss;
        return { i: i, ratio: eff > 0 ? b.used / eff : 1 };
      }).sort(function(a, b) { return a.ratio - b.ratio; });

      for (var k = 0; k < sortedIdx.length; k++) {
        var idx = sortedIdx[k].i;
        var cand = bars[idx];
        var others = bars.filter(function(_, j) { return j !== idx; });
        if (_canRedistribute(cand.pieces, others, blade, endLoss)) {
          _redistributeInto(cand.pieces, others, blade, endLoss);
          bars.splice(idx, 1);
          improved = true;
          break;
        }
      }
    }
    // downsize
    for (var bi = 0; bi < bars.length; bi++) {
      var b2 = bars[bi];
      for (var si = 0; si < stocksAsc.length; si++) {
        if (stocksAsc[si] - endLoss >= b2.used) {
          b2.stock = stocksAsc[si];
          break;
        }
      }
    }
    return bars;
  }

  // 2 戦略並走 + 各々に local search 適用、_pickBetter で良い方
  function ffdPackMultiStockInline(spec) {
    var blade = spec.blade || 0;
    var endLoss = spec.endLoss || 0;
    var stocksAsc = (spec.availableStocks || []).slice().sort(function(a, b) { return a - b; });

    var rawA = _packOneStrategy(spec, 'maxStock');
    var rawB = _packOneStrategy(spec, 'smartStock');
    if (rawA.length > 0) rawA = _localSearchEliminate(rawA, blade, endLoss, stocksAsc);
    if (rawB.length > 0) rawB = _localSearchEliminate(rawB, blade, endLoss, stocksAsc);

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

  // ---------------------------------------------------------------------------
  // 材料下界 (lower bound) — Compute minimum bars / minimum stockTotal
  // (algorithmV3 用 inline 版、multiStockGuard.js と同じ式)
  // ---------------------------------------------------------------------------
  function computeLowerBoundInline(pieces, stocks, blade, endLoss) {
    if (!pieces || !stocks || stocks.length === 0) {
      return { minBars: 0, totalPieceLen: 0, totalPieces: 0 };
    }
    var maxStock = stocks.reduce(function(m, s) { return s > m ? s : m; }, 0);
    var maxBarCapacity = maxStock - endLoss;
    if (maxBarCapacity <= 0) return { minBars: 0, totalPieceLen: 0, totalPieces: 0 };
    var totalPieceLen = 0;
    var totalPieces = 0;
    pieces.forEach(function(p) {
      totalPieceLen += p.length * p.count;
      totalPieces += p.count;
    });
    var num = totalPieceLen + totalPieces * blade;
    var denom = maxBarCapacity + blade;
    return {
      minBars: denom > 0 ? Math.ceil(num / denom) : 0,
      totalPieceLen: totalPieceLen,
      totalPieces: totalPieces
    };
  }

  function v3BarsToCalcCoreEntry(v3Bars, blade, endLoss, kgm, opts) {
    opts = opts || {};
    // v3Bars = [{ stock, used, pieces: [length, ...] }, ...]
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
    var yieldPct = 100 - lossRate;

    // ---- desc 構築 ----
    var stockDesc = Object.keys(stockUsed).map(Number).sort(function(a, b) { return b - a; })
      .map(function(sl) {
        return sl.toLocaleString() + 'mm × ' + stockUsed[sl] + '本';
      }).join(' + ');

    // 注釈: V3 タグ + V2 比較 + LP 下界差
    var annotations = ['V3'];
    if (typeof opts.v2BestLossRate === 'number' && lossRate < opts.v2BestLossRate - 0.001) {
      var gain = opts.v2BestLossRate - lossRate;
      annotations.push('V2比 +' + gain.toFixed(2) + '%');
    }
    if (typeof opts.lowerBoundBars === 'number' && opts.lowerBoundBars > 0) {
      var actualBars = allBars.length;
      var barGap = actualBars - opts.lowerBoundBars;
      if (barGap === 0) {
        annotations.push('LP最適');
      } else if (barGap > 0 && barGap <= 5) {
        annotations.push('LB +' + barGap + '本');
      }
    }
    var desc = stockDesc + ' [' + annotations.join(' / ') + ']';

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
      type: 'v3_multi_ffd',
      // 追加メタ（UI 拡張時に使える）
      _v3Meta: {
        yieldPct: yieldPct,
        v2BestLossRate: opts.v2BestLossRate,
        lowerBoundBars: opts.lowerBoundBars
      }
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

    // V2 の allDP の中で最良 (lowest lossRate) を見つける → 比較用
    var v2BestLossRate = null;
    (v2Result.allDP || []).forEach(function(e) {
      if (e && e.type !== 'v3_multi_ffd' && typeof e.lossRate === 'number') {
        if (v2BestLossRate === null || e.lossRate < v2BestLossRate) {
          v2BestLossRate = e.lossRate;
        }
      }
    });

    // LP 下界（バー本数の理論最小）
    var lb = computeLowerBoundInline(v3Pieces, stocks, options.blade || 0, options.endLoss || 0);

    var v3Entry = v3BarsToCalcCoreEntry(v3Bars, options.blade || 0, options.endLoss || 0, options.kgm || 0, {
      v2BestLossRate: v2BestLossRate,
      lowerBoundBars: lb.minBars
    });

    // V2 の allDP に V3 entry を追加して再ソート
    // tiebreaker: 同 lossRate なら V3 entry を優先（[V3 / LP最適] 等のメタ情報が有用）
    var newAllDP = (v2Result.allDP || []).slice();
    newAllDP.push(v3Entry);
    newAllDP.sort(function(a, b) {
      if (a.lossRate !== b.lossRate) return a.lossRate - b.lossRate;
      if (a.type === 'v3_multi_ffd' && b.type !== 'v3_multi_ffd') return -1;
      if (b.type === 'v3_multi_ffd' && a.type !== 'v3_multi_ffd') return 1;
      return 0;
    });

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
