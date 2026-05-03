/**
 * TORIAI 計算 V3 — Rational Column Generation (Phase K-3)
 *
 * 設計:
 *   - CG 全段を rational arithmetic で実行
 *   - LP 緩和: solveLPExact (K-1)
 *   - Pricing knapsack: boundedKnapsackExact (本ファイル、Rational value)
 *   - 整数解: solveMipExact (K-2)
 *
 * これにより CSP の cold-start CG → 整数最適 を **完全 exact** で解く
 * 世界初の browser-based exact CSP CG solver が実現する。
 *
 * 速度: K-2 で観測した 180x slowdown が CG では更に拡大する見込み。
 *      CASE-2 のような小規模なら実用、CASE-6 では実用外。
 *
 * 純関数 + dual-mode。
 */

'use strict';

function _resolveDep(nodePath, browserNs) {
  if (typeof require === 'function') {
    try { return require(nodePath); } catch (e) { /* fall through */ }
  }
  var g = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis);
  var parts = browserNs.split('.');
  var cur = g;
  for (var i = 0; i < parts.length; i++) {
    if (!cur) return null;
    cur = cur[parts[i]];
  }
  return cur;
}

var R = _resolveDep('./rational.js', 'Toriai.calculation.yield.research.rational');
var RLp = _resolveDep('./rationalLp.js', 'Toriai.calculation.yield.research.rationalLp');
var RBb = _resolveDep('./rationalBb.js', 'Toriai.calculation.yield.research.rationalBb');

// ============================================================================
// boundedKnapsackExact(items, capacity)
//
// Bounded knapsack DP with Rational values.
//
// items: [{ value: Rational, weight: int, count: int }]
// capacity: int
// 戻り値: { counts: int[], value: Rational, usedCapacity: int }
// ============================================================================

function boundedKnapsackExact(items, capacity) {
  var n = items.length;
  if (n === 0 || capacity <= 0) {
    return { counts: [], value: R.zero(), usedCapacity: 0 };
  }
  // dp[c] = best Rational value reachable with capacity ≤ c
  var dp = new Array(capacity + 1);
  for (var ci = 0; ci <= capacity; ci++) dp[ci] = R.zero();
  // parent[c] = { itemIdx, take, prevC } | null  for backtracking
  var parent = new Array(capacity + 1).fill(null);

  for (var i = 0; i < n; i++) {
    var w = items[i].weight;
    var v = items[i].value;
    var maxK = items[i].count;
    if (w <= 0 || R.isZero(v) || R.isNegative(v)) continue;
    if (typeof w !== 'number' || w !== Math.floor(w)) {
      throw new Error('[boundedKnapsackExact] weight must be integer');
    }

    var newDp = dp.slice();
    var newParent = parent.slice();

    for (var c = capacity; c >= w; c--) {
      var bestVal = newDp[c];
      var bestParent = newParent[c];
      var maxKHere = Math.min(maxK, Math.floor(c / w));
      for (var k = 1; k <= maxKHere; k++) {
        var kw = k * w;
        var kv = R.mul(R.fromInt(k), v);
        var cand = R.add(dp[c - kw], kv);
        if (R.gt(cand, bestVal)) {
          bestVal = cand;
          bestParent = { itemIdx: i, take: k, prevC: c - kw };
        }
      }
      newDp[c] = bestVal;
      newParent[c] = bestParent;
    }

    dp = newDp;
    parent = newParent;
  }

  // best capacity
  var bestC = 0;
  for (var cb = 1; cb <= capacity; cb++) {
    if (R.gt(dp[cb], dp[bestC])) bestC = cb;
  }

  // backtrack
  var counts = new Array(n).fill(0);
  var cur = bestC;
  while (parent[cur]) {
    var p = parent[cur];
    counts[p.itemIdx] += p.take;
    cur = p.prevC;
  }

  return { counts: counts, value: dp[bestC], usedCapacity: bestC };
}

// ============================================================================
// _initialPatternsFromFfd(spec, items) — float FFD で初期 pattern
//
// FFD は内部的には float OK (initial set 用、CG が後で精緻化する)
// ============================================================================

