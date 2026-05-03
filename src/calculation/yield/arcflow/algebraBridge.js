/**
 * TORIAI 計算 V3 — Algebra Bridge
 *
 * arcflow (CommonJS) ⇄ algebra (IIFE on globalThis.Toriai) のブリッジ。
 *
 * 役割:
 *   1. V3 ソルバ (FFD / CG) の結果を algebra TERM PLAN 形式に変換
 *   2. algebra/normalForm.normalize で正規形検証
 *   3. V3 出力が正規形を満たさない場合は、何が満たされてないかを返す
 *
 * これにより Phase 1 で構築した algebra エンジン（公理 A1-A9 + 簡約規則 R1-R5）が
 * V3 出力の **形式的正当性**を保証するレイヤーとして機能する。
 *
 * 非対称: algebra は IIFE で globalThis.Toriai に登録されている。Node では
 * vm sandbox 経由でロードする必要があるため、bridge は loadAlgebraInSandbox
 * helper も提供する。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// ============================================================================
// algebra を vm sandbox にロードして公開ハンドルを返す
// ============================================================================

function loadAlgebraInSandbox() {
  const sandbox = { console: { log: function() {}, warn: function() {} } };
  vm.createContext(sandbox);
  const order = [
    'src/core/toriai-namespace.js',
    'src/calculation/yield/algebra/term.js',
    'src/calculation/yield/algebra/axioms.js',
    'src/calculation/yield/algebra/rewriteRules.js',
    'src/calculation/yield/algebra/normalForm.js'
  ];
  for (const rel of order) {
    const code = fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
  }
  return sandbox.Toriai.calculation.yield.algebra;
}

// ============================================================================
// V3 result → TERM PLAN コンバータ
//
// 入力:
//   v3Result: { bars: [{ stock, pattern, count }], ... }
//   spec: { blade, endLoss }
//   algebra: loadAlgebraInSandbox() の戻り値
//
// 出力: algebra TERM PLAN
// ============================================================================

function v3ResultToPlan(v3Result, spec, algebra) {
  const T = algebra.term;
  if (!v3Result || !v3Result.bars || v3Result.bars.length === 0) {
    return T.emptyPlan();
  }
  const entries = v3Result.bars.map(function(bar) {
    const pattern = T.makePattern({
      stock: bar.stock,
      blade: spec.blade,
      endLoss: spec.endLoss,
      pieces: bar.pattern.slice() // makePattern が降順 sort する
    });
    return { pattern: pattern, count: bar.count };
  });
  return T.makePlan(entries);
}

// ============================================================================
// V3 結果の正規形検証
//
// 入力:
//   v3Result, spec, availableStocks, algebra
//
// 出力:
//   {
//     isNormalForm: boolean,
//     normalizeSteps: number,
//     normalizeTrace: [string],
//     diagnosis: string,
//     normalizedTerm: TERM (always returned)
//   }
//
// isNormalForm === true なら V3 は algebra 正規形を満たしている = 構造的に最適
// false なら V3 が見落とした簡約があった証拠 → V3 のバグ可能性
// ============================================================================

function validateV3AgainstAlgebra(v3Result, spec, availableStocks, algebra) {
  const T = algebra.term;
  const NF = algebra.normalForm;

  let v3Plan;
  try {
    v3Plan = v3ResultToPlan(v3Result, spec, algebra);
  } catch (e) {
    return Object.freeze({
      isNormalForm: false,
      normalizeSteps: -1,
      normalizeTrace: [],
      diagnosis: 'v3_to_plan_conversion_failed: ' + e.message,
      normalizedTerm: null
    });
  }

  const ctx = { availableStocks: availableStocks };
  const normResult = NF.normalize(v3Plan, ctx, { trace: true });
  const isNormalForm = (normResult.steps === 0);
  let diagnosis = 'ok';
  if (!isNormalForm) {
    diagnosis = 'v3_not_normal: applied ' + normResult.steps + ' rewrites: '
      + normResult.trace.slice(0, 5).join(' / ');
  }
  return Object.freeze({
    isNormalForm: isNormalForm,
    normalizeSteps: normResult.steps,
    normalizeTrace: normResult.trace,
    diagnosis: diagnosis,
    normalizedTerm: normResult.term,
    originalPlan: v3Plan
  });
}

// ============================================================================
// 正規化された TERM PLAN を V3 result 形式に戻すコンバータ（逆変換）
//
// algebra normalize で改善が見つかった場合、それを V3 形式の解として使える
// ============================================================================

function planToV3Result(plan, spec, algebra) {
  const T = algebra.term;
  if (!T.isPlan(plan) || plan.entries.length === 0) {
    return {
      status: 'algebra_normalized',
      barCount: 0, stockTotal: 0, pieceTotal: 0, lossTotal: 0,
      bars: [], distinctStockCount: 0, stockBreakdown: {}
    };
  }
  const blade = spec.blade || 0;
  const endLoss = spec.endLoss || 0;
  const bars = plan.entries.filter(function(e) { return e.count > 0; }).map(function(e) {
    return {
      stock: e.pattern.stock,
      pattern: e.pattern.pieces.slice(),
      count: e.count
    };
  });
  const metrics = T.planMetrics(plan);
  const lossTotal = bars.reduce(function(s, b) {
    const used = b.pattern.reduce(function(a, x) { return a + x; }, 0);
    const sizeWithBlades = b.pattern.length > 0 ? used + (b.pattern.length - 1) * blade : 0;
    const lossPerBar = (b.stock - endLoss) - sizeWithBlades;
    return s + lossPerBar * b.count;
  }, 0);
  const stockBreakdown = {};
  bars.forEach(function(b) { stockBreakdown[b.stock] = (stockBreakdown[b.stock] || 0) + b.count; });
  const distinctStocks = new Set(Object.keys(stockBreakdown));
  return {
    status: 'algebra_normalized',
    barCount: metrics.barCount,
    stockTotal: metrics.stockTotal,
    pieceTotal: metrics.pieceTotal,
    lossTotal: lossTotal,
    bars: bars,
    distinctStockCount: distinctStocks.size,
    stockBreakdown: stockBreakdown
  };
}

// ============================================================================
// 公開
// ============================================================================

module.exports = {
  loadAlgebraInSandbox: loadAlgebraInSandbox,
  v3ResultToPlan: v3ResultToPlan,
  validateV3AgainstAlgebra: validateV3AgainstAlgebra,
  planToV3Result: planToV3Result
};
