/**
 * TORIAI 計算 V3 — CSP インスタンス難易度予測のための特徴量抽出
 *
 * 設計 (RESEARCH_HARDNESS.md §3):
 *   入力 spec から構造的特徴量を計算する純関数群。
 *
 * 用途:
 *   - インスタンス難易度の経験的分析（hardness.test.js）
 *   - 将来的な routing 判断: easy → FFD、hard → B&B (PHASE_4_PLAN M4)
 *
 * 純関数。依存ゼロ。Node + Browser dual-mode。
 */

'use strict';

// ============================================================================
// computeBasicFeatures(spec) — CSP 文献標準的な特徴量
//
// spec: { pieces, availableStocks, blade?, endLoss? }
// pieces: [{ length, count }]
// ============================================================================

function computeBasicFeatures(spec) {
  if (!spec || !Array.isArray(spec.pieces) || !Array.isArray(spec.availableStocks)) {
    return null;
  }
  var pieces = spec.pieces;
  var stocks = spec.availableStocks;
  var blade = spec.blade || 0;
  var endLoss = spec.endLoss || 0;

  var k = pieces.length;
  var n = 0;
  var totalLen = 0;
  var lengths = [];
  for (var i = 0; i < k; i++) {
    n += pieces[i].count;
    totalLen += pieces[i].length * pieces[i].count;
    lengths.push(pieces[i].length);
  }

  var L_min = Math.min.apply(null, lengths);
  var L_max = Math.max.apply(null, lengths);
  var L_span = L_max - L_min;
  var L_avg = totalLen / Math.max(1, n);

  var S_count = stocks.length;
  var S_min = Math.min.apply(null, stocks);
  var S_max = Math.max.apply(null, stocks);
  var S_span = S_max - S_min;
  var S_avg = stocks.reduce(function(a, b) { return a + b; }, 0) / S_count;

  // density: 1 stock あたり期待される piece 数
  // (S_avg - endLoss * 2) / (L_avg + blade) ≈ どれだけ piece が入るか
  var capacity = Math.max(1, S_avg - endLoss * 2);
  var density = (L_avg + blade) > 0 ? capacity / (L_avg + blade) : 0;

  // total length to cut（材料下界の概算指標）
  var totalCutLen = totalLen + Math.max(0, n - 1) * blade;

  return {
    k: k,
    n: n,
    L_min: L_min,
    L_max: L_max,
    L_span: L_span,
    L_avg: Math.round(L_avg),
    S_count: S_count,
    S_min: S_min,
    S_max: S_max,
    S_span: S_span,
    S_avg: Math.round(S_avg),
    density: Math.round(density * 100) / 100,
    totalCutLen: totalCutLen
  };
}

// ============================================================================
// computeAlgebraFeatures(spec) — algebra-derived 特徴量
//
// 仮説的に効きそうな構造的指標。仮説検証用。
// ============================================================================

