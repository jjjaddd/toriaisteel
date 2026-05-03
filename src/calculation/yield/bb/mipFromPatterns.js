/**
 * TORIAI 計算 V3 — Pattern-set MIP を JS-native B&B で解く便利ラッパー
 *
 * 用途: columnGen.js の MIP 段で HiGHS-WASM が stack overflow を起こす CASE-6
 *       規模に対し、純 JS の B&B にフォールバックする。
 *
 * 設計:
 *   - patterns + items から CSP MIP を構築
 *   - 任意の初期 incumbent (e.g. LP-rounded greedy 解) を受け取って warm-start
 *   - 結果は { status, x, objective, nodeCount, ... } を返す
 *
 * 公開:
 *   solveMipFromPatterns(patterns, items, opts) → result
 */

'use strict';

const { solveMIP } = require('./branchAndBound.js');

// ============================================================================
// solveMipFromPatterns(patterns, items, opts)
//
// patterns: { stock: number, counts: number[] }[]
// items: { length, count, weight }[]
// opts: {
//   incumbent?: { x: number[], objective: number }   // 既知の整数解（warm-start 上界）
//   branchScore?: (j, lpValue) => number             // default: most-fractional
//   timeLimit?: ms (default 15000)
//   maxNodes?: number (default 50000)
//   verbose?: boolean
// }
//
// 戻り値: {
//   status: 'optimal' | 'timelimit' | 'nodelimit' | 'infeasible',
//   x: number[],        // pattern multiplicities (integer)
//   objective: number,  // total stock cost
//   nodeCount, lpCalls, iterations, lpRelaxation, gap
// }
// ============================================================================

function solveMipFromPatterns(patterns, items, opts) {
  opts = opts || {};
  const n = patterns.length;
  const m = items.length;

  if (n === 0 || m === 0) {
    return { status: 'infeasible', x: [], objective: NaN, nodeCount: 0 };
  }

  // c[j] = stock(p_j)
  const c = new Array(n);
  for (let j = 0; j < n; j++) c[j] = patterns[j].stock;

  // A[i][j] = counts(p_j, i)
  const A = [];
  for (let i = 0; i < m; i++) {
    const row = new Array(n).fill(0);
    for (let j = 0; j < n; j++) row[j] = patterns[j].counts[i] || 0;
    A.push(row);
  }

  // b[i] = items[i].count
  const b = items.map(function(it) { return it.count; });
  const constraintTypes = items.map(function() { return '>='; });

  return solveMIP({
    c: c, A: A, b: b, constraintTypes: constraintTypes
  }, {
    incumbent: opts.incumbent,
    branchScore: opts.branchScore,
    timeLimit: opts.timeLimit != null ? opts.timeLimit : 15000,
    maxNodes: opts.maxNodes != null ? opts.maxNodes : 50000,
    verbose: !!opts.verbose
  });
}

// ============================================================================
// 公開
// ============================================================================

module.exports = {
  solveMipFromPatterns: solveMipFromPatterns
};