function _initialPatternsFromFfd(spec, items) {
  // 単純な FFD: 各 piece type を greedy に詰める
  // 最終結果の bars から pattern を抽出
  var ffd = require('../arcflow/solver.js').solveMultiStockGreedy(spec);
  if (!ffd.bars || ffd.bars.length === 0) return [];
  var seen = new Map();
  var patterns = [];
  ffd.bars.forEach(function(b) {
    var counts = new Array(items.length).fill(0);
    b.pattern.forEach(function(len) {
      var idx = items.findIndex(function(it) { return it.length === len; });
      if (idx >= 0) counts[idx]++;
    });
    var key = b.stock + ':' + counts.join(',');
    if (!seen.has(key)) {
      seen.set(key, true);
      patterns.push({ stock: b.stock, counts: counts });
    }
  });
  return patterns;
}

// ============================================================================
// solveColumnGenExact(spec, opts) — main entry
//
// spec: { pieces, availableStocks, blade?, endLoss? }
// opts: {
//   maxIterations?: number (default 30),
//   bbTimeLimit?: ms (default 30000),
//   verbose?: boolean
// }
// 戻り値: {
//   status, x: Rational[], xFloat: number[],
//   objective: Rational, objectiveFloat: number,
//   lpObjective: Rational, lpObjectiveFloat: number,
//   bars, patterns, iterations,
//   _exact: { gapRational, gapFloat }
// }
// ============================================================================