function computeAlgebraFeatures(spec) {
  if (!spec || !Array.isArray(spec.pieces)) return null;
  var pieces = spec.pieces;
  var k = pieces.length;
  if (k === 0) return null;

  // demand_skew: Gini 係数で demand 分布の偏りを測る
  // 偏り大 → 一部 piece type が支配的 → 専用 pattern が必要 → hard
  var demands = pieces.map(function(p) { return p.count; });
  var demand_skew = giniCoefficient(demands);

  // length_clusters: 隣接 piece 長の倍率変化で大ざっぱな cluster 数を推定
  // 大きく分かれる長さが多いほど packing 多様性が必要
  var sortedLens = pieces.map(function(p) { return p.length; }).sort(function(a, b) { return a - b; });
  var clusters = 1;
  for (var i = 1; i < sortedLens.length; i++) {
    var ratio = sortedLens[i] / Math.max(1, sortedLens[i - 1]);
    if (ratio > 1.5) clusters++;  // 1.5 倍以上の jump で別 cluster
  }

  // length_density_var: piece 長と stock の比の variance
  // variance 大 → 様々な「埋まり方」が必要 → hard
  var stocks = spec.availableStocks || [];
  var S_avg = stocks.length > 0
    ? stocks.reduce(function(a, b) { return a + b; }, 0) / stocks.length
    : 1;
  var ratios = pieces.map(function(p) { return p.length / S_avg; });
  var ratio_variance = variance(ratios);

  // multiset_diversity: 各 piece type の「単独パッキング数」期待値の variance
  // = 各 piece が 1 stock に何個入るかのばらつき
  // 小 → どの piece も似た数だけ入る (regular) → easy
  // 大 → piece ごとに最適なパッキングが大きく異なる → hard
  var fitsPerStock = pieces.map(function(p) {
    return Math.floor(S_avg / Math.max(1, p.length));
  });
  var fits_variance = variance(fitsPerStock);

  // R5_potential: stock-down dominance（algebra R5）が効きそうな度合い
  //   各 piece type について、「最小 stock で詰めても余りが多い」 → R5 が effective
  //   すべての piece の余り合計を totalCutLen で割る ratio
  var blade = spec.blade || 0;
  var endLoss = spec.endLoss || 0;
  var S_min = stocks.length > 0 ? Math.min.apply(null, stocks) : 0;
  var capMin = Math.max(0, S_min - 2 * endLoss);
  var totalSlack = 0;
  var totalUse = 0;
  pieces.forEach(function(p) {
    var fit = Math.floor(capMin / Math.max(1, p.length + blade));
    if (fit <= 0) return;
    var used = fit * (p.length + blade);
    var slack = capMin - used;
    var bars = Math.ceil(p.count / fit);
    totalSlack += slack * bars;
    totalUse += used * bars;
  });
  var R5_potential = (totalSlack + totalUse) > 0 ? totalSlack / (totalSlack + totalUse) : 0;

  return {
    demand_skew: Math.round(demand_skew * 1000) / 1000,
    length_clusters: clusters,
    ratio_variance: Math.round(ratio_variance * 10000) / 10000,
    fits_variance: Math.round(fits_variance * 100) / 100,
    R5_potential: Math.round(R5_potential * 1000) / 1000
  };
}

// ============================================================================
// computeAllFeatures(spec) — basic + algebra
// ============================================================================

function computeAllFeatures(spec) {
  var basic = computeBasicFeatures(spec);
  var algebra = computeAlgebraFeatures(spec);
  if (!basic || !algebra) return null;
  return Object.assign({}, basic, algebra);
}

// ============================================================================
// helpers
// ============================================================================

function variance(arr) {
  if (!arr || arr.length === 0) return 0;
  var n = arr.length;
  var mean = arr.reduce(function(a, b) { return a + b; }, 0) / n;
  var sq = arr.reduce(function(s, x) { return s + (x - mean) * (x - mean); }, 0);
  return sq / n;
}

function giniCoefficient(values) {
  // Gini coefficient for non-negative values, 0 = perfect equality, 1 = max inequality
  if (!values || values.length === 0) return 0;
  var sorted = values.slice().sort(function(a, b) { return a - b; });
  var n = sorted.length;
  var sum = sorted.reduce(function(a, b) { return a + b; }, 0);
  if (sum === 0) return 0;
  var weightedSum = 0;
  for (var i = 0; i < n; i++) weightedSum += (i + 1) * sorted[i];
  return (2 * weightedSum) / (n * sum) - (n + 1) / n;
}

// ============================================================================
// 公開 — Node (CommonJS) と Browser (Toriai global namespace) の dual-mode
// ============================================================================

var _exports = {
  computeBasicFeatures: computeBasicFeatures,
  computeAlgebraFeatures: computeAlgebraFeatures,
  computeAllFeatures: computeAllFeatures,
  _internal: { variance: variance, giniCoefficient: giniCoefficient }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  var _g = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis);
  _g.Toriai = _g.Toriai || {};
  _g.Toriai.calculation = _g.Toriai.calculation || {};
  _g.Toriai.calculation.yield = _g.Toriai.calculation.yield || {};
  _g.Toriai.calculation.yield.research = _g.Toriai.calculation.yield.research || {};
  _g.Toriai.calculation.yield.research.instanceFeatures = _exports;
}
