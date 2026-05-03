/**
 * tests/research/rationalBb.test.js
 *
 * Phase K-2: rational B&B (exact MIP) の検証。
 *
 * 同じ MIP を float B&B (bb/branchAndBound.js) と Rational B&B で解き、
 * 両者が同じ整数最適解に到達することを確認する。
 */

const exactBb = require('../../src/calculation/yield/research/rationalBb.js');
const floatBb = require('../../src/calculation/yield/bb/branchAndBound.js');
const R = require('../../src/calculation/yield/research/rational.js');

describe('rationalBb — exact-arithmetic B&B', () => {
  jest.setTimeout(30000);

  // ===========================================================================
  // 単純: LP 解が integer なら 1 node で完了
  // ===========================================================================
  test('LP 解が整数 → 1 node で完了', () => {
    const r = exactBb.solveMipExact({
      c: [1],
      A: [[1]],
      b: [3],
      constraintTypes: ['>=']
    });
    expect(r.status).toBe('optimal');
    expect(R.eq(r.objective, R.fromInt(3))).toBe(true);
    expect(R.eq(r.x[0], R.fromInt(3))).toBe(true);
  });

  // ===========================================================================
  // 教科書 MIP: 連続 LP 分数解、整数解は明確に異なる
  // ===========================================================================
  test('教科書 MIP: min x1+x2 s.t. 2x1+3x2>=7, x1+x2>=2 → integer obj=3', () => {
    const spec = {
      c: [1, 1],
      A: [[2, 3], [1, 1]],
      b: [7, 2],
      constraintTypes: ['>=', '>=']
    };
    const r = exactBb.solveMipExact(spec);
    expect(r.status).toBe('optimal');
    expect(R.eq(r.objective, R.fromInt(3))).toBe(true);
    // 全 integer (den === 1n)
    expect(R.isInteger(r.x[0])).toBe(true);
    expect(R.isInteger(r.x[1])).toBe(true);
    // demand 充足 (Rational で厳密検証)
    const sumA = R.add(R.mul(R.fromInt(2), r.x[0]), R.mul(R.fromInt(3), r.x[1]));
    expect(R.gte(sumA, R.fromInt(7))).toBe(true);
    // float 版と一致
    const f = floatBb.solveMIP(spec);
    expect(Math.abs(f.objective - r.objectiveFloat)).toBeLessThan(1e-6);
  });

  // ===========================================================================
  // CSP-toy MIP: cost 大きい問題、float drift ありそう
  // ===========================================================================
  test('CSP-toy MIP: min stock cost', () => {
    const spec = {
      c: [10000, 10000, 8000],
      A: [[3, 0, 2], [0, 5, 1]],
      b: [6, 5],
      constraintTypes: ['>=', '>=']
    };
    const r = exactBb.solveMipExact(spec);
    expect(r.status).toBe('optimal');
    // 整数最適 = 30,000 mm
    expect(R.lte(r.objective, R.fromInt(30000))).toBe(true);
    // 全 integer
    for (let i = 0; i < 3; i++) {
      expect(R.isInteger(r.x[i])).toBe(true);
    }
    // demand 充足 (exact)
    const piece1 = R.add(R.add(
      R.mul(R.fromInt(3), r.x[0]),
      R.mul(R.fromInt(0), r.x[1])
    ), R.mul(R.fromInt(2), r.x[2]));
    expect(R.gte(piece1, R.fromInt(6))).toBe(true);
    // float B&B と一致
    const f = floatBb.solveMIP(spec);
    expect(Math.abs(f.objective - r.objectiveFloat)).toBeLessThan(1e-6);
  });

  // ===========================================================================
  // infeasible
  // ===========================================================================
  test('infeasible MIP', () => {
    const r = exactBb.solveMipExact({
      c: [1],
      A: [[1], [1]],
      b: [3, 1],
      constraintTypes: ['>=', '<=']
    });
    expect(r.status).toBe('infeasible');
  });

  // ===========================================================================
  // 整数性判定が exact (float の "ほぼ整数" を超える)
  // ===========================================================================
  test('exact 整数判定: den===1n が確定的', () => {
    // LP 解が x_j = 4/3 のような場合、float は EPS 1e-6 で 0 と判定するが
    // exact は確実に 4/3 (den=3) と判定する
    const spec = {
      c: [1, 1],
      A: [[2, 1], [1, 2]],
      b: [4, 4],
      constraintTypes: ['>=', '>=']
    };
    // この LP の最適は (4/3, 4/3)、整数最適は (1, 2) または (2, 1) で obj=3
    const r = exactBb.solveMipExact(spec);
    expect(r.status).toBe('optimal');
    expect(R.eq(r.objective, R.fromInt(3))).toBe(true);
    // 解は厳密整数
    expect(R.isInteger(r.x[0])).toBe(true);
    expect(R.isInteger(r.x[1])).toBe(true);
  });

  // ===========================================================================
  // node 数記録 + LP relaxation 値
  // ===========================================================================
  test('LP relaxation と integer optimum の gap が exact', () => {
    const r = exactBb.solveMipExact({
      c: [1, 1],
      A: [[2, 3], [1, 1]],
      b: [7, 2],
      constraintTypes: ['>=', '>=']
    });
    expect(r.lpRelaxation).toBeDefined();
    expect(r.gap).toBeDefined();  // Rational
    // gap = (3 - 7/3) / 3 = (2/3) / 3 = 2/9
    expect(R.eq(r.gap, R.rational(2n, 9n))).toBe(true);
  });
});
