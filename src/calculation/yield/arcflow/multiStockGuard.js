/**
 * TORIAI 計算 V3 — Arc-Flow 数値ソルバー基盤
 *
 * multiStockGuard.js — 解品質の評価と縮退検知。
 *
 * 役割:
 *   1. 材料下界 (lower bound) を計算 — V3 結果がどれだけ最適から遠いかを示す
 *   2. 解品質を多軸で診断 (yield gap / bar gap / 縮退度 / downsize 健全性)
 *   3. V3 が将来 timeout や API 変更で「単一定尺に縮退」した場合の自動検知
 *
 * BUG-V2-002 の根治確認に使う:
 *   V2 は「時間が足りないから単一定尺で済ませる」という縮退をした。
 *   V3 はソルバ設計で構造的に避けているが、それを assertion で永続的に保証する。
 *
 * このモジュールは純関数。HiGHS 不要。
 */

'use strict';

// ============================================================================
// 材料下界 (Material Lower Bound)
//
// バー本数の理論最小:
//   Σ(L_i × d_i) は全 piece の長さ合計
//   1 バーあたり (k 個の piece) は (Σ pieces + (k-1)·blade) の容量を消費
//   k バー全体では Σ(L_i × d_i) + (n - k) × blade の容量
//   制約: k × maxBarCapacity ≥ Σ(L_i × d_i) + (n - k) × blade
//      ⇔ k × (maxBarCapacity + blade) ≥ Σ(L_i × d_i) + n × blade
//      ⇔ k ≥ (Σ(L_i × d_i) + n × blade) / (maxBarCapacity + blade)
// ============================================================================

function computeLowerBound(spec) {
  if (!spec || !Array.isArray(spec.pieces) || spec.pieces.length === 0) {
    return { minBars: 0, totalPieceLen: 0, totalPieces: 0, maxBarCapacity: 0 };
  }
  const blade = spec.blade || 0;
  const endLoss = spec.endLoss || 0;
  const stocks = Array.isArray(spec.availableStocks)
    ? spec.availableStocks
    : (typeof spec.stock === 'number' ? [spec.stock] : []);
  const maxStock = stocks.length ? Math.max.apply(null, stocks) : 0;
  const maxBarCapacity = maxStock - endLoss;
  if (maxBarCapacity <= 0) {
    return { minBars: 0, totalPieceLen: 0, totalPieces: 0, maxBarCapacity: 0 };
  }

  let totalPieceLen = 0;
  let totalPieces = 0;
  for (const p of spec.pieces) {
    totalPieceLen += p.length * p.count;
    totalPieces += p.count;
  }

  // k ≥ ceil((sum + n*b) / (cap + b))
  const num = totalPieceLen + totalPieces * blade;
  const denom = maxBarCapacity + blade;
  const minBars = denom > 0 ? Math.ceil(num / denom) : 0;

  return {
    minBars: minBars,
    totalPieceLen: totalPieceLen,
    totalPieces: totalPieces,
    maxBarCapacity: maxBarCapacity,
    // 母材総量の下界 (loose): 最小バー × 最大定尺は実用的な上界
    // 真の下界は Σpieces / max_yield の達成可能性に依存するので別計算
    minStockTotal_loose: minBars * (maxStock - blade)
  };
}

// ============================================================================
// 解品質診断
//
// 戻り値:
//   {
//     ok: boolean                    // 重大な品質問題が無いか
//     issues: [string]               // 検出された問題
//     barCount: number
//     stockTotal: number
//     yieldPct: number
//     lowerBoundBars: number
//     barGap: number                 // actualBars - lowerBound
//     barGapRatio: number            // gap / lowerBound
//     distinctStockCount: number
//     stockBreakdown: { stockSize: barCount, ... }
//     downsizeHealth: { worstUsageRatio, suspiciousBarCount }
//                                    // 各バーが使えてる割合の最悪値
//                                    // < 0.5 のバーは「無駄に大きい定尺」可能性
//   }
//
// issue の種類:
//   "demand_unsatisfied"             // 部材数が要求を満たしていない
//   "single_stock_degeneration"      // multi-stock 環境なのに 1 種しか使ってない
//   "high_optimality_gap"            // 下界より 30% 以上多いバー本数
//   "wasteful_bar_usage"             // 50% 未満しか使ってないバーが多い
// ============================================================================

