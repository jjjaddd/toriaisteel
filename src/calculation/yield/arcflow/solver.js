/**
 * TORIAI 計算 V3 — Arc-Flow 数値ソルバー基盤
 *
 * solver.js — graph.js + highsAdapter.js を統合し、単一定尺の切断問題を解く。
 *
 * パイプライン:
 *   spec → buildArcFlowGraph → buildLp → solve → decodeFlow → bars
 *
 * Day-3 のスコープ: 単一定尺、目的関数 = バー本数最小化 (min z)。
 * Day-4 で multi-stock 拡張、目的関数の差し替え（loss / stock total）。
 *
 * 依存: arcflow/graph.js, arcflow/highsAdapter.js
 */

'use strict';

const graphBuilder = require('./graph.js');
const highs = require('./highsAdapter.js');

// ============================================================================
// LP 文字列生成
//
// 変数:
//   x{i} : arc i の flow （整数 ≥ 0）。i は item arc / loss arc 通し番号
//   z    : バー本数（整数 ≥ 0）
//
// 制約:
//   1. ノード保存則 (各内部ノード v): 流入合計 - 流出合計 = 0
//   2. source (node 0):   流出合計 = z
//   3. sink:              流入合計 = z
//   4. demand (各 piece i): flow on item arcs labeled i 合計 = d_i
//
// 目的: min z
// ============================================================================

/**
 * @param {object} graph buildArcFlowGraph の出力
 * @returns {string} CPLEX LP format
 */
