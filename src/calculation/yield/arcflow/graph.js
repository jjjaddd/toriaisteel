/**
 * TORIAI 計算 V3 — Arc-Flow 数値ソルバー基盤
 *
 * graph.js — 1 定尺ぶんの Compact Arc-Flow グラフ構築。
 *
 * 参考文献:
 *   Valério de Carvalho 1999 "Exact solution of bin-packing problems
 *   using column generation and branch-and-bound"
 *   Brandão & Pedroso 2015 "Bin packing and related problems:
 *   General arc-flow formulation with graph compression"
 *
 * 表現:
 *   - ノード: 定尺上の到達可能位置 {0, ..., W+blade}
 *   - item arc:  位置 p から p + (length+blade) への有向辺。"piece i を 1 個切る"
 *   - loss arc:  位置 p から sink (W+blade) への辺。"残り全部端材で締める"
 *
 * Phantom blade trick:
 *   各 item arc の重みを length+blade に統一し、容量を W+blade に拡張する。
 *   "最初のピースだけ blade 無し" の例外を消し、フローを線形化できる。
 *   実際の損失は (W+blade) - 最終位置 で計算する（blade 1 つぶんは常に残る）。
 *
 * 公開先: Toriai.calculation.yield.arcflow.graph (将来)
 *         Phase 2 完成までは CommonJS で require して使う。
 */

'use strict';

// ============================================================================
// 入力バリデーション
// ============================================================================

function isPositiveInt(x) {
  return typeof x === 'number' && Number.isFinite(x) && Number.isInteger(x) && x > 0;
}
function isNonNegativeInt(x) {
  return typeof x === 'number' && Number.isFinite(x) && Number.isInteger(x) && x >= 0;
}

function validateSpec(spec) {
  if (!spec || typeof spec !== 'object') throw new TypeError('[arcflow/graph] spec must be an object');
  if (!isPositiveInt(spec.stock))   throw new TypeError('[arcflow/graph] spec.stock must be a positive integer');
  if (!isNonNegativeInt(spec.blade))   throw new TypeError('[arcflow/graph] spec.blade must be non-negative integer');
  if (!isNonNegativeInt(spec.endLoss)) throw new TypeError('[arcflow/graph] spec.endLoss must be non-negative integer');
  if (spec.stock - spec.endLoss <= 0)  throw new RangeError('[arcflow/graph] effective length (stock - endLoss) must be positive');
  if (!Array.isArray(spec.pieces) || spec.pieces.length === 0) {
    throw new TypeError('[arcflow/graph] spec.pieces must be a non-empty array');
  }
  for (let i = 0; i < spec.pieces.length; i++) {
    const p = spec.pieces[i];
    if (!p || typeof p !== 'object') throw new TypeError('[arcflow/graph] piece must be an object: index ' + i);
    if (!isPositiveInt(p.length))    throw new TypeError('[arcflow/graph] piece.length must be positive integer: index ' + i);
    if (!isPositiveInt(p.count))     throw new TypeError('[arcflow/graph] piece.count must be positive integer: index ' + i);
    if (p.length > spec.stock - spec.endLoss) {
      throw new RangeError('[arcflow/graph] piece length ' + p.length + ' exceeds effective stock ' + (spec.stock - spec.endLoss) + ' (index ' + i + ')');
    }
  }
}

// ============================================================================
// 到達可能位置の計算（bounded multiple knapsack reachability）
//
// 各 item は per-bar に最大 min(demand, floor(extW / weight)) 個まで使える。
// この制約下で、サイズ 0 から各 item を 0..maxPerBar 個積んで到達可能な
// 位置全部を集める。順序非依存（多重集合）。
// ============================================================================

function computeReachablePositions(items, extW) {
  let reachable = new Set([0]);
  for (const item of items) {
    const next = new Set();
    for (const p of reachable) {
      // item を 0, 1, ..., maxPerBar 個追加した位置を全列挙
      for (let k = 0; k <= item.maxPerBar; k++) {
        const pos = p + k * item.weight;
        if (pos > extW) break;
        next.add(pos);
      }
    }
    reachable = next;
  }
  return reachable; // Set（後続で sort して array 化）
}

// ============================================================================
// グラフ構築本体
//
// 戻り値の構造:
// {
//   spec:         元入力 (frozen)
//   capacity:     有効長 W = stock - endLoss
//   extCapacity:  W + blade（phantom blade trick の容量）
//   sink:         extCapacity と同じ。グラフ上の終端ノード番号
//   nodes:        到達可能位置の昇順配列（sink 含む、0 含む）
//   nodeIndex:    nodes[i] = position の逆引き (Map: position → index)
//   items:        各 piece の { index, length, count, weight, maxPerBar } 配列
//   itemArcs:     [{ from, to, itemIndex, itemLength }] 配列（piece 切断用）
//   lossArcs:     [{ from, to (=sink) }] 配列（残部材で締める用）
//   stats:        { nodeCount, itemArcCount, lossArcCount }
// }
// ============================================================================

function buildArcFlowGraph(spec) {
  validateSpec(spec);

  const W = spec.stock - spec.endLoss;
  const extW = W + spec.blade;

  const items = spec.pieces.map(function(p, i) {
    const weight = p.length + spec.blade;
    return Object.freeze({
      index: i,
      length: p.length,
      count: p.count,
      weight: weight,
      maxPerBar: Math.min(p.count, Math.floor(extW / weight))
    });
  });

  // 到達可能位置を集める
  const reachableSet = computeReachablePositions(items, extW);
  // sink を必ず入れる（loss arc の終端）
  reachableSet.add(extW);

  const nodes = Array.from(reachableSet).sort(function(a, b) { return a - b; });
  const nodeIndex = new Map();
  nodes.forEach(function(pos, i) { nodeIndex.set(pos, i); });

  // item arcs: (p, p + weight_i) for p, p + weight_i ∈ reachable
  const itemArcs = [];
  for (let ni = 0; ni < nodes.length; ni++) {
    const p = nodes[ni];
    for (const item of items) {
      const q = p + item.weight;
      if (q > extW) continue;
      if (!nodeIndex.has(q)) continue;
      itemArcs.push(Object.freeze({
        from: p,
        to: q,
        itemIndex: item.index,
        itemLength: item.length
      }));
    }
  }

  // loss arcs: (p, sink) for p < sink
  const lossArcs = [];
  for (let ni = 0; ni < nodes.length; ni++) {
    const p = nodes[ni];
    if (p < extW) {
      lossArcs.push(Object.freeze({ from: p, to: extW }));
    }
  }

  const stats = Object.freeze({
    nodeCount: nodes.length,
    itemArcCount: itemArcs.length,
    lossArcCount: lossArcs.length
  });

  return Object.freeze({
    spec: Object.freeze({
      stock: spec.stock,
      blade: spec.blade,
      endLoss: spec.endLoss,
      pieces: Object.freeze(spec.pieces.map(function(p) {
        return Object.freeze({ length: p.length, count: p.count });
      }))
    }),
    capacity: W,
    extCapacity: extW,
    sink: extW,
    nodes: Object.freeze(nodes),
    nodeIndex: nodeIndex,
    items: Object.freeze(items),
    itemArcs: Object.freeze(itemArcs),
    lossArcs: Object.freeze(lossArcs),
    stats: stats
  });
}

// ============================================================================
// 公開
// ============================================================================

module.exports = {
  buildArcFlowGraph: buildArcFlowGraph,
  // 内部 helper（テスト & 他モジュールから参照可能にする）
  _computeReachablePositions: computeReachablePositions,
  _validateSpec: validateSpec
};