function assessSolution(spec, result) {
  const issues = [];
  const lb = computeLowerBound(spec);

  // 1. demand 完全充足チェック
  const requiredPieces = {};
  for (const p of spec.pieces) {
    requiredPieces[p.length] = (requiredPieces[p.length] || 0) + p.count;
  }
  const actualPieces = {};
  for (const bar of result.bars) {
    for (const len of bar.pattern) {
      actualPieces[len] = (actualPieces[len] || 0) + bar.count;
    }
  }
  let demandOk = true;
  for (const len in requiredPieces) {
    if ((actualPieces[len] || 0) !== requiredPieces[len]) {
      demandOk = false;
      issues.push('demand_unsatisfied: length=' + len + ' required=' + requiredPieces[len] + ' actual=' + (actualPieces[len] || 0));
    }
  }
  for (const len in actualPieces) {
    if (!(len in requiredPieces)) {
      demandOk = false;
      issues.push('extra_pieces_in_solution: length=' + len);
    }
  }

  // 2. 多定尺縮退検知 (BUG-V2-002 ガード)
  const stocks = Array.isArray(spec.availableStocks) ? spec.availableStocks : [];
  const distinctStockCount = result.distinctStockCount !== undefined
    ? result.distinctStockCount
    : (function() {
        const s = new Set(result.bars.map(function(b) { return b.stock; }));
        return s.size;
      })();
  if (stocks.length >= 2 && distinctStockCount === 1 && result.barCount >= 5) {
    // 5 バー以上の規模なのに 1 種しか使ってない → 縮退の可能性
    // ただし「最大定尺だけで全部入る」場合は正当な単一選択（縮退ではない）
    // それを判定するため: 最小定尺で同じ解が作れるか試す手もあるがコスト高
    // ヒューリスティック: 「最大定尺でない 1 種に集中」ならフラグ
    const usedStock = result.bars[0].stock;
    const maxStock = Math.max.apply(null, stocks);
    if (usedStock !== maxStock) {
      issues.push('single_stock_degeneration: ' + result.barCount + ' bars all on ' + usedStock + 'mm (' + stocks.length + ' stocks available)');
    }
  }

  // 3. 最適性ギャップ
  const barGap = result.barCount - lb.minBars;
  const barGapRatio = lb.minBars > 0 ? barGap / lb.minBars : 0;
  if (barGapRatio > 0.30) {
    issues.push('high_optimality_gap: ' + result.barCount + ' bars vs LB ' + lb.minBars + ' (gap ' + (barGapRatio * 100).toFixed(1) + '%)');
  }

  // 4. downsize 健全性 — 各バーの使用率
  const blade = spec.blade || 0;
  const endLoss = spec.endLoss || 0;
  let worstUsageRatio = 1.0;
  let suspiciousBarCount = 0;
  for (const bar of result.bars) {
    const eff = bar.stock - endLoss;
    let used = 0;
    for (const p of bar.pattern) used += p;
    if (bar.pattern.length > 1) used += (bar.pattern.length - 1) * blade;
    const usageRatio = eff > 0 ? used / eff : 0;
    if (usageRatio < worstUsageRatio) worstUsageRatio = usageRatio;
    if (usageRatio < 0.5) suspiciousBarCount += bar.count;
  }
  // multi-bar の半分以上が 50% 未満なら警告
  if (result.barCount > 5 && suspiciousBarCount / result.barCount > 0.5) {
    issues.push('wasteful_bar_usage: ' + suspiciousBarCount + '/' + result.barCount + ' bars use < 50% (downsize ineffective)');
  }

  // 全体整合
  const stockBreakdown = result.stockBreakdown || (function() {
    const m = {};
    for (const b of result.bars) m[b.stock] = (m[b.stock] || 0) + b.count;
    return m;
  })();

  const yieldPct = result.stockTotal > 0
    ? (result.pieceTotal / result.stockTotal) * 100
    : 0;

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
    barCount: result.barCount,
    stockTotal: result.stockTotal,
    pieceTotal: result.pieceTotal,
    yieldPct: yieldPct,
    lowerBoundBars: lb.minBars,
    barGap: barGap,
    barGapRatio: barGapRatio,
    distinctStockCount: distinctStockCount,
    stockBreakdown: Object.freeze(stockBreakdown),
    demandOk: demandOk,
    downsizeHealth: Object.freeze({
      worstUsageRatio: worstUsageRatio,
      suspiciousBarCount: suspiciousBarCount
    })
  });
}

// ============================================================================
// assertSolutionQuality — 重大問題があれば throw
//
// V3 が将来縮退したり demand を満たさなかったりした場合に CI で検知できる。
// ============================================================================

function assertSolutionQuality(spec, result, opts) {
  opts = opts || {};
  const assessment = assessSolution(spec, result);
  const ignoreGap = opts.ignoreOptimalityGap === true;
  const blockingIssues = assessment.issues.filter(function(i) {
    if (ignoreGap && i.startsWith('high_optimality_gap')) return false;
    return true;
  });
  if (blockingIssues.length > 0) {
    const err = new Error('[multiStockGuard] solution quality assertion failed: ' + blockingIssues.join('; '));
    err.assessment = assessment;
    throw err;
  }
  return assessment;
}

// ============================================================================
// 公開
// ============================================================================

module.exports = {
  computeLowerBound: computeLowerBound,
  assessSolution: assessSolution,
  assertSolutionQuality: assertSolutionQuality
};
