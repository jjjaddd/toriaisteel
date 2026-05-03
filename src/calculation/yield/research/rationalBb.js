/**
 * TORIAI 計算 V3 — Rational Branch-and-Bound (Phase K-2)
 *
 * 設計:
 *   bb/branchAndBound.js を Rational LP (research/rationalLp.js) に置換。
 *   整数性判定・bound prune・分枝値すべて exact (BigInt 有理数)。
 *
 * 利点 (vs float B&B):
 *   - 整数性判定: r.den === 1n で確定的 (float の "ほぼ整数" は不要)
 *   - bound prune: incumbent.objective との比較が EPS 不要
 *   - 分枝値: floor/ceil を BigInt で計算、誤差なし
 *   - LP 内部の数値ノイズ起因 unbounded 偽陽性が消える
 *
 * 速度: 内部 LP が 34x 遅 → MIP 全体も同程度遅い
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
var solveLPExact = RLp.solveLPExact;

// ============================================================================
// solveMipExact(spec, opts) — exact rational MIP via B&B
//
// spec: { c, A, b, constraintTypes?, integerVars? }
// opts: {
//   incumbent?: { x: Rational[], objective: Rational },
//   branchScore?: (j, lpRationalValue) => number,  // higher = branch first
//   timeLimit?: ms (default 30000),
//   maxNodes?: number (default 100000),
//   verbose?: boolean
// }
// ============================================================================

function solveMipExact(spec, opts) {
  opts = opts || {};
  var n = spec.c.length;
  var integerVars = spec.integerVars || _range(n);
  var branchScore = opts.branchScore || mostFractionalScoreRat;
  var timeLimit = opts.timeLimit != null ? opts.timeLimit : 30000;
  var maxNodes = opts.maxNodes != null ? opts.maxNodes : 100000;
  var verbose = !!opts.verbose;

  // ---- Root LP (exact) ----
  var rootLP = solveLPExact(spec);
  if (rootLP.status !== 'optimal') {
    return {
      status: rootLP.status,
      x: null, xFloat: null,
      objective: null, objectiveFloat: NaN,
      nodeCount: 1, lpCalls: 1,
      iterations: rootLP.iterations,
      lpRelaxation: rootLP.objective,
      lpRelaxationFloat: rootLP.objectiveFloat
    };
  }

  // 初期 incumbent: opts.incumbent or null
  var incumbent = opts.incumbent ? {
    x: opts.incumbent.x.slice(),
    objective: opts.incumbent.objective
  } : null;

  // ---- スタック ----
  // node: { lower: Rational[n] (BigInt 整数値だけ), upper: Rational[n] | null, parentBound: Rational }
  var root = {
    lower: _vecRZero(n),
    upper: _vecNull(n),
    parentBound: rootLP.objective
  };
  var stack = [root];

  var nodeCount = 0;
  var lpCalls = 1;
  var totalIter = rootLP.iterations;
  var t0 = Date.now();

  while (stack.length > 0) {
    if (nodeCount >= maxNodes) return finalize('nodelimit');
    if (Date.now() - t0 > timeLimit) return finalize('timelimit');

    var node = stack.pop();
    nodeCount++;

    // pruning by parent bound (incumbent 改善見込みなし) — exact 比較、EPS 不要
    if (incumbent && R.gte(node.parentBound, incumbent.objective)) continue;

    // この node の LP を解く (bounds を制約として追加)
    var lp = solveBoundedLPExact(spec, node.lower, node.upper);
    lpCalls++;
    totalIter += lp.iterations;

    if (lp.status === 'infeasible') continue;
    if (lp.status === 'unbounded') {
      // exact 演算では数値ノイズによる unbounded 偽陽性は起きないはず。
      // ここに来たら本当に unbounded（root が optimal なら理論上来ない）
      if (verbose) console.warn('[exact-BB] node ' + nodeCount + ' LP unbounded — pruning');
      continue;
    }
    if (lp.status === 'iterlimit') continue;

    // bound prune (exact)
    if (incumbent && R.gte(lp.objective, incumbent.objective)) continue;

    // integrality check (exact: den === 1n)
    var bestVar = -1;
    var bestScore = -Infinity;
    for (var ii = 0; ii < integerVars.length; ii++) {
      var j = integerVars[ii];
      var v = lp.x[j];
      if (!R.isInteger(v)) {
        var s = branchScore(j, v);
        if (s > bestScore) { bestScore = s; bestVar = j; }
      }
    }

    if (bestVar === -1) {
      // 全 integer → integer 解 (exact)
      if (!incumbent || R.lt(lp.objective, incumbent.objective)) {
        incumbent = { x: lp.x.slice(), objective: lp.objective };
        if (verbose) console.log('[exact-BB] new incumbent obj=' + lp.objectiveFloat.toFixed(4) + ' at node ' + nodeCount);
      }
      continue;
    }

    // 分枝 (BigInt floor/ceil で exact)
    var vRat = lp.x[bestVar];
    var loBI = R.floor(vRat);  // BigInt
    var hiBI = R.ceil(vRat);   // BigInt
    var loRat = R.fromInt(loBI);
    var hiRat = R.fromInt(hiBI);

    // up branch (x_j >= hi)
    var upL = node.lower.slice();
    if (R.gt(hiRat, upL[bestVar])) upL[bestVar] = hiRat;
    var upU = node.upper.slice();
    if (upU[bestVar] === null || R.gte(upU[bestVar], upL[bestVar])) {
      stack.push({ lower: upL, upper: upU, parentBound: lp.objective });
    }

    // down branch (x_j <= lo)
    var dnL = node.lower.slice();
    var dnU = node.upper.slice();
    if (dnU[bestVar] === null || R.lt(loRat, dnU[bestVar])) dnU[bestVar] = loRat;
    if (R.gte(dnU[bestVar], dnL[bestVar])) {
      stack.push({ lower: dnL, upper: dnU, parentBound: lp.objective });
    }
  }

  return finalize('optimal');

  function finalize(status) {
    if (incumbent) {
      var gapRat = null;
      var gapFloat = null;
      if (rootLP.objective && !R.isZero(rootLP.objective)) {
        // gap = (incumbent.obj - lp.obj) / |incumbent.obj|
        var diff = R.sub(incumbent.objective, rootLP.objective);
        gapRat = R.div(diff, R.abs(incumbent.objective));
        gapFloat = R.toNumber(gapRat);
      }
      return {
        status: status === 'optimal' ? 'optimal' : status,
        x: incumbent.x,
        xFloat: incumbent.x.map(R.toNumber),
        objective: incumbent.objective,
        objectiveFloat: R.toNumber(incumbent.objective),
        nodeCount: nodeCount,
        lpCalls: lpCalls,
        iterations: totalIter,
        lpRelaxation: rootLP.objective,
        lpRelaxationFloat: rootLP.objectiveFloat,
        gap: gapRat,
        gapFloat: gapFloat
      };
    }
    return {
      status: status === 'optimal' ? 'infeasible' : status,
      x: null, xFloat: null,
      objective: null, objectiveFloat: NaN,
      nodeCount: nodeCount, lpCalls: lpCalls,
      iterations: totalIter,
      lpRelaxation: rootLP.objective,
      lpRelaxationFloat: rootLP.objectiveFloat
    };
  }
}

// ============================================================================
// solveBoundedLPExact — 変数 lo/up を追加制約として LP に乗せる (Rational)
// ============================================================================

function solveBoundedLPExact(spec, lower, upper) {
  var n = spec.c.length;
  // A, b, types のコピー (元 spec を変更しない)
  var A = spec.A.map(function(row) { return row.slice(); });
  var b = spec.b.slice();
  var types = (spec.constraintTypes || A.map(function() { return '>='; })).slice();

  for (var j = 0; j < n; j++) {
    // lower[j] > 0 ならば x_j >= lower[j]
    var lo = lower[j];
    if (lo !== null && (typeof lo === 'object' ? !R.isZero(lo) : lo > 0)) {
      var row = new Array(n).fill(0); row[j] = 1;
      A.push(row);
      b.push(typeof lo === 'object' ? R.toNumber(lo) : lo);  // toRational 内部で Rational 化される
      // 注: rationalLp.toRational が number → Rational 変換するのでこれで OK
      // 厳密性のため Rational のまま渡したい場合は b に直接 push
      types.push('>=');
    }
    // upper[j] != null ならば x_j <= upper[j]
    var up = upper[j];
    if (up !== null) {
      var row2 = new Array(n).fill(0); row2[j] = 1;
      A.push(row2);
      b.push(typeof up === 'object' ? R.toNumber(up) : up);
      types.push('<=');
    }
  }

  return solveLPExact({
    c: spec.c, A: A, b: b, constraintTypes: types, sense: 'min'
  });
}

// ============================================================================
// branching strategies
// ============================================================================

function mostFractionalScoreRat(j, vRat) {
  // 0.5 に近いほど高 score
  // frac = v - floor(v), score = -|frac - 0.5|
  // Number で OK (score は heuristic、exact 不要)
  var frac = R.toNumber(R.sub(vRat, R.fromInt(R.floor(vRat))));
  return -Math.abs(frac - 0.5);
}

// ============================================================================
// utilities
// ============================================================================

function _range(n) {
  var r = new Array(n);
  for (var i = 0; i < n; i++) r[i] = i;
  return r;
}
function _vecRZero(n) {
  var r = new Array(n);
  for (var i = 0; i < n; i++) r[i] = R.zero();
  return r;
}
function _vecNull(n) {
  var r = new Array(n);
  for (var i = 0; i < n; i++) r[i] = null;
  return r;
}

// ============================================================================
// 公開
// ============================================================================

var _exports = {
  solveMipExact: solveMipExact,
  mostFractionalScoreRat: mostFractionalScoreRat,
  _internal: { solveBoundedLPExact: solveBoundedLPExact }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  var _g = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis);
  _g.Toriai = _g.Toriai || {};
  _g.Toriai.calculation = _g.Toriai.calculation || {};
  _g.Toriai.calculation.yield = _g.Toriai.calculation.yield || {};
  _g.Toriai.calculation.yield.research = _g.Toriai.calculation.yield.research || {};
  _g.Toriai.calculation.yield.research.rationalBb = _exports;
}