function buildLp(graph) {
  // 全 arc を 1 列に並べる: item arcs + loss arcs
  const allArcs = graph.itemArcs.concat(graph.lossArcs);
  // arc i → 'x' + i  という変数名
  function arcVar(i) { return 'x' + i; }

  // ノードごとの「流入 arc index 一覧」「流出 arc index 一覧」を作る
  const inArcs  = new Map(); // node → [arcIdx]
  const outArcs = new Map();
  graph.nodes.forEach(function(p) {
    inArcs.set(p, []);
    outArcs.set(p, []);
  });
  allArcs.forEach(function(arc, i) {
    outArcs.get(arc.from).push(i);
    inArcs.get(arc.to).push(i);
  });

  // 各 piece index の item arc 一覧
  const itemArcsByPiece = new Map(); // pieceIdx → [arcIdx]
  graph.items.forEach(function(item) {
    itemArcsByPiece.set(item.index, []);
  });
  graph.itemArcs.forEach(function(arc, i) {
    itemArcsByPiece.get(arc.itemIndex).push(i);
  });

  const lines = [];
  lines.push('Minimize');
  lines.push(' obj: z');
  lines.push('Subject To');

  // CPLEX LP format は 1 行が長すぎると parse 失敗する（実装依存だが ~500 文字想定）。
  // 制約本体を + / - 記号で安全に折り返す helper。
  const MAX_LINE = 200;
  function wrapConstraint(name, body, rhs) {
    // body は "a + b - c + d" のような形式
    const tokens = body.split(' ').filter(function(t) { return t.length > 0; });
    const out = [];
    let cur = ' ' + name + ': ';
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (cur.length + t.length + 1 > MAX_LINE && cur.trim().length > name.length + 1) {
        out.push(cur);
        cur = '   '; // 継続行はインデント
      }
      cur += (cur.endsWith(' ') ? '' : ' ') + t;
    }
    out.push(cur + ' ' + rhs);
    return out;
  }

  // 1+2+3 まとめ:
  //   各ノード v について: (流入 - 流出) = (v == sink ? z : (v == source ? -z : 0))
  //   ⇔ 流入 - 流出 = +z (sink) / -z (source) / 0 (内部)
  //   ⇔ 流入 - 流出 - (z if sink) + (z if source) = 0
  //   形式上: source と sink を含めて全ノード保存則をまとめる
  //
  // 書式:
  //   source: -x... -x... + z = 0   (流出 = z)
  //   sink:    x... + x... - z = 0  (流入 = z)
  //   inner:   x_in... - x_out... = 0
  graph.nodes.forEach(function(p) {
    const ins = inArcs.get(p);
    const outs = outArcs.get(p);
    const terms = [];
    ins.forEach(function(i) { terms.push('+ ' + arcVar(i)); });
    outs.forEach(function(i) { terms.push('- ' + arcVar(i)); });
    let rhs = '= 0';
    let name;
    if (p === 0 && p === graph.sink) {
      // degenerate single-node case: skip
      return;
    }
    if (p === 0) {
      // 流出 = z  →  -outs + z = 0  →  + z - outs = 0
      terms.push('+ z');
      name = 'source';
    } else if (p === graph.sink) {
      // 流入 = z  →  ins - z = 0
      terms.push('- z');
      name = 'sink';
    } else {
      name = 'node_' + p;
    }
    if (terms.length === 0) return; // empty constraint, skip
    let body = terms.join(' ');
    if (body.startsWith('+ ')) body = body.slice(2);
    const wrapped = wrapConstraint(name, body, rhs);
    for (let wi = 0; wi < wrapped.length; wi++) lines.push(wrapped[wi]);
  });

  // 4. demand 制約
  graph.items.forEach(function(item) {
    const arcIdxs = itemArcsByPiece.get(item.index);
    if (arcIdxs.length === 0) {
      // demand があるのに arc が 1 本も無い → 物理的に不可能
      // CPLEX で表現: 0 = d_i  → infeasible になる
      lines.push(' demand_' + item.index + ': 0 = ' + item.count);
      return;
    }
    const terms = arcIdxs.map(function(i) { return '+ ' + arcVar(i); });
    let body = terms.join(' ');
    if (body.startsWith('+ ')) body = body.slice(2);
    const wrapped = wrapConstraint('demand_' + item.index, body, '= ' + item.count);
    for (let wi = 0; wi < wrapped.length; wi++) lines.push(wrapped[wi]);
  });

  // Bounds: 整数 MIP で上界を明示しないと HiGHS-WASM が探索木を抱えきれず
  // "null function or function signature mismatch" で落ちる。
  // 各 arc / z に妥当な上界を与えて branch-and-bound を有界化する。
  const totalDemand = graph.items.reduce(function(s, it) { return s + it.count; }, 0);
  lines.push('Bounds');
  // item arc: 1 本のバーで使う最大は item.maxPerBar、全バー合計上限は item.count
  graph.itemArcs.forEach(function(arc, i) {
    const itemCount = graph.items[arc.itemIndex].count;
    lines.push(' 0 <= ' + arcVar(i) + ' <= ' + itemCount);
  });
  // loss arc: バー数 z 以下
  for (let i = 0; i < graph.lossArcs.length; i++) {
    const arcIdx = graph.itemArcs.length + i;
    lines.push(' 0 <= ' + arcVar(arcIdx) + ' <= ' + totalDemand);
  }
  // z: 最悪「全 piece が 1 個 / バー」で totalDemand
  lines.push(' 0 <= z <= ' + totalDemand);

  // General (整数指定)
  lines.push('General');
  // 1 行に詰める
  const intVars = [];
  for (let i = 0; i < allArcs.length; i++) intVars.push(arcVar(i));
  intVars.push('z');
  // 1 行 80 文字くらいに改行（CPLEX は柔軟だが、長すぎると怒られることがある）
  let curLine = ' ';
  intVars.forEach(function(v, k) {
    if (curLine.length + v.length + 1 > 100) {
      lines.push(curLine);
      curLine = ' ';
    }
    curLine += v + ' ';
  });
  if (curLine.trim().length > 0) lines.push(curLine);

  lines.push('End');
  return lines.join('\n');
}

// ============================================================================
// flow → パス分解
//
// HiGHS の解 (各 arc の flow 値) を受け取り、source → sink のパスに分解して
// 「同じパターンを使うバーの本数」を集計する。
//
// アルゴリズム:
//   1. 各 arc の flow を整数化 (Math.round)
//   2. source から sink へ DFS でパスを 1 本見つける
//   3. パス上の最小 flow を bottleneck として、そのぶんの bars を 1 パターンに記録
//   4. パス上の各 arc の flow を bottleneck だけ減らす
//   5. source の流出が 0 になるまで繰り返す
// ============================================================================

