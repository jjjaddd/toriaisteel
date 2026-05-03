/**
 * tests/research/rationalLp.test.js
 *
 * Phase K-1: rational simplex (exact arithmetic) の検証。
 *
 * 同じ教科書 LP を float 版 (bb/lp.js) と Rational 版で解き、
 * 厳密解が float 版の近似と一致することを確認する。
 */

const exactLp = require('../../src/calculation/yield/research/rationalLp.js');
const floatLp = require('../../src/calculation/yield/bb/lp.js');
const R = require('../../src/calculation/yield/research/rational.js');

describe('rationalLp — exact LP solver', () => {
  // ===========================================================================
  // 教科書 LP（float 版と一致確認）
  // ===========================================================================
  test('教科書: min x1+x2 s.t. 2x1+x2>=4, x1+2x2>=4 → 厳密 (4/3, 4/3), obj=8/3', () => {
    const spec = {
      c: [1, 1],
      A: [[2, 1], [1, 2]],
      b: [4, 4],
      constraintTypes: ['>=', '>=']
    };
    const r = exactLp.solveLPExact(spec);
    expect(r.status).toBe('optimal');
    // 厳密に 4/3, 4/3, 8/3
    expect(R.eq(r.x[0], R.rational(4n, 3n))).toBe(true);
    expect(R.eq(r.x[1], R.rational(4n, 3n))).toBe(true);
    expect(R.eq(r.objective, R.rational(8n, 3n))).toBe(true);
    // float 版とも一致
    const f = floatLp.solveLP(spec);
    expect(Math.abs(f.objective - r.objectiveFloat)).toBeLessThan(1e-6);
  });

  test('教科書: max 3x1+5x2 s.t. x1<=4, 2x2<=12, 3x1+2x2<=18 → (2,6), obj=36 (整数解)', () => {
    const spec = {
      sense: 'max',
      c: [3, 5],
      A: [[1, 0], [0, 2], [3, 2]],
      b: [4, 12, 18],
      constraintTypes: ['<=', '<=', '<=']
    };
    const r = exactLp.solveLPExact(spec);
    expect(r.status).toBe('optimal');
    expect(R.eq(r.x[0], R.fromInt(2))).toBe(true);
    expect(R.eq(r.x[1], R.fromInt(6))).toBe(true);
    expect(R.eq(r.objective, R.fromInt(36))).toBe(true);
  });

  test('= 制約 + 厳密', () => {
    const spec = {
      c: [1, 1],
      A: [[1, 1], [1, 0], [0, 1]],
      b: [5, 1, 1],
      constraintTypes: ['=', '>=', '>=']
    };
    const r = exactLp.solveLPExact(spec);
    expect(r.status).toBe('optimal');
    expect(R.eq(r.objective, R.fromInt(5))).toBe(true);
  });

  test('infeasible 検出が厳密', () => {
    const r = exactLp.solveLPExact({
      c: [1],
      A: [[1], [1]],
      b: [2, 1],
      constraintTypes: ['>=', '<=']
    });
    expect(r.status).toBe('infeasible');
  });

  test('unbounded 検出', () => {
    const r = exactLp.solveLPExact({
      sense: 'max',
      c: [1, 0],
      A: [[1, -1]],
      b: [1],
      constraintTypes: ['<=']
    });
    expect(r.status).toBe('unbounded');
  });

  test('1 変数自明: min x s.t. x>=5', () => {
    const r = exactLp.solveLPExact({
      c: [1],
      A: [[1]],
      b: [5],
      constraintTypes: ['>=']
    });
    expect(r.status).toBe('optimal');
    expect(R.eq(r.x[0], R.fromInt(5))).toBe(true);
    expect(R.eq(r.objective, R.fromInt(5))).toBe(true);
  });

  // ===========================================================================
  // CSP-toy LP relaxation: 大きい数字で float drift 起きやすい問題
  // ===========================================================================
  test('CSP-toy LP: float vs rational が完全一致', () => {
    const spec = {
      c: [10000, 10000, 8000],
      A: [[3, 0, 2], [0, 5, 1]],
      b: [6, 5],
      constraintTypes: ['>=', '>=']
    };
    const f = floatLp.solveLP(spec);
    const r = exactLp.solveLPExact(spec);
    expect(r.status).toBe('optimal');
    expect(f.status).toBe('optimal');
    expect(Math.abs(f.objective - r.objectiveFloat)).toBeLessThan(1e-6);
    // 厳密: 解の各成分も float に近い
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(f.x[i] - R.toNumber(r.x[i]))).toBeLessThan(1e-6);
    }
  });

  // ===========================================================================
  // 退化 LP — float 版で Bland's rule が必要な問題
  // ===========================================================================
  test('退化: rational simplex も収束する', () => {
    const r = exactLp.solveLPExact({
      c: [1, 1, 1],
      A: [[1, 1, 0], [0, 1, 1]],
      b: [0, 0],
      constraintTypes: ['>=', '>=']
    });
    expect(r.status).toBe('optimal');
    expect(R.isZero(r.objective)).toBe(true);
  });

  // ===========================================================================
  // 厳密性のデモ — float では起きない exact 性
  // ===========================================================================
  test('exact 解が完全な分数で出る (float 表現不可)', () => {
    // min x1 + x2 s.t. 3x1 + 7x2 >= 10, 11x1 + 13x2 >= 17
    // この最適解は綺麗な分数になるはず
    const r = exactLp.solveLPExact({
      c: [1, 1],
      A: [[3, 7], [11, 13]],
      b: [10, 17],
      constraintTypes: ['>=', '>=']
    });
    expect(r.status).toBe('optimal');
    // x も objective も Rational として保持されている
    expect(typeof r.x[0].num).toBe('bigint');
    expect(typeof r.x[0].den).toBe('bigint');
    // sanity: objective 厳密値が float 近似と一致
    expect(Math.abs(r.objectiveFloat - R.toNumber(r.objective))).toBe(0);
  });
});
