/**
 * TORIAI 計算 V3 — Rational number arithmetic with BigInt
 *
 * 用途: Phase K (Dual-Algebra LP) の rational simplex で使う厳密有理数。
 *
 * 不変条件:
 *   - den > 0 (always positive denominator)
 *   - gcd(|num|, den) === 1n (canonical form, always reduced)
 *   - 0 は { num: 0n, den: 1n } で表現
 *
 * すべての演算は exact (no rounding)、ただし演算結果は automatic に reduce される。
 *
 * 純関数 + dual-mode (Node + Browser、BigInt は ES2020 で標準)。
 */

'use strict';

// ============================================================================
// gcd — Euclidean algorithm for BigInt
// ============================================================================

function gcd(a, b) {
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b !== 0n) {
    var t = b;
    b = a % b;
    a = t;
  }
  return a;
}

// ============================================================================
// Rational constructor — { num: BigInt, den: BigInt }
//
// canonicalize: den > 0、gcd 約分済
// ============================================================================

function rational(num, den) {
  if (typeof num !== 'bigint') num = BigInt(num);
  if (typeof den !== 'bigint') den = BigInt(den);
  if (den === 0n) throw new Error('[Rational] zero denominator');
  if (den < 0n) { num = -num; den = -den; }
  if (num === 0n) return { num: 0n, den: 1n };
  var g = gcd(num < 0n ? -num : num, den);
  return { num: num / g, den: den / g };
}

function fromInt(n) { return rational(BigInt(n), 1n); }
function zero() { return { num: 0n, den: 1n }; }
function one() { return { num: 1n, den: 1n }; }

// fromFloat: 注意 — 浮動小数点の不正確さがそのまま rational に転写される
//   厳密に整数を扱いたいなら fromInt を使うこと
function fromFloat(f, maxDen) {
  maxDen = maxDen || 1000000n;
  if (typeof maxDen !== 'bigint') maxDen = BigInt(maxDen);
  if (!isFinite(f)) throw new Error('[Rational] non-finite float');
  if (f === Math.floor(f) && Math.abs(f) < Number.MAX_SAFE_INTEGER) {
    return fromInt(Math.round(f));
  }
  // 連分数展開で近似 (Stern-Brocot like)
  var sign = f < 0 ? -1n : 1n;
  f = Math.abs(f);
  var n = BigInt(Math.round(f * Number(maxDen)));
  return rational(sign * n, maxDen);
}

// ============================================================================
// 算術演算 — すべて新しい Rational を返す（不変）
// ============================================================================

function add(a, b) {
  return rational(a.num * b.den + b.num * a.den, a.den * b.den);
}
function sub(a, b) {
  return rational(a.num * b.den - b.num * a.den, a.den * b.den);
}
function mul(a, b) {
  return rational(a.num * b.num, a.den * b.den);
}
function div(a, b) {
  if (b.num === 0n) throw new Error('[Rational] divide by zero');
  return rational(a.num * b.den, a.den * b.num);
}
function neg(a) {
  return { num: -a.num, den: a.den };
}
function abs(a) {
  return a.num < 0n ? { num: -a.num, den: a.den } : a;
}

// ============================================================================
// 比較 — 全て exact、EPS 不要
//
// a < b ⇔ a.num*b.den < b.num*a.den (since den > 0)
// ============================================================================

function eq(a, b) { return a.num === b.num && a.den === b.den; }
function lt(a, b) { return a.num * b.den < b.num * a.den; }
function gt(a, b) { return a.num * b.den > b.num * a.den; }
function lte(a, b) { return a.num * b.den <= b.num * a.den; }
function gte(a, b) { return a.num * b.den >= b.num * a.den; }
function isZero(a) { return a.num === 0n; }
function isPositive(a) { return a.num > 0n; }
function isNegative(a) { return a.num < 0n; }
function isInteger(a) { return a.den === 1n; }
function sign(a) { return a.num < 0n ? -1 : (a.num > 0n ? 1 : 0); }

// ============================================================================
// 変換
// ============================================================================

function toNumber(a) {
  // BigInt → Number は精度落ちる、最大 53 bit。実用上は OK
  return Number(a.num) / Number(a.den);
}

function toString(a) {
  if (a.den === 1n) return a.num.toString();
  return a.num.toString() + '/' + a.den.toString();
}

// floor: a.num / a.den の整数部（BigInt）。負数で正しく floor する
function floor(a) {
  if (a.num >= 0n) return a.num / a.den;
  // 負数: a.num / a.den は trunc towards zero、floor は -1 ずれることあり
  var q = a.num / a.den;
  if (q * a.den === a.num) return q;
  return q - 1n;
}
function ceil(a) {
  if (a.num <= 0n) return a.num / a.den;
  var q = a.num / a.den;
  if (q * a.den === a.num) return q;
  return q + 1n;
}
function round(a) {
  // half-away-from-zero
  if (a.num === 0n) return 0n;
  var doubled = a.num * 2n;
  var q = doubled / a.den;
  // q is doubled-rounded-towards-zero
  if (q >= 0n) return (q + 1n) / 2n;
  return (q - 1n) / 2n;
}

// ============================================================================
// 配列 / 行列ヘルパ
// ============================================================================

function vecToFloat(arr) {
  return arr.map(toNumber);
}

function matFromInts(intMatrix) {
  // 整数行列 (number or string) から Rational 行列に変換
  return intMatrix.map(function(row) {
    return row.map(function(v) { return fromInt(v); });
  });
}

// ============================================================================
// 公開
// ============================================================================

var _exports = {
  // factory
  rational: rational,
  fromInt: fromInt,
  fromFloat: fromFloat,
  zero: zero,
  one: one,
  // arithmetic
  add: add,
  sub: sub,
  mul: mul,
  div: div,
  neg: neg,
  abs: abs,
  // comparisons
  eq: eq,
  lt: lt,
  gt: gt,
  lte: lte,
  gte: gte,
  isZero: isZero,
  isPositive: isPositive,
  isNegative: isNegative,
  isInteger: isInteger,
  sign: sign,
  // conversion
  toNumber: toNumber,
  toString: toString,
  floor: floor,
  ceil: ceil,
  round: round,
  // helpers
  vecToFloat: vecToFloat,
  matFromInts: matFromInts,
  gcd: gcd
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  var _g = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis);
  _g.Toriai = _g.Toriai || {};
  _g.Toriai.calculation = _g.Toriai.calculation || {};
  _g.Toriai.calculation.yield = _g.Toriai.calculation.yield || {};
  _g.Toriai.calculation.yield.research = _g.Toriai.calculation.yield.research || {};
  _g.Toriai.calculation.yield.research.rational = _exports;
}
