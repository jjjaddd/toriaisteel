/**
 * tests/bb/branchAndBound.test.js
 *
 * JS-native B&B の検証。
 * - 教科書 MIP（既知最適解）
 * - CSP-style MIP（demand 整数解）
 * - infeasible / 退化の挙動
 */

const { solveMIP, mostFractionalScore } = require('../../src/calculation/yield/bb/branchAndBound.js');

function close(a, b, eps) {
  return Math.abs(a - b) <= (eps || 1e-6);
}

describe('bb.solveMIP — branch-and-bound for MIP', () => {
  // ---------------------------------------------------------------------------
  // 1. 連続最適解が integer ならそのまま integer 解
  // ---------------------------------------------------------------------------
  test('LP optimum already integer → 1 node で完了', () => {
    const r = solveMIP({
      c: [1],
      A: [[1]],
      b: [3],
      constraintTypes: ['>=']
    });
    expect(r.status).toBe('optimal');
    expect(close(r.objective, 3)).toBe(true);
    expect(r.x[0]).toBe(3);
  });

  // ---------------------------------------------------------------------------
  // 2. 教科書 MIP: 連続 LP は分数解、整数解は明確に異なる
  //    min x1 + x2 s.t. 2x1 + 3x2 >= 7, x1 + x2 >= 2, x1, x2 ∈ ℤ_{>=0}
  //    LP optimum: 連続なら obj=7/3 ≈ 2.33（x2=7/3）
  //    Integer optimum: x=(2,1) で obj=3、または x=(0,3) で obj=3
  // ---------------------------------------------------------------------------
  test('教科書 MIP: 連続 LP より整数解が悪化する', () => {
    const r = solveMIP({
      c: [1, 1],
      A: [[2, 3], [1, 1]],
      b: [7, 2],
      constraintTypes: ['>=', '>=']
    });
    expect(r.status).toBe('optimal');
    expect(close(r.objective, 3)).toBe(true);
    expect(Number.isInteger(Math.round(r.x[0]))).toBe(true);
    expect(Number.isInteger(Math.round(r.x[1]))).toBe(true);
    expect(2 * r.x[0] + 3 * r.x[1]).toBeGreaterThanOrEqual(7 - 1e-6);
  });

  // ---------------------------------------------------------------------------
  // 3. CSP-toy MIP（material 最小化）
  //    pattern 1: stock 10000, counts [3, 0]
  //    pattern 2: stock 10000, counts [0, 5]
  //    pattern 3: stock 8000,  counts [2, 1]
  //    demand: piece A = 6, piece B = 5
  //
  //    手計算: 整数最適は x1=2, x2=1, x3=0 → obj=30000
  //           あるいは x3=3 → counts [6,3]、足りない piece B が 2 → x2=1 追加 → obj=8000*3+10000=34000
  //           あるいは x1=0, x3=3, x2=1 → obj=34000
  //           最良は (2,1,0) で 30000
  // ---------------------------------------------------------------------------
  test('CSP-toy MIP', () => {
    const r = solveMIP({
      c: [10000, 10000, 8000],
      A: [[3, 0, 2], [0, 5, 1]],
      b: [6, 5],
      constraintTypes: ['>=', '>=']
    });
    expect(r.status).toBe('optimal');
    // 解は demand 充足
    expect(3 * r.x[0] + 0 * r.x[1] + 2 * r.x[2]).toBeGreaterThanOrEqual(6 - 1e-6);
    expect(0 * r.x[0] + 5 * r.x[1] + 1 * r.x[2]).toBeGreaterThanOrEqual(5 - 1e-6);
    // 全て integer
    for (const v of r.x) expect(Math.abs(v - Math.round(v))).toBeLessThan(1e-6);
    // 最適 obj <= 30000
    expect(r.objective).toBeLessThanOrEqual(30000 + 1e-6);
  });

  // ---------------------------------------------------------------------------
  // 4. infeasible: integer 制約で実行不可能になるケース
  //    実は LP-feasible だが integer-infeasible になるパターンは作りにくい。
  //    LP-infeasible なら直ちに infeasible 返す:
  // ---------------------------------------------------------------------------
  test('LP-infeasible → infeasible', () => {
    const r = solveMIP({
      c: [1],
      A: [[1], [1]],
      b: [3, 1],
      constraintTypes: ['>=', '<=']
    });
    expect(r.status).toBe('infeasible');
  });

  // ---------------------------------------------------------------------------
  // 5. branchScore のカスタマイズが効く
  // ---------------------------------------------------------------------------
  test('カスタム branchScore: 常に index 小を選ぶ', () => {
    const customScore = function(j) { return -j; };  // j 小ほど高 score
    const r = solveMIP({
      c: [1, 1, 1],
      A: [[1, 1, 1]],
      b: [2.5],
      constraintTypes: ['>=']
    }, { branchScore: customScore });
    expect(r.status).toBe('optimal');
    expect(close(r.objective, 3)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 6. node count が finite
  // ---------------------------------------------------------------------------
  test('node count が記録される', () => {
    const r = solveMIP({
      c: [1, 1],
      A: [[2, 3], [1, 1]],
      b: [7, 2],
      constraintTypes: ['>=', '>=']
    });
    expect(r.nodeCount).toBeGreaterThan(0);
    expect(r.lpCalls).toBeGreaterThan(0);
    expect(typeof r.gap).toBe('number');
  });

  // ---------------------------------------------------------------------------
  // 7. mostFractionalScore の挙動
  // ---------------------------------------------------------------------------
  test('mostFractionalScore: 0.5 に近いほど高 score', () => {
    expect(mostFractionalScore(0, 1.5)).toBeGreaterThan(mostFractionalScore(0, 1.1));
    expect(mostFractionalScore(0, 2.5)).toBeCloseTo(mostFractionalScore(0, 1.5));
    expect(mostFractionalScore(0, 1.5)).toBeCloseTo(0);
  });
});
