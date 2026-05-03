/**
 * TORIAI 計算 V3 — JS-native Linear Programming Solver
 *
 * Two-phase tableau simplex。CSP MIP の B&B で各 node の LP 緩和を解くために使う。
 *
 * 設計方針 (RESEARCH_BB_ALGEBRA.md §5):
 *   - HiGHS-WASM の stack 限界を回避するため pure JS 実装
 *   - 純関数・依存ゼロ。tableau は ordinary 2D Array
 *   - Bland's rule で degeneracy / cycling を回避
 *   - ε 許容で数値ゴミを吸収
 *
 * 前提:
 *   - 入力 c, A, b, types で min c^T x  s.t. A x  {<=,>=,=}  b,  x >= 0 を解く
 *   - 中規模（変数 <= 数百）が射程。BPPLib スケールは想定外
 *
 * 計算量: 各 pivot O((m+n)^2)、pivot 回数 O(典型数十〜数百)
 */

'use strict';

const EPS = 1e-9;
const MAX_ITER = 50000;

// ============================================================================
// solveLP(spec) — 主関数
//
// spec: {
//   c: number[n],
//   A: number[m][n],
//   b: number[m],
//   constraintTypes?: ('<=' | '>=' | '=')[m]   // default: 全 '>='
//   sense?: 'min' | 'max'                       // default: 'min'
// }
// 戻り値: {
//   status: 'optimal' | 'infeasible' | 'unbounded' | 'iterlimit',
//   x: number[n] | null,
//   objective: number,
//   iterations: number
// }
// ============================================================================

function solveLP(spec) {
  const c0 = spec.c.slice();
  const A = spec.A.map(function(r) { return r.slice(); });
  const b = spec.b.slice();
  const m = b.length;
  const n = c0.length;
  const types = (spec.constraintTypes || A.map(function() { return '>='; })).slice();
  const sense = spec.sense || 'min';

  // max → min への変換用に c の符号を覚えておく
  const c = c0.slice();
  if (sense === 'max') for (let j = 0; j < n; j++) c[j] = -c[j];

  // b < 0 の行は両辺反転（不等号も flip）
  for (let i = 0; i < m; i++) {
    if (b[i] < 0) {
      b[i] = -b[i];
      for (let j = 0; j < n; j++) A[i][j] = -A[i][j];
      if (types[i] === '<=') types[i] = '>=';
      else if (types[i] === '>=') types[i] = '<=';
    }
  }

  // 補助変数の数: <= → slack 1、>= → surplus 1 + artificial 1、= → artificial 1
  let slackCount = 0;
  let artificialCount = 0;
  for (let i = 0; i < m; i++) {
    if (types[i] === '<=') slackCount++;
    else if (types[i] === '>=') { slackCount++; artificialCount++; }
    else artificialCount++;
  }
  const totalCols = n + slackCount + artificialCount;

  // tableau[0] = 目的行、tableau[1..m] = 制約行。最終列 = RHS
  const tableau = [];
  for (let i = 0; i <= m; i++) tableau.push(new Array(totalCols + 1).fill(0));

  let slackIdx = n;
  let artIdx = n + slackCount;
  const basis = new Array(m);
  const artificialCols = [];

  for (let i = 0; i < m; i++) {
    const row = tableau[i + 1];
    for (let j = 0; j < n; j++) row[j] = A[i][j];
    row[totalCols] = b[i];

    if (types[i] === '<=') {
      row[slackIdx] = 1;
      basis[i] = slackIdx;
      slackIdx++;
    } else if (types[i] === '>=') {
      row[slackIdx] = -1;     // surplus
      slackIdx++;
      row[artIdx] = 1;        // artificial
      basis[i] = artIdx;
      artificialCols.push(artIdx);
      artIdx++;
    } else { // '='
      row[artIdx] = 1;
      basis[i] = artIdx;
      artificialCols.push(artIdx);
      artIdx++;
    }
  }

  let totalIter = 0;

  // ---- Phase I: minimize Σ artificials ----
  if (artificialCols.length > 0) {
    for (let j = 0; j <= totalCols; j++) tableau[0][j] = 0;
    for (const a of artificialCols) tableau[0][a] = 1;
    // basis に入っている artificial の係数を 0 にするため対応行を引く
    for (let i = 0; i < m; i++) {
      if (artificialCols.indexOf(basis[i]) !== -1) {
        const row = tableau[i + 1];
        for (let j = 0; j <= totalCols; j++) tableau[0][j] -= row[j];
      }
    }

    const r1 = simplexIterate(tableau, basis, totalCols, []);
    totalIter += r1.iterations;
    if (r1.status === 'iterlimit') {
      return { status: 'iterlimit', x: null, objective: NaN, iterations: totalIter };
    }
    // tableau[0][totalCols] は -(Phase I 目的値)。infeasible なら > 0 になる
    if (-tableau[0][totalCols] > 1e-6) {
      return { status: 'infeasible', x: null, objective: NaN, iterations: totalIter };
    }
    // basis に残った artificial を可能なら driving out する
    for (let i = 0; i < m; i++) {
      if (artificialCols.indexOf(basis[i]) !== -1) {
        // 同じ行で非 artificial かつ非ゼロの列を探して pivot
        const row = tableau[i + 1];
        let pivotCol = -1;
        for (let j = 0; j < totalCols; j++) {
          if (artificialCols.indexOf(j) !== -1) continue;
          if (Math.abs(row[j]) > EPS) { pivotCol = j; break; }
        }
        if (pivotCol !== -1) pivotOn(tableau, basis, i, pivotCol, totalCols);
        // pivotCol 見つからない行は冗長制約なので放置（artificial は 0 のまま）
      }
    }
  }

  // ---- Phase II: original objective ----
  for (let j = 0; j <= totalCols; j++) tableau[0][j] = 0;
  for (let j = 0; j < n; j++) tableau[0][j] = c[j];
  // basis 列の reduced cost を 0 に
  for (let i = 0; i < m; i++) {
    const bj = basis[i];
    if (Math.abs(tableau[0][bj]) > EPS) {
      const factor = tableau[0][bj];
      const row = tableau[i + 1];
      for (let j = 0; j <= totalCols; j++) tableau[0][j] -= factor * row[j];
    }
  }

  const r2 = simplexIterate(tableau, basis, totalCols, artificialCols);
  totalIter += r2.iterations;

  if (r2.status === 'unbounded') {
    return { status: 'unbounded', x: null, objective: -Infinity, iterations: totalIter };
  }
  if (r2.status === 'iterlimit') {
    return { status: 'iterlimit', x: null, objective: NaN, iterations: totalIter };
  }

  // 解の取り出し
  const x = new Array(n).fill(0);
  for (let i = 0; i < m; i++) {
    if (basis[i] < n) x[basis[i]] = tableau[i + 1][totalCols];
  }
  // 数値ゴミの掃除
  for (let j = 0; j < n; j++) if (Math.abs(x[j]) < EPS) x[j] = 0;

  let objective = 0;
  for (let j = 0; j < n; j++) objective += c0[j] * x[j];

  return {
    status: 'optimal',
    x: x,
    objective: objective,
    iterations: totalIter
  };
}

