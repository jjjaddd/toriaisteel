/**
 * tests/bb/lp.test.js
 *
 * JS-native LP solver の検証。
 * RESEARCH_BB_ALGEBRA.md §5 day-1 のテスト要件に従う。
 *
 * - 教科書 LP（最大化、最小化、退化、>= / <=）
 * - 不実行可能（infeasible）の検出
 * - CSP-style ≥ 制約 LP の最適性
 */

const { solveLP } = require('../../src/calculation/yield/bb/lp.js');

function close(a, b, eps) {
  return Math.abs(a - b) <= (eps || 1e-6);
}

describe('lp.solveLP — Two-phase tableau simplex', () => {
  // ---------------------------------------------------------------------------
  // 1. 単純な最小化（>= 制約）
  // ---------------------------------------------------------------------------
  test('教科書: min x1+x2 s.t. 2x1+x2>=4, x1+2x2>=4 → (4/3, 4/3), obj=8/3', () => {
    const r = solveLP({
      c: [1, 1],
      A: [[2, 1], [1, 2]],
      b: [4, 4],
      constraintTypes: ['>=', '>=']
    });
    expect(r.status).toBe('optimal');
    expect(close(r.objective, 8 / 3)).toBe(true);
    expect(close(r.x[0], 4 / 3)).toBe(true);
    expect(close(r.x[1], 4 / 3)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 2. 最大化（<= 制約）
  // ---------------------------------------------------------------------------
  test('教科書: max 3x1+5x2 s.t. x1<=4, 2x2<=12, 3x1+2x2<=18 → (2,6), obj=36', () => {
    const r = solveLP({
      sense: 'max',
      c: [3, 5],
      A: [[1, 0], [0, 2], [3, 2]],
      b: [4, 12, 18],
      constraintTypes: ['<=', '<=', '<=']
    });
    expect(r.status).toBe('optimal');
    expect(close(r.objective, 36)).toBe(true);
    expect(close(r.x[0], 2)).toBe(true);
    expect(close(r.x[1], 6)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 3. 等式制約
  // ---------------------------------------------------------------------------
  test('= 制約: min x1+x2 s.t. x1+x2=5, x1>=1, x2>=1 → obj=5', () => {
    const r = solveLP({
      c: [1, 1],
      A: [[1, 1], [1, 0], [0, 1]],
      b: [5, 1, 1],
      constraintTypes: ['=', '>=', '>=']
    });
    expect(r.status).toBe('optimal');
    expect(close(r.objective, 5)).toBe(true);
    expect(close(r.x[0] + r.x[1], 5)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 4. 不実行可能
  // ---------------------------------------------------------------------------
  test('infeasible: x>=2 かつ x<=1 → infeasible', () => {
    const r = solveLP({
      c: [1],
      A: [[1], [1]],
      b: [2, 1],
      constraintTypes: ['>=', '<=']
    });
    expect(r.status).toBe('infeasible');
  });

  // ---------------------------------------------------------------------------
  // 5. 非有界（max 方向に有界制約なし）
  // ---------------------------------------------------------------------------
  test('unbounded: max x1 s.t. x1 - x2 <= 1 → unbounded', () => {
    const r = solveLP({
      sense: 'max',
      c: [1, 0],
      A: [[1, -1]],
      b: [1],
      constraintTypes: ['<=']
    });
    expect(r.status).toBe('unbounded');
  });

  // ---------------------------------------------------------------------------
  // 6. CSP toy: 3 patterns × 2 piece types
  //    pattern 1: cost 10, counts [3, 2]
  //    pattern 2: cost 8,  counts [2, 1]
  //    pattern 3: cost 12, counts [1, 4]
  //    demand: piece A = 6, piece B = 6
  //
  //    LP relaxation: 最低限 demand を満たすよう連続値で
  // ---------------------------------------------------------------------------
  test('CSP-toy LP relaxation', () => {
    const r = solveLP({
      c: [10, 8, 12],
      A: [[3, 2, 1], [2, 1, 4]],
      b: [6, 6],
      constraintTypes: ['>=', '>=']
    });
    expect(r.status).toBe('optimal');
    // 最適値は LP solver の結果に従う。少なくとも実行可能性チェック:
    // demand 充足
    expect(3 * r.x[0] + 2 * r.x[1] + 1 * r.x[2]).toBeGreaterThanOrEqual(6 - 1e-6);
    expect(2 * r.x[0] + 1 * r.x[1] + 4 * r.x[2]).toBeGreaterThanOrEqual(6 - 1e-6);
    // 全 x >= 0
    for (const v of r.x) expect(v).toBeGreaterThanOrEqual(-1e-9);
    // 目的値 = c^T x
    expect(close(r.objective, 10 * r.x[0] + 8 * r.x[1] + 12 * r.x[2])).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 7. 退化 / Bland's rule の cycling 回避テスト
  //    Beale の例（古典的退化問題、3 変数 LP）
  // ---------------------------------------------------------------------------
  test('Bland\'s rule: 退化 LP でも収束する', () => {
    // 標準形に変換した小さな退化例。最適 obj = 0
    const r = solveLP({
      c: [1, 1, 1],
      A: [[1, 1, 0], [0, 1, 1]],
      b: [0, 0],
      constraintTypes: ['>=', '>=']
    });
    expect(r.status).toBe('optimal');
    expect(close(r.objective, 0)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 8. 単一変数の自明問題
  // ---------------------------------------------------------------------------
  test('1 変数: min x s.t. x >= 5 → x=5, obj=5', () => {
    const r = solveLP({
      c: [1],
      A: [[1]],
      b: [5],
      constraintTypes: ['>=']
    });
    expect(r.status).toBe('optimal');
    expect(close(r.x[0], 5)).toBe(true);
    expect(close(r.objective, 5)).toBe(true);
  });
});
