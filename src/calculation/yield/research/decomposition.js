/**
 * TORIAI 計算 V3 — CSP の Compatibility-Graph Decomposition
 *
 * 設計 (RESEARCH_DECOMP.md):
 *   piece set を compatibility graph (edge = 同じ bar に共存可能) で分析し、
 *   連結成分が複数なら独立サブ問題に分解して解く。
 *
 * Theorem: 隣接していない piece は最適解で同じ bar に co-occur しない。
 *          → 連結成分が disjoint なら全体最適 = 各成分独立最適の和
 *
 * 純関数。Node + Browser dual-mode。
 */

'use strict';

// dual-mode dep resolver
function _resolveDep(nodePath, browserNs) {
  if (typeof require === 'function') {
    try { return require(nodePath); } catch (e) { /* fall through */ }
  }
  var g = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis);
  var parts = browserNs.split('.');
  var cur = g;
  for (var i = 0; i < parts.length; i++) {
    if (!cur) return null;
    cur = cur[parts[i]];
  }
  return cur;
}

var _cg = _resolveDep('../arcflow/columnGen.js', 'Toriai.calculation.yield.arcflow.columnGen');

// ============================================================================
// buildCompatibilityGraph(spec) — piece compatibility graph
//
// nodes: piece type indices [0, k)
// edges: [(i, j)] where i, j can co-occur in some valid pattern
// components: 連結成分 [[i1, i2, ...], [j1, ...], ...] (各成分は piece indices)
// ============================================================================

function buildCompatibilityGraph(spec, opts) {
  opts = opts || {};
  // efficiencyThreshold: ε-efficient mode. 0 なら基本（feasible なら edge）。
  //   > 0 なら「i, j を含む best-fit pattern の loss 比率 ≤ threshold」のみ edge
  var effThreshold = opts.efficiencyThreshold != null ? opts.efficiencyThreshold : null;

  if (!spec || !Array.isArray(spec.pieces) || !Array.isArray(spec.availableStocks)) {
    return { nodes: [], edges: [], components: [] };
  }
  var pieces = spec.pieces;
  var k = pieces.length;
  var blade = spec.blade || 0;
  var endLoss = spec.endLoss || 0;
  var stocksAsc = spec.availableStocks.slice().sort(function(a, b) { return a - b; });
  var stockMax = stocksAsc[stocksAsc.length - 1];
  // endLoss は両端合算（columnGen.js 規約）。2 piece pattern の使用量 = sum(len) + blade + endLoss
  var capacityMax = Math.max(0, stockMax - endLoss);

  var nodes = [];
  for (var i = 0; i < k; i++) nodes.push(i);

  var edges = [];
  var adj = new Map();
  for (var i2 = 0; i2 < k; i2++) adj.set(i2, new Set());

  // ε-efficient mode: i, j のペアを 1 個ずつ詰めた時の loss 比率を計算
  function pairLossRatio(li, lj) {
    // 最小 stock で詰めた時の loss = stock - (li + lj + blade + endLoss)
    var used = li + lj + blade + endLoss;
    for (var s = 0; s < stocksAsc.length; s++) {
      var stk = stocksAsc[s];
      if (used <= stk) {
        return (stk - used) / stk;  // loss / stock
      }
    }
    return 1.0;  // どの stock にも入らない
  }

  for (var i3 = 0; i3 < k; i3++) {
    for (var j = i3 + 1; j < k; j++) {
      // 2 piece 同 bar 条件: len(i) + len(j) + blade + endLoss ≤ stockMax
      var sumLen = pieces[i3].length + pieces[j].length + blade + endLoss;
      var compatible = sumLen <= stockMax;
      if (compatible && effThreshold != null) {
        var lossRatio = pairLossRatio(pieces[i3].length, pieces[j].length);
        compatible = lossRatio <= effThreshold;
      }
      if (compatible) {
        edges.push([i3, j]);
        adj.get(i3).add(j);
        adj.get(j).add(i3);
      }
    }
  }

  // 連結成分検出 (Union-Find or BFS)
  var visited = new Array(k).fill(false);
  var components = [];
  for (var s = 0; s < k; s++) {
    if (visited[s]) continue;
    var comp = [];
    var queue = [s];
    visited[s] = true;
    while (queue.length > 0) {
      var u = queue.shift();
      comp.push(u);
      var nbrs = adj.get(u);
      nbrs.forEach(function(v) {
        if (!visited[v]) {
          visited[v] = true;
          queue.push(v);
        }
      });
    }
    components.push(comp.sort(function(a, b) { return a - b; }));
  }

  return {
    nodes: nodes,
    edges: edges,
    components: components,
    adjacency: adj
  };
}