// ============================================================================
// simplexIterate(tableau, basis, totalCols, excludeCols) — 内部 simplex ループ
//
// excludeCols: entering variable から除外する列（Phase II の artificial 等）
// ============================================================================

function simplexIterate(tableau, basis, totalCols, excludeCols) {
  const m = tableau.length - 1;
  let iter = 0;
  const exclude = new Set(excludeCols);

  for (; iter < MAX_ITER; iter++) {
    // entering variable: 最も負の reduced cost（Bland's rule: 同点なら index 小）
    let enter = -1;
    let bestVal = -EPS;
    for (let j = 0; j < totalCols; j++) {
      if (exclude.has(j)) continue;
      if (tableau[0][j] < bestVal) {
        bestVal = tableau[0][j];
        enter = j;
      }
    }
    if (enter === -1) return { status: 'optimal', iterations: iter };

    // leaving variable: 最小 ratio（Bland's rule: 同点なら basis index 小）
    let leave = -1;
    let bestRatio = Infinity;
    for (let i = 1; i <= m; i++) {
      if (tableau[i][enter] > EPS) {
        const ratio = tableau[i][totalCols] / tableau[i][enter];
        if (ratio < bestRatio - EPS) {
          bestRatio = ratio;
          leave = i;
        } else if (Math.abs(ratio - bestRatio) <= EPS && leave !== -1) {
          if (basis[i - 1] < basis[leave - 1]) leave = i;
        }
      }
    }
    if (leave === -1) return { status: 'unbounded', iterations: iter };

    pivotOn(tableau, basis, leave - 1, enter, totalCols);
  }

  return { status: 'iterlimit', iterations: iter };
}

// ============================================================================
// pivotOn(tableau, basis, rowIdx, colIdx, totalCols) — 標準ピボット
// rowIdx は basis index (0..m-1)。tableau row index は rowIdx + 1
// ============================================================================

function pivotOn(tableau, basis, rowIdx, colIdx, totalCols) {
  const m = tableau.length - 1;
  const pivotRow = tableau[rowIdx + 1];
  const pivot = pivotRow[colIdx];
  for (let j = 0; j <= totalCols; j++) pivotRow[j] /= pivot;
  for (let i = 0; i <= m; i++) {
    if (i === rowIdx + 1) continue;
    const factor = tableau[i][colIdx];
    if (Math.abs(factor) > EPS) {
      const row = tableau[i];
      for (let j = 0; j <= totalCols; j++) row[j] -= factor * pivotRow[j];
    }
  }
  basis[rowIdx] = colIdx;
}

// ============================================================================
// 公開
// ============================================================================

module.exports = {
  solveLP: solveLP,
  _internal: { simplexIterate: simplexIterate, pivotOn: pivotOn, EPS: EPS }
};