function decodeFlow(graph, primal) {
  const allArcs = graph.itemArcs.concat(graph.lossArcs);
  const flow = allArcs.map(function(_, i) { return Math.round(primal['x' + i] || 0); });

  // 各ノードの「flow > 0 の流出 arc 一覧」を maintain
  const outAt = new Map();
  graph.nodes.forEach(function(p) { outAt.set(p, []); });
  allArcs.forEach(function(arc, i) { outAt.get(arc.from).push(i); });

  function popFlowingOut(node) {
    const arr = outAt.get(node);
    while (arr.length > 0 && flow[arr[arr.length - 1]] === 0) arr.pop();
    return arr.length > 0 ? arr[arr.length - 1] : -1;
  }

  const patternMap = new Map(); // patternKey → { pieces: [length, ...], count }
  const sink = graph.sink;
  let safety = 0;
  const safetyMax = 100000;

  while (safety++ < safetyMax) {
    // source からパスを探す
    const startArc = popFlowingOut(0);
    if (startArc < 0) break; // source の流出ゼロ → 完了

    const path = [];
    let cur = 0;
    while (cur !== sink) {
      const arcIdx = popFlowingOut(cur);
      if (arcIdx < 0) {
        throw new Error('[arcflow/solver] decodeFlow: dead end at node ' + cur + ' (flow conservation broken?)');
      }
      path.push(arcIdx);
      cur = allArcs[arcIdx].to;
    }

    // bottleneck = path 上の最小 flow
    let bottleneck = Infinity;
    for (let i = 0; i < path.length; i++) {
      if (flow[path[i]] < bottleneck) bottleneck = flow[path[i]];
    }
    if (bottleneck === Infinity || bottleneck <= 0) break;

    // パス上の piece length を集める（loss arc は無視）
    const pieces = [];
    for (let i = 0; i < path.length; i++) {
      const arc = allArcs[path[i]];
      if (typeof arc.itemLength === 'number') {
        pieces.push(arc.itemLength);
      }
    }
    pieces.sort(function(a, b) { return b - a; }); // 降順正準化

    const key = pieces.join(',');
    if (!patternMap.has(key)) {
      patternMap.set(key, { pieces: pieces, count: 0 });
    }
    patternMap.get(key).count += bottleneck;

    // パス上の flow を減算
    for (let i = 0; i < path.length; i++) flow[path[i]] -= bottleneck;
  }

  if (safety >= safetyMax) {
    throw new Error('[arcflow/solver] decodeFlow: safety bound exceeded; possible flow inconsistency');
  }

  return Array.from(patternMap.values());
}

// ============================================================================
// 単一定尺ソルバ — end-to-end
//
// 入力:
//   spec = { stock, blade, endLoss, pieces: [{length, count}] }
//
// 出力:
//   {
//     status: 'optimal' | 'infeasible' | string
//     barCount: number   (= z)
//     stockTotal: number (= barCount * stock)
//     pieceTotal: number
//     lossTotal:  number
//     bars: [
//       { pattern: [length, length, ...], count, stock }  // 同パターン bar 集約
//     ]
//   }
// ============================================================================

async function solveSingleStock(spec) {
  const graph = graphBuilder.buildArcFlowGraph(spec);
  const lp = buildLp(graph);
  const sol = await highs.solve(lp);

  if (!highs.isOptimal(sol)) {
    return {
      status: sol.Status,
      barCount: 0,
      stockTotal: 0,
      pieceTotal: 0,
      lossTotal: 0,
      bars: [],
      _diagnostic: { lpLines: lp.split('\n').length }
    };
  }

  const primal = highs.extractPrimal(sol);
  const z = Math.round(primal.z || 0);
  const bars = decodeFlow(graph, primal);

  // 集計
  const stockTotal = z * spec.stock;
  const pieceTotal = spec.pieces.reduce(function(s, p) { return s + p.length * p.count; }, 0);
  const lossTotal = bars.reduce(function(s, b) {
    const used = b.pieces.reduce(function(a, x) { return a + x; }, 0);
    const sizeWithBlades = b.pieces.length > 0 ? used + (b.pieces.length - 1) * spec.blade : 0;
    const lossPerBar = (spec.stock - spec.endLoss) - sizeWithBlades;
    return s + lossPerBar * b.count;
  }, 0);

  // bars を stock 付きで返す
  const barsWithStock = bars.map(function(b) {
    return Object.freeze({ stock: spec.stock, pattern: Object.freeze(b.pieces), count: b.count });
  });

  return Object.freeze({
    status: 'optimal',
    barCount: z,
    stockTotal: stockTotal,
    pieceTotal: pieceTotal,
    lossTotal: lossTotal,
    bars: Object.freeze(barsWithStock),
    _objective: sol.ObjectiveValue
  });
}

// ============================================================================
// 公開
// ============================================================================

module.exports = {
  buildLp: buildLp,
  decodeFlow: decodeFlow,
  solveSingleStock: solveSingleStock
};