// ============================================================================
// decomposeCsp(spec) — spec を成分単位の subSpecs に分解
//
// 戻り値:
//   subSpecs: spec[] (各成分のサブ問題)
//   components: number[][] (各 subSpec の元 piece index)
// ============================================================================

function decomposeCsp(spec) {
  var graph = buildCompatibilityGraph(spec);
  var subSpecs = graph.components.map(function(comp) {
    return {
      blade: spec.blade,
      endLoss: spec.endLoss,
      availableStocks: spec.availableStocks.slice(),
      pieces: comp.map(function(i) { return spec.pieces[i]; })
    };
  });
  return {
    subSpecs: subSpecs,
    components: graph.components,
    graph: graph
  };
}

// ============================================================================
// solveDecomposed(spec, opts) — 分解して各成分を solveColumnGen で解き、merge
//
// 戻り値: solveColumnGen と互換の result + componentResults
// ============================================================================

async function solveDecomposed(spec, opts) {
  opts = opts || {};
  var verbose = !!opts.verbose;
  var decomp = decomposeCsp(spec);

  if (verbose) {
    console.log('[decomp] components: ' + decomp.components.length
      + ' sizes: ' + decomp.components.map(function(c) { return c.length; }).join(','));
  }

  // 単一成分なら分解する意味なし、そのまま solveColumnGen に投げる
  if (decomp.components.length <= 1) {
    var directRes = await _cg.solveColumnGen(spec, opts);
    return Object.assign({}, directRes, {
      _decomp: {
        componentCount: 1,
        componentSizes: decomp.components.length === 1 ? [decomp.components[0].length] : [],
        decomposed: false
      }
    });
  }

  // 各成分を並行して solve
  var componentResults = [];
  for (var i = 0; i < decomp.subSpecs.length; i++) {
    var sub = decomp.subSpecs[i];
    var t0 = Date.now();
    var subRes = await _cg.solveColumnGen(sub, opts);
    var dt = Date.now() - t0;
    componentResults.push({ result: subRes, indices: decomp.components[i], time: dt });
    if (verbose) {
      console.log('[decomp] comp ' + i + ' size=' + decomp.components[i].length
        + ' obj=' + (subRes.stockTotal || 'N/A') + ' time=' + dt + 'ms');
    }
  }

  // merge: bars 結合、コスト合計
  var mergedBars = [];
  var mergedStockTotal = 0;
  var mergedPieceTotal = 0;
  var mergedLossTotal = 0;
  componentResults.forEach(function(cr) {
    if (cr.result.bars) mergedBars = mergedBars.concat(cr.result.bars);
    mergedStockTotal += cr.result.stockTotal || 0;
    mergedPieceTotal += cr.result.pieceTotal || 0;
    mergedLossTotal += cr.result.lossTotal || 0;
  });
  var distinctStocks = new Set(mergedBars.map(function(b) { return b.stock; }));
  var stockBreakdown = {};
  mergedBars.forEach(function(b) {
    stockBreakdown[b.stock] = (stockBreakdown[b.stock] || 0) + b.count;
  });
  var barCount = mergedBars.reduce(function(s, b) { return s + b.count; }, 0);

  return {
    status: 'cg_decomposed',
    barCount: barCount,
    stockTotal: mergedStockTotal,
    pieceTotal: mergedPieceTotal,
    lossTotal: mergedLossTotal,
    bars: mergedBars,
    distinctStockCount: distinctStocks.size,
    stockBreakdown: stockBreakdown,
    _decomp: {
      componentCount: decomp.components.length,
      componentSizes: decomp.components.map(function(c) { return c.length; }),
      decomposed: true,
      componentResults: componentResults
    }
  };
}

// ============================================================================
// 公開 — Node + Browser dual-mode
// ============================================================================

var _exports = {
  buildCompatibilityGraph: buildCompatibilityGraph,
  decomposeCsp: decomposeCsp,
  solveDecomposed: solveDecomposed
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  var _g = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis);
  _g.Toriai = _g.Toriai || {};
  _g.Toriai.calculation = _g.Toriai.calculation || {};
  _g.Toriai.calculation.yield = _g.Toriai.calculation.yield || {};
  _g.Toriai.calculation.yield.research = _g.Toriai.calculation.yield.research || {};
  _g.Toriai.calculation.yield.research.decomposition = _exports;
}
