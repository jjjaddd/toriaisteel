/**
 * tests/research/rational.test.js
 *
 * Rational arithmetic の単体テスト。Phase K-1。
 */

const R = require('../../src/calculation/yield/research/rational.js');

describe('Rational — BigInt 有理数', () => {
  // ===========================================================================
  // 構築 + canonical form
  // ===========================================================================
  describe('construction & canonical form', () => {
    test('整数: { 1, 1 } のような形', () => {
      const r = R.fromInt(5);
      expect(r.num).toBe(5n);
      expect(r.den).toBe(1n);
    });
    test('既約: 4/6 → 2/3', () => {
      const r = R.rational(4n, 6n);
      expect(r.num).toBe(2n);
      expect(r.den).toBe(3n);
    });
    test('負分母: 1/-2 → -1/2', () => {
      const r = R.rational(1n, -2n);
      expect(r.num).toBe(-1n);
      expect(r.den).toBe(2n);
    });
    test('ゼロ: 0/* → 0/1', () => {
      const r = R.rational(0n, 7n);
      expect(r.num).toBe(0n);
      expect(r.den).toBe(1n);
    });
    test('零分母 throw', () => {
      expect(() => R.rational(1n, 0n)).toThrow();
    });
  });

  // ===========================================================================
  // 算術
  // ===========================================================================
  describe('arithmetic', () => {
    test('1/2 + 1/3 = 5/6', () => {
      const r = R.add(R.rational(1n, 2n), R.rational(1n, 3n));
      expect(r.num).toBe(5n);
      expect(r.den).toBe(6n);
    });
    test('2/3 - 1/6 = 1/2', () => {
      const r = R.sub(R.rational(2n, 3n), R.rational(1n, 6n));
      expect(r.num).toBe(1n);
      expect(r.den).toBe(2n);
    });
    test('2/3 * 3/4 = 1/2', () => {
      const r = R.mul(R.rational(2n, 3n), R.rational(3n, 4n));
      expect(r.num).toBe(1n);
      expect(r.den).toBe(2n);
    });
    test('(1/2) / (3/4) = 2/3', () => {
      const r = R.div(R.rational(1n, 2n), R.rational(3n, 4n));
      expect(r.num).toBe(2n);
      expect(r.den).toBe(3n);
    });
    test('zero による除算で throw', () => {
      expect(() => R.div(R.fromInt(1), R.zero())).toThrow();
    });
    test('負号反転', () => {
      const r = R.neg(R.rational(2n, 3n));
      expect(r.num).toBe(-2n);
      expect(r.den).toBe(3n);
    });
    test('絶対値', () => {
      const r = R.abs(R.rational(-2n, 3n));
      expect(r.num).toBe(2n);
      expect(r.den).toBe(3n);
    });
  });

  // ===========================================================================
  // 比較
  // ===========================================================================
  describe('comparisons', () => {
    test('1/3 < 1/2 (符号交差比較)', () => {
      expect(R.lt(R.rational(1n, 3n), R.rational(1n, 2n))).toBe(true);
      expect(R.lt(R.rational(1n, 2n), R.rational(1n, 3n))).toBe(false);
    });
    test('2/4 == 1/2 (canonical 一致)', () => {
      expect(R.eq(R.rational(2n, 4n), R.rational(1n, 2n))).toBe(true);
    });
    test('lte / gte 境界', () => {
      expect(R.lte(R.rational(1n, 2n), R.rational(1n, 2n))).toBe(true);
      expect(R.gte(R.rational(1n, 2n), R.rational(1n, 2n))).toBe(true);
    });
    test('isZero / isPositive / isNegative', () => {
      expect(R.isZero(R.zero())).toBe(true);
      expect(R.isPositive(R.fromInt(3))).toBe(true);
      expect(R.isNegative(R.rational(-2n, 5n))).toBe(true);
    });
    test('isInteger', () => {
      expect(R.isInteger(R.fromInt(5))).toBe(true);
      expect(R.isInteger(R.rational(3n, 2n))).toBe(false);
    });
  });

  // ===========================================================================
  // 変換 + 切り捨て
  // ===========================================================================
  describe('conversions', () => {
    test('toNumber: 3/4 ≈ 0.75', () => {
      expect(R.toNumber(R.rational(3n, 4n))).toBeCloseTo(0.75);
    });
    test('toString: 整数なら数だけ、有理数なら "a/b"', () => {
      expect(R.toString(R.fromInt(5))).toBe('5');
      expect(R.toString(R.rational(2n, 3n))).toBe('2/3');
    });
    test('floor: -3/2 → -2 (向きが正しい)', () => {
      expect(R.floor(R.rational(-3n, 2n))).toBe(-2n);
      expect(R.floor(R.rational(3n, 2n))).toBe(1n);
      expect(R.floor(R.fromInt(5))).toBe(5n);
    });
    test('ceil: -3/2 → -1', () => {
      expect(R.ceil(R.rational(-3n, 2n))).toBe(-1n);
      expect(R.ceil(R.rational(3n, 2n))).toBe(2n);
    });
    test('round: 1/2 → 1 (half-away-from-zero), -1/2 → -1', () => {
      expect(R.round(R.rational(1n, 2n))).toBe(1n);
      expect(R.round(R.rational(-1n, 2n))).toBe(-1n);
      expect(R.round(R.rational(3n, 4n))).toBe(1n);
    });
  });

  // ===========================================================================
  // 累積誤差ゼロ — float では起きるが Rational では起きない
  // ===========================================================================
  describe('exact 演算で float の誤差がない', () => {
    test('0.1 + 0.2 = 0.3 (float では != )', () => {
      const a = R.rational(1n, 10n);
      const b = R.rational(2n, 10n);
      const c = R.add(a, b);
      expect(R.eq(c, R.rational(3n, 10n))).toBe(true);
      // Note: float では 0.1 + 0.2 = 0.30000000000000004
    });
    test('1/3 を 3 回足すと 1/1 (float ドリフトなし)', () => {
      const t = R.rational(1n, 3n);
      let s = R.zero();
      for (let i = 0; i < 3; i++) s = R.add(s, t);
      expect(R.eq(s, R.one())).toBe(true);
    });
    test('100 回 1/7 を足して 100 回引くとゼロ (累積誤差ゼロ)', () => {
      const t = R.rational(1n, 7n);
      let s = R.zero();
      for (let i = 0; i < 100; i++) s = R.add(s, t);
      for (let i = 0; i < 100; i++) s = R.sub(s, t);
      expect(R.isZero(s)).toBe(true);
    });
  });

  // ===========================================================================
  // gcd
  // ===========================================================================
  describe('gcd helper', () => {
    test('gcd(12, 18) = 6', () => {
      expect(R.gcd(12n, 18n)).toBe(6n);
    });
    test('gcd(0, 5) = 5', () => {
      expect(R.gcd(0n, 5n)).toBe(5n);
    });
    test('gcd 負数も扱える', () => {
      expect(R.gcd(-12n, 18n)).toBe(6n);
    });
  });
});
