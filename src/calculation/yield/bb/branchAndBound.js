/**
 * TORIAI 計算 V3 — JS-native Branch-and-Bound for Mixed-Integer LP
 *
 * 設計 (RESEARCH_BB_ALGEBRA.md §5 day-2):
 *   - depth-first、explicit stack（再帰なし → JS stack overflow 回避）
 *   - LP 緩和は ./lp.js を呼ぶ
 *   - branching strategy は plug-in 可能（branchScore コールバック）
 *   - upper bound = 初期 incumbent（FFD 等で外から渡せる）も受ける
 *
 * 公開:
 *   solveMIP(spec, opts) — 単一エントリポイント
 *
 * spec: solveLP と同じ + integerVars (default: 全変数 integer)
 * opts: {
 *   branchScore?: (j, lpValue) => number       // 高い方を先に branch（default: most-fractional）
 *   incumbent?: { x: number[], objective: number }   // 初期上界
 *   timeLimit?: ms (default 30_000)
 *   maxNodes?: number (default 100_000)
 *   verbose?: boolean
 * }
 */

'use strict';

const { solveLP } = require('./lp.js');

const INT_EPS = 1e-6;
const BOUND_EPS = 1e-6;

function solveMIP(spec, opts) {
  opts = opts || {};
  const c = spec.c;
  const n = c.length;
  const integerVars = spec.integerVars || range(n);
  const branchScore = opts.branchScore || mostFractionalScore;
  const timeLimit = opts.timeLimit || 30000;
  const maxNodes = opts.maxNodes || 100000;
  const verbose = !!opts.verbose;

  // ---- Root LP ----
  const rootLP = solveLP(spec);
  if (rootLP.status !== 'optimal') {
    return {
      status: rootLP.status,
      x: null,
      objective: NaN,
      nodeCount: 1,
      lpRelaxation: rootLP.objective,
      iterations: rootLP.iterations
    };
  }

  // 初期 incumbent: opts.incumbent or null
  let incumbent = opts.incumbent ? { x: opts.incumbent.x.slice(), objective: opts.incumbent.objective } : null;

  // ---- スタック初期化 ----
  // node: { lower: number[n], upper: number[n], parentBound: number }
  const root = {
    lower: new Array(n).fill(0),
    upper: new Array(n).fill(Infinity),
    parentBound: rootLP.objective
  };
  const stack = [root];

  let nodeCount = 0;
  let lpCalls = 1;
  let totalIter = rootLP.iterations;
  const t0 = Date.now();

  while (stack.length > 0) {
    if (nodeCount >= maxNodes) return finalize('nodelimit');
    if (Date.now() - t0 > timeLimit) return finalize('timelimit');

    const node = stack.pop();
    nodeCount++;

    // pruning by parent bound（incumbent 改善見込みなし）
    if (incumbent && node.parentBound >= incumbent.objective - BOUND_EPS) continue;

    // この node の LP を解く（bounds を制約として追加）
    const lp = solveBoundedLP(spec, node.lower, node.upper);
    lpCalls++;
    totalIter += lp.iterations;

    if (lp.status === 'infeasible') continue;
    if (lp.status === 'unbounded') {
      // 子ノードで unbounded は数値ノイズのことがある（root が optimal なので
      // 全体は bounded）。安全側で prune して explorationを続ける。
      if (verbose) console.warn('[BB] node ' + nodeCount + ' LP unbounded — pruning (numerical)');
      continue;
    }
    if (lp.status === 'iterlimit') continue; // skip

    // bound prune（厳密）
    if (incumbent && lp.objective >= incumbent.objective - BOUND_EPS) continue;

    // integrality check（最高 score の fractional integer 変数を探す）
    let bestVar = -1;
    let bestScore = -Infinity;
    for (const j of integerVars) {
      const v = lp.x[j];
      if (!isInt(v)) {
        const s = branchScore(j, v);
        if (s > bestScore) { bestScore = s; bestVar = j; }
      }
    }

    if (bestVar === -1) {
      // 全 integer → integer 解
      if (!incumbent || lp.objective < incumbent.objective - BOUND_EPS) {
        incumbent = { x: lp.x.slice(), objective: lp.objective };
        if (verbose) console.log('[BB] new incumbent obj=' + lp.objective.toFixed(4) + ' at node ' + nodeCount);
      }
      continue;
    }

    // 分枝
    const v = lp.x[bestVar];
    const lo = Math.floor(v);
    const hi = Math.ceil(v);

    // up branch（x_j >= hi）
    const upL = node.lower.slice(); upL[bestVar] = Math.max(upL[bestVar], hi);
    const upU = node.upper.slice();
    if (upL[bestVar] <= upU[bestVar]) {
      stack.push({ lower: upL, upper: upU, parentBound: lp.objective });
    }

    // down branch（x_j <= lo）。stack なので最後に push したのが先に処理される
    const dnL = node.lower.slice();
    const dnU = node.upper.slice(); dnU[bestVar] = Math.min(dnU[bestVar], lo);
    if (dnL[bestVar] <= dnU[bestVar]) {
      stack.push({ lower: dnL, upper: dnU, parentBound: lp.objective });
    }
  }

  return finalize('optimal');

  function finalize(status) {
    if (incumbent) {
      return {
        status: status === 'optimal' ? 'optimal' : status,
        x: incumbent.x,
        objective: incumbent.objective,
        nodeCount: nodeCount,
        lpCalls: lpCalls,
        iterations: totalIter,
        lpRelaxation: rootLP.objective,
        gap: (incumbent.objective - rootLP.objective) / Math.max(1e-9, Math.abs(incumbent.objective))
      };
    }
    return {
      status: status === 'optimal' ? 'infeasible' : status,
      x: null,
      objective: NaN,
      nodeCount: nodeCount,
      lpCalls: lpCalls,
      iterations: totalIter,
      lpRelaxation: rootLP.objective
    };
  }
}

// ============================================================================
// solveBoundedLP — 変数上下界を追加制約として LP に乗せる
// ============================================================================

function solveBoundedLP(spec, lower, upper) {
  const n = spec.c.length;
  const A = spec.A.map(function(r) { return r.slice(); });
  const b = spec.b.slice();
  const types = (spec.constraintTypes || A.map(function() { return '>='; })).slice();

  // 各変数 j に対し、必要なら lower/upper を追加制約として
  for (let j = 0; j < n; j++) {
    if (lower[j] > 0) {
      const row = new Array(n).fill(0); row[j] = 1;
      A.push(row); b.push(lower[j]); types.push('>=');
    }
    if (upper[j] !== Infinity) {
      const row = new Array(n).fill(0); row[j] = 1;
      A.push(row); b.push(upper[j]); types.push('<=');
    }
  }

  return solveLP({
    c: spec.c, A: A, b: b, constraintTypes: types, sense: 'min'
  });
}

// ============================================================================
// branching strategies
// ============================================================================

function mostFractionalScore(j, v) {
  // 0.5 に近いほど高 score
  const frac = v - Math.floor(v);
  return -Math.abs(frac - 0.5);
}

// ============================================================================
// utilities
// ============================================================================

function isInt(v) {
  return Math.abs(v - Math.round(v)) < INT_EPS;
}

function range(n) {
  const r = new Array(n);
  for (let i = 0; i < n; i++) r[i] = i;
  return r;
}

// ============================================================================
// 公開
// ============================================================================

module.exports = {
  solveMIP: solveMIP,
  mostFractionalScore: mostFractionalScore,
  _internal: { solveBoundedLP: solveBoundedLP }
};