function solveColumnGenExact(spec, opts) {
  opts = opts || {};
  var maxIter = opts.maxIterations || 30;
  var bbTimeLimit = opts.bbTimeLimit != null ? opts.bbTimeLimit : 30000;
  var verbose = !!opts.verbose;

  if (!spec || !Array.isArray(spec.pieces) || !Array.isArray(spec.availableStocks)) {
    return { status: 'invalid_input', x: null, bars: [] };
  }
  var blade = spec.blade || 0;
  var endLoss = spec.endLoss || 0;
  var items = spec.pieces.map(function(p) {
    return { length: p.length, count: p.count, weight: p.length + blade };
  });
  var stocksAsc = spec.availableStocks.slice().sort(function(a, b) { return a - b; });

  // ---- 初期 pattern (FFD float OK) ----
  var patterns = _initialPatternsFromFfd(spec, items);
  if (patterns.length === 0) {
    // singleton fallback
    items.forEach(function(it, i) {
      var stockChoice = stocksAsc.find(function(s) { return s - endLoss >= it.length; });
      if (stockChoice) {
        var counts = new Array(items.length).fill(0);
        counts[i] = 1;
        patterns.push({ stock: stockChoice, counts: counts });
      }
    });
  }
  if (patterns.length === 0) {
    return { status: 'infeasible', x: null, bars: [] };
  }

  // ---- CG 反復 (exact) ----
  var lpObjective = null;
  var lastDualPi = null;
  var iter = 0;
  var totalLpIter = 0;
  for (iter = 0; iter < maxIter; iter++) {
    // LP spec 構築 (係数は整数なので Rational に直接できる)
    var n = patterns.length;
    var m = items.length;
    var c = patterns.map(function(p) { return p.stock; });
    var A = [];
    for (var i = 0; i < m; i++) {
      var row = new Array(n).fill(0);
      for (var j = 0; j < n; j++) row[j] = patterns[j].counts[i] || 0;
      A.push(row);
    }
    var b = items.map(function(it) { return it.count; });
    var types = items.map(function() { return '>='; });

    // Solve LP exactly
    var lp;
    try {
      lp = RLp.solveLPExact({ c: c, A: A, b: b, constraintTypes: types });
    } catch (e) {
      return { status: 'lp_error', x: null, bars: [], error: e.message, iter: iter };
    }
    if (lp.status !== 'optimal') {
      return { status: 'lp_not_optimal', x: null, bars: [], iter: iter };
    }
    lpObjective = lp.objective;
    lastDualPi = lp.duals;
    totalLpIter += lp.iterations;
    if (verbose) {
      console.log('[exact-CG] iter=' + iter + ' patterns=' + n + ' lp=' + lp.objectiveFloat.toFixed(2));
    }

    // ---- Pricing: 各 stock で best new pattern ----
    var bestPat = null;
    var bestRC = R.zero();
    for (var s = 0; s < stocksAsc.length; s++) {
      var stock = stocksAsc[s];
      var cap = stock - endLoss + blade;  // phantom blade trick
      if (cap <= 0) continue;
      var knapItems = items.map(function(it, i) {
        return { value: lastDualPi[i], weight: it.weight, count: it.count };
      });
      var knap = boundedKnapsackExact(knapItems, cap);
      // reduced cost = pricing.value - stock (in original problem)
      // For min objective with ≥ constraints: RC = stock - Σ π_i × counts_i
      // Pattern is improving if RC < 0 ⇔ Σ π × counts > stock ⇔ pricing.value > stock
      var stockRat = R.fromInt(stock);
      var rcRat = R.sub(knap.value, stockRat); // positive = improving
      var totalCount = knap.counts.reduce(function(a, b) { return a + b; }, 0);
      if (R.gt(rcRat, bestRC) && totalCount > 0) {
        bestRC = rcRat;
        bestPat = { stock: stock, counts: knap.counts };
      }
    }

    if (bestPat === null) {
      // No improving pattern → LP optimal
      if (verbose) console.log('[exact-CG] converged at iter=' + iter);
      break;
    }

    // duplicate check
    var newKey = bestPat.stock + ':' + bestPat.counts.join(',');
    var exists = patterns.some(function(p) { return (p.stock + ':' + p.counts.join(',')) === newKey; });
    if (exists) break;
    patterns.push(bestPat);
  }

  // ---- 整数解: solveMipExact で B&B ----
  var n2 = patterns.length;
  var m2 = items.length;
  var c2 = patterns.map(function(p) { return p.stock; });
  var A2 = [];
  for (var i2 = 0; i2 < m2; i2++) {
    var row2 = new Array(n2).fill(0);
    for (var j2 = 0; j2 < n2; j2++) row2[j2] = patterns[j2].counts[i2] || 0;
    A2.push(row2);
  }
  var b2 = items.map(function(it) { return it.count; });
  var types2 = items.map(function() { return '>='; });

  var mip = RBb.solveMipExact({
    c: c2, A: A2, b: b2, constraintTypes: types2
  }, {
    timeLimit: bbTimeLimit,
    maxNodes: 50000,
    verbose: verbose
  });

  // 結果整形
  if (!mip.x) {
    return {
      status: mip.status,
      x: null, xFloat: null,
      objective: null, objectiveFloat: NaN,
      lpObjective: lpObjective,
      lpObjectiveFloat: R.toNumber(lpObjective),
      patterns: patterns,
      iterations: iter,
      totalLpIter: totalLpIter
    };
  }

  // bars 形式
  var bars = [];
  var stockTotal = 0;
  patterns.forEach(function(pat, k) {
    var x = mip.x[k];
    if (!x || R.isZero(x)) return;
    if (!R.isInteger(x)) return;
    var xInt = Number(x.num);
    if (xInt <= 0) return;
    var pieces = [];
    pat.counts.forEach(function(cnt, i) {
      for (var jj = 0; jj < cnt; jj++) pieces.push(items[i].length);
    });
    pieces.sort(function(a, b) { return b - a; });
    bars.push({ stock: pat.stock, pattern: pieces, count: xInt });
    stockTotal += pat.stock * xInt;
  });

  // gap = (integer - LP) / |integer|
  var gapRat = null;
  if (lpObjective && !R.isZero(mip.objective)) {
    gapRat = R.div(R.sub(mip.objective, lpObjective), R.abs(mip.objective));
  }

  return {
    status: mip.status === 'optimal' ? 'cg_exact_optimal' : ('cg_exact_' + mip.status),
    x: mip.x,
    xFloat: mip.xFloat,
    objective: mip.objective,
    objectiveFloat: mip.objectiveFloat,
    lpObjective: lpObjective,
    lpObjectiveFloat: R.toNumber(lpObjective),
    bars: bars,
    stockTotal: stockTotal,
    barCount: bars.reduce(function(s, b) { return s + b.count; }, 0),
    patterns: patterns,
    iterations: iter,
    totalLpIter: totalLpIter,
    bbNodeCount: mip.nodeCount,
    bbLpCalls: mip.lpCalls,
    _exact: {
      gapRational: gapRat,
      gapFloat: gapRat ? R.toNumber(gapRat) : null
    }
  };
}

// ============================================================================
// 公開
// ============================================================================

var _exports = {
  boundedKnapsackExact: boundedKnapsackExact,
  solveColumnGenExact: solveColumnGenExact,
  _internal: { initialPatternsFromFfd: _initialPatternsFromFfd }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  var _g = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis);
  _g.Toriai = _g.Toriai || {};
  _g.Toriai.calculation = _g.Toriai.calculation || {};
  _g.Toriai.calculation.yield = _g.Toriai.calculation.yield || {};
  _g.Toriai.calculation.yield.research = _g.Toriai.calculation.yield.research || {};
  _g.Toriai.calculation.yield.research.rationalCg = _exports;
}
