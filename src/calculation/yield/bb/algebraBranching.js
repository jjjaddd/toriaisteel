/**
 * TORIAI 計算 V3 — Algebra-Guided Branching for B&B
 *
 * 仮説 (RESEARCH_BB_ALGEBRA.md §3 H2):
 *   pattern 集合に対する Phase 1 algebra (R1〜R5) の構造的特徴を
 *   branching score に組み込めば、Most-Fractional より node 数が減る。
 *
 * 設計:
 *   - branchAndBound.js の branchScore コールバックに渡せる関数を作る
 *   - 各 pattern p に対し、algebra-derived score を pre-compute（メモ化）
 *   - 最終 score = w_frac × fractionality(x_p*) + w_loss × lossRatio(p)
 *                + w_distinct × distinctPieceCount(p)
 *
 * 直感:
 *   - lossRatio 高 = 「無駄な pattern」 → 整数解では 0 になる確率高 → 早めに branch
 *   - distinctPieceCount 高 = 「専用化された pattern」 → 代替が効きにくい → 早めに decide
 *   - fractionality 0.5 近 = LP が判断保留している変数 → 標準ヒューリスティック
 *
 * 純関数。algebra/* 名前空間（IIFE/global）には依存しない。
 * pattern features は明示的に渡す前提。
 */

'use strict';

// ============================================================================
// computePatternFeatures(pattern, pieceLengths, blade, endLoss)
//
// pattern: { stock: number, counts: number[] }
// pieceLengths: number[]  // counts と同じ index で揃った長さ
//
// 戻り値: {
//   stock, totalPieces, usedLength, loss, lossRatio,
//   distinctPieceCount   // counts[i] > 0 の i の数
// }
// ============================================================================

function computePatternFeatures(pattern, pieceLengths, blade, endLoss) {
  blade = blade || 0;
  endLoss = endLoss || 0;
  const counts = pattern.counts;
  const stock = pattern.stock;
  let totalPieces = 0;
  let cutLen = 0;
  let distinct = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > 0) {
      distinct++;
      totalPieces += counts[i];
      cutLen += counts[i] * pieceLengths[i];
    }
  }
  // 板取り長 = piece 合計 + 切代 × (piece 数 - 1) + 端落とし × 2
  const usedLength = totalPieces > 0
    ? cutLen + Math.max(0, totalPieces - 1) * blade + 2 * endLoss
    : 0;
  const loss = Math.max(0, stock - usedLength);
  const lossRatio = stock > 0 ? loss / stock : 0;
  return {
    stock: stock,
    totalPieces: totalPieces,
    usedLength: usedLength,
    loss: loss,
    lossRatio: lossRatio,
    distinctPieceCount: distinct
  };
}

// ============================================================================
// makeAlgebraBranchScore(patterns, opts)
//
// patterns: Pattern[]   // 変数 j に対応する pattern
// opts: {
//   pieceLengths: number[]
//   blade?, endLoss?
//   wFrac?: number    (default 1)
//   wLoss?: number    (default 2)
//   wDistinct?: number (default 0.1)
// }
//
// 戻り値: branchScore: (j, lpValue) => number
//   B&B から呼ばれる。事前に features を memoize。
// ============================================================================

function makeAlgebraBranchScore(patterns, opts) {
  opts = opts || {};
  const wFrac = opts.wFrac != null ? opts.wFrac : 1;
  const wLoss = opts.wLoss != null ? opts.wLoss : 2;
  const wDistinct = opts.wDistinct != null ? opts.wDistinct : 0.1;
  const pieceLengths = opts.pieceLengths || [];
  const blade = opts.blade || 0;
  const endLoss = opts.endLoss || 0;

  // 各 pattern の feature を pre-compute
  const features = patterns.map(function(p) {
    return computePatternFeatures(p, pieceLengths, blade, endLoss);
  });

  return function(j, lpValue) {
    const f = features[j];
    if (!f) return 0;
    const frac = lpValue - Math.floor(lpValue);
    const fracComponent = -Math.abs(frac - 0.5);  // 0.5 近で 0、両端で -0.5
    return wFrac * fracComponent
         + wLoss * f.lossRatio
         + wDistinct * f.distinctPieceCount;
  };
}

// ============================================================================
// makeMostFractionalScore — baseline、参考実装
// ============================================================================

function makeMostFractionalScore() {
  return function(j, lpValue) {
    const frac = lpValue - Math.floor(lpValue);
    return -Math.abs(frac - 0.5);
  };
}

// ============================================================================
// 公開 — Node (CommonJS) と Browser (Toriai global namespace) の dual-mode
// ============================================================================

var _exports = {
  computePatternFeatures: computePatternFeatures,
  makeAlgebraBranchScore: makeAlgebraBranchScore,
  makeMostFractionalScore: makeMostFractionalScore
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  var _g = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis);
  _g.Toriai = _g.Toriai || {};
  _g.Toriai.calculation = _g.Toriai.calculation || {};
  _g.Toriai.calculation.yield = _g.Toriai.calculation.yield || {};
  _g.Toriai.calculation.yield.bb = _g.Toriai.calculation.yield.bb || {};
  _g.Toriai.calculation.yield.bb.algebraBranching = _exports;
}
