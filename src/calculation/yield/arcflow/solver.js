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
// FFD (First Fit Decreasing) — 純 JS フォールバックパッカー
//
// HiGHS-WASM が中規模 MIP で Aborted する (BUG-V3-001) 場合のセーフティネット。
// LP 緩和も使えない最悪ケースで最低限の解を返す。
//
// アルゴリズム:
//   1. 全 piece をフラット展開して長い順にソート
//   2. 各 piece について「すでに開いてるバーで入る最初のもの」に詰める
//   3. 入らなければ新しいバーを開ける
//   4. 同パターンのバーを集約
//
// 性質:
//   - 必ず終わる（線形時間）
//   - 解の品質: 最適の 11/9 倍以下（FFD の理論限界、Johnson 1973）
//   - 単一定尺前提
// ============================================================================

function ffdPack(spec) {
  const eff = spec.stock - spec.endLoss;
  const blade = spec.blade;
  // フラット展開 + 降順ソート
  const flat = [];
  for (const p of spec.pieces) {
    for (let i = 0; i < p.count; i++) flat.push(p.length);
  }
  flat.sort(function(a, b) { return b - a; });

  const bars = []; // each: { used, pieces: [length] }

  for (const len of flat) {
    let placed = false;
    for (const bar of bars) {
      const cost = bar.pieces.length === 0 ? len : len + blade;
      if (bar.used + cost <= eff) {
        bar.used += cost;
        bar.pieces.push(len);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // 新規バー（piece 単独）
      if (len > eff) {
        // この piece は単体ですら入らない → 制約違反、空配列を返す
        return [];
      }
      bars.push({ used: len, pieces: [len] });
    }
  }

  // 同パターン集約
  const patternMap = new Map();
  for (const bar of bars) {
    const sorted = bar.pieces.slice().sort(function(a, b) { return b - a; });
    const key = sorted.join(',');
    if (!patternMap.has(key)) {
      patternMap.set(key, { pieces: sorted, count: 0 });
    }
    patternMap.get(key).count++;
  }
  return Array.from(patternMap.values());
}

function summarizeBars(spec, bars, status) {
  const stockTotal = bars.reduce(function(s, b) { return s + b.count * spec.stock; }, 0);
  const pieceTotal = spec.pieces.reduce(function(s, p) { return s + p.length * p.count; }, 0);
  const lossTotal = bars.reduce(function(s, b) {
    const used = b.pieces.reduce(function(a, x) { return a + x; }, 0);
    const sizeWithBlades = b.pieces.length > 0 ? used + (b.pieces.length - 1) * spec.blade : 0;
    const lossPerBar = (spec.stock - spec.endLoss) - sizeWithBlades;
    return s + lossPerBar * b.count;
  }, 0);
  const barCount = bars.reduce(function(s, b) { return s + b.count; }, 0);
  const barsWithStock = bars.map(function(b) {
    return Object.freeze({
      stock: spec.stock,
      pattern: Object.freeze(b.pieces.slice()),
      count: b.count
    });
  });
  return Object.freeze({
    status: status,
    barCount: barCount,
    stockTotal: stockTotal,
    pieceTotal: pieceTotal,
    lossTotal: lossTotal,
    bars: Object.freeze(barsWithStock)
  });
}

/**
 * solveSingleStockGreedy — FFD のみで解く（HiGHS 不使用）。
 * status は常に 'greedy_ffd'。HiGHS が落ちる規模でも必ず動く。
 */
function solveSingleStockGreedy(spec) {
  // Greedy は安全網。throw せず最低限の防御だけ行い、無理なら infeasible を返す
  if (!spec || !Array.isArray(spec.pieces) || spec.pieces.length === 0
    || !(spec.stock > 0) || !(spec.stock - (spec.endLoss || 0) > 0)) {
    return Object.freeze({
      status: 'infeasible',
      barCount: 0, stockTotal: 0, pieceTotal: 0, lossTotal: 0,
      bars: Object.freeze([])
    });
  }
  const bars = ffdPack(spec);
  if (bars.length === 0) {
    return Object.freeze({
      status: 'infeasible',
      barCount: 0, stockTotal: 0, pieceTotal: 0, lossTotal: 0,
      bars: Object.freeze([])
    });
  }
  return summarizeBars(spec, bars, 'greedy_ffd');
}

// ============================================================================
// solveSingleStockRobust — 3 段階フォールバック
//
//   1. MIP (solveSingleStock): 最適だが中規模で Aborted
//   2. (将来) LP 緩和 + 整数化: Phase 2 day-5 で追加予定
//   3. FFD (solveSingleStockGreedy): 必ず動く
//
// status:
//   'optimal'     : MIP 成功
//   'greedy_ffd'  : MIP が落ちて FFD で解いた（最適とは限らない）
//   'infeasible'  : 物理的に解不能（piece 1 個が定尺に入らない等）
// ============================================================================

async function solveSingleStockRobust(spec) {
  // Step 1: MIP を試す
  try {
    const mip = await solveSingleStock(spec);
    if (mip.status === 'optimal') return mip;
    // MIP が optimal 以外を返した → fallback へ
  } catch (e) {
    // HiGHS-WASM の Aborted / null function 等は throw される → catch して fallback
  }
  // Step 3: FFD（LP fallback は day-5 で追加予定）
  return solveSingleStockGreedy(spec);
}

// ============================================================================
// Phase 2 day-5 — Multi-stock FFD
//
// 複数定尺対応のフォールバック。Multi-stock MIP は LP 規模が単一の n_stocks 倍で
// BUG-V3-001 を悪化させるので、まず FFD で実用解を出す（MIP 化は day-7+）。
//
// 入力:
//   spec = { blade, endLoss, pieces, availableStocks: [s1, s2, ...] }
//
// アルゴリズム:
//   1. piece を降順ソート、定尺を昇順ソート
//   2. 各 piece に対し、既存バーに first-fit
//   3. 入らなければ「入る最小定尺」で新規バー開設
//      → 「最後の数本に短い定尺を当てる」最適化が自然発生（BUG-V2-001 の根治パターン）
//   4. (stock, pattern) で集約
//
// 性質:
//   - 必ず終わる（線形時間）
//   - 単一定尺 FFD よりほぼ確実に優れる（短い定尺で端材削減可）
//   - 単一定尺に縮退しない（BUG-V2-002 の構造的回避）
// ============================================================================

// 内部: 単一戦略で BFD パッキング
//   strategy = 'maxStock' | 'smartStock'
//     maxStock: 新規バーは常に最大定尺で開く（heterogeneous 入力で強い）
//     smartStock: 新規バーは stock/pieces-per-bar 比率が最小の定尺で開く（homogeneous 入力で強い）
function _ffdPackOneStrategy(spec, strategy) {
  const blade = spec.blade;
  const endLoss = spec.endLoss;
  const stocksAsc = spec.availableStocks.slice().sort(function(a, b) { return a - b; });
  const maxStock = stocksAsc[stocksAsc.length - 1];

  const flat = [];
  for (const p of spec.pieces) {
    for (let i = 0; i < p.count; i++) flat.push(p.length);
  }
  flat.sort(function(a, b) { return b - a; });

  const maxEff = maxStock - endLoss;
  for (const len of flat) {
    if (len > maxEff) return [];
  }

  function chooseNewBarStock(len) {
    if (strategy === 'maxStock') return maxStock;
    let chosen = maxStock;
    let bestRatio = Infinity;
    for (const s of stocksAsc) {
      if (s - endLoss < len) continue;
      const piecesPerBar = Math.floor((s - endLoss + blade) / (len + blade));
      if (piecesPerBar === 0) continue;
      const ratio = s / piecesPerBar;
      if (ratio < bestRatio) {
        bestRatio = ratio;
        chosen = s;
      }
    }
    return chosen;
  }

  const bars = [];
  for (const len of flat) {
    let bestIdx = -1;
    let bestRemain = Infinity;
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      const cost = bar.pieces.length === 0 ? len : len + blade;
      const eff = bar.stock - endLoss;
      const remainAfter = eff - bar.used - cost;
      if (remainAfter >= 0 && remainAfter < bestRemain) {
        bestRemain = remainAfter;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      const bar = bars[bestIdx];
      const cost = bar.pieces.length === 0 ? len : len + blade;
      bar.used += cost;
      bar.pieces.push(len);
    } else {
      bars.push({ stock: chooseNewBarStock(len), used: len, pieces: [len] });
    }
  }

  // Pass 2: downsize
  for (const bar of bars) {
    for (const s of stocksAsc) {
      if (s - endLoss >= bar.used) {
        bar.stock = s;
        break;
      }
    }
  }

  return bars;
}

function _aggregateBars(rawBars) {
  const map = new Map();
  for (const bar of rawBars) {
    const sorted = bar.pieces.slice().sort(function(a, b) { return b - a; });
    const key = bar.stock + '|' + sorted.join(',');
    if (!map.has(key)) {
      map.set(key, { stock: bar.stock, pieces: sorted, count: 0 });
    }
    map.get(key).count++;
  }
  return Array.from(map.values());
}

function _stockTotal(bars) {
  return bars.reduce(function(s, b) { return s + b.count * b.stock; }, 0);
}

function _barCount(bars) {
  return bars.reduce(function(s, b) { return s + b.count; }, 0);
}

/**
 * 2 つの解を比較してより良い方を返す。
 *   - 母材総量の差が 5% 以上 → 母材優先
 *   - それ以外（同等） → バー本数優先（handling コスト削減）
 *
 * このルールにより:
 *   - 1222×333 のような均質入力: smartStock が母材 -6.5% で勝つ
 *   - CASE-2 / CASE-6: 母材差 < 1% → barCount 少ない maxStock が勝つ
 */
function _pickBetter(aggA, aggB) {
  const stA = _stockTotal(aggA);
  const stB = _stockTotal(aggB);
  const bcA = _barCount(aggA);
  const bcB = _barCount(aggB);
  const stockMin = Math.min(stA, stB);
  if (stockMin > 0 && Math.abs(stA - stB) / stockMin > 0.05) {
    return stA <= stB ? aggA : aggB;
  }
  return bcA <= bcB ? aggA : aggB;
}

// ============================================================================
// Local Search 後処理: バー削減
//
// FFD 結果に対し「このバーの中身を他のバーの空きスペースに分散できるか？」を試す。
// できれば そのバーを削除（1 本削減）。理論的にバー本数の改善余地がある場合に有効。
//
// 対象: 「使用率の低いバー」を優先的にチェック (削除しやすい)
// 計算量: O(N² × maxPiecesPerBar) — N=バー数、実用的サイズで十分速い
// ============================================================================

function _canRedistribute(donorPieces, otherBars, blade, endLoss) {
  // donorPieces を otherBars の空きスペースに first-fit decreasing で配置試行
  const piecesDesc = donorPieces.slice().sort(function(a, b) { return b - a; });
  const tempBars = otherBars.map(function(b) {
    return { stock: b.stock, used: b.used, count: b.pieces.length };
  });
  for (let i = 0; i < piecesDesc.length; i++) {
    const piece = piecesDesc[i];
    let bestIdx = -1;
    let bestRemain = Infinity;
    for (let j = 0; j < tempBars.length; j++) {
      const tb = tempBars[j];
      const cost = tb.count === 0 ? piece : piece + blade;
      const eff = tb.stock - endLoss;
      const remain = eff - tb.used - cost;
      if (remain >= 0 && remain < bestRemain) {
        bestRemain = remain;
        bestIdx = j;
      }
    }
    if (bestIdx < 0) return false; // この piece が入らない
    const tb = tempBars[bestIdx];
    tb.used += (tb.count === 0 ? piece : piece + blade);
    tb.count++;
  }
  return true;
}

function _redistributeInto(donorPieces, otherBars, blade, endLoss) {
  // 実際に donor を消して otherBars に配置（_canRedistribute と同じロジック、副作用あり版）
  const piecesDesc = donorPieces.slice().sort(function(a, b) { return b - a; });
  for (let i = 0; i < piecesDesc.length; i++) {
    const piece = piecesDesc[i];
    let bestIdx = -1;
    let bestRemain = Infinity;
    for (let j = 0; j < otherBars.length; j++) {
      const tb = otherBars[j];
      const cost = tb.pieces.length === 0 ? piece : piece + blade;
      const eff = tb.stock - endLoss;
      const remain = eff - tb.used - cost;
      if (remain >= 0 && remain < bestRemain) {
        bestRemain = remain;
        bestIdx = j;
      }
    }
    if (bestIdx < 0) return false;
    const tb = otherBars[bestIdx];
    const cost = tb.pieces.length === 0 ? piece : piece + blade;
    tb.used += cost;
    tb.pieces.push(piece);
  }
  return true;
}

function _localSearchEliminate(rawBars, blade, endLoss, stocksAsc) {
  if (rawBars.length <= 1) return rawBars;
  const bars = rawBars.map(function(b) {
    return { stock: b.stock, used: b.used, pieces: b.pieces.slice() };
  });
  let improved = true;
  let safety = 0;
  while (improved && safety++ < 1000) {
    improved = false;
    // 使用率（used / capacity）の低い順にトライ → 削除しやすい
    const sortedIdx = bars.map(function(b, i) {
      const eff = b.stock - endLoss;
      return { i: i, ratio: eff > 0 ? b.used / eff : 1 };
    }).sort(function(a, b) { return a.ratio - b.ratio; });

    for (let k = 0; k < sortedIdx.length; k++) {
      const cand = bars[sortedIdx[k].i];
      const others = bars.filter(function(_, j) { return j !== sortedIdx[k].i; });
      if (_canRedistribute(cand.pieces, others, blade, endLoss)) {
        // 実際に分散
        _redistributeInto(cand.pieces, others, blade, endLoss);
        // bars から削除
        bars.splice(sortedIdx[k].i, 1);
        improved = true;
        break; // 一つ削除したら最初からやり直し
      }
    }
  }
  // 最後に downsize (使用量に見合う最小定尺へ)
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    for (let s = 0; s < stocksAsc.length; s++) {
      if (stocksAsc[s] - endLoss >= bar.used) {
        bar.stock = stocksAsc[s];
        break;
      }
    }
  }
  return bars;
}

// 公開: 2 戦略を並走させ、各々に local search 適用後、_pickBetter で最良を選ぶ
//   maxStock 戦略: 多種 piece に強い (CASE-2 / CASE-6)
//   smartStock 戦略: 単一 piece に強い (1222×333 のような均質入力)
//   local search: 各戦略後にバー削減を試行 → さらに改善
function ffdPackMultiStock(spec) {
  const blade = spec.blade || 0;
  const endLoss = spec.endLoss || 0;
  const stocksAsc = (spec.availableStocks || []).slice().sort(function(a, b) { return a - b; });

  let rawA = _ffdPackOneStrategy(spec, 'maxStock');
  let rawB = _ffdPackOneStrategy(spec, 'smartStock');
  if (rawA.length > 0) rawA = _localSearchEliminate(rawA, blade, endLoss, stocksAsc);
  if (rawB.length > 0) rawB = _localSearchEliminate(rawB, blade, endLoss, stocksAsc);

  if (rawA.length === 0 && rawB.length === 0) return [];
  if (rawA.length === 0) return _aggregateBars(rawB);
  if (rawB.length === 0) return _aggregateBars(rawA);
  return _pickBetter(_aggregateBars(rawA), _aggregateBars(rawB));
}

function summarizeMultiStockBars(spec, bars, status) {
  const stockTotal = bars.reduce(function(s, b) { return s + b.count * b.stock; }, 0);
  const pieceTotal = spec.pieces.reduce(function(s, p) { return s + p.length * p.count; }, 0);
  const lossTotal = bars.reduce(function(s, b) {
    const used = b.pieces.reduce(function(a, x) { return a + x; }, 0);
    const sizeWithBlades = b.pieces.length > 0 ? used + (b.pieces.length - 1) * spec.blade : 0;
    const lossPerBar = (b.stock - spec.endLoss) - sizeWithBlades;
    return s + lossPerBar * b.count;
  }, 0);
  const barCount = bars.reduce(function(s, b) { return s + b.count; }, 0);
  const distinctStocks = new Set(bars.map(function(b) { return b.stock; }));
  // stockBreakdown: stock 長 → そのバー本数
  const stockBreakdown = {};
  bars.forEach(function(b) {
    stockBreakdown[b.stock] = (stockBreakdown[b.stock] || 0) + b.count;
  });
  const barsWithStock = bars.map(function(b) {
    return Object.freeze({
      stock: b.stock,
      pattern: Object.freeze(b.pieces.slice()),
      count: b.count
    });
  });
  return Object.freeze({
    status: status,
    barCount: barCount,
    stockTotal: stockTotal,
    pieceTotal: pieceTotal,
    lossTotal: lossTotal,
    bars: Object.freeze(barsWithStock),
    distinctStockCount: distinctStocks.size,
    stockBreakdown: Object.freeze(stockBreakdown)
  });
}

/**
 * solveMultiStockGreedy(spec) — 多定尺 FFD のみで解く
 * spec.availableStocks が必須
 */
function solveMultiStockGreedy(spec) {
  if (!spec || !Array.isArray(spec.pieces) || spec.pieces.length === 0
    || !Array.isArray(spec.availableStocks) || spec.availableStocks.length === 0) {
    return Object.freeze({
      status: 'infeasible',
      barCount: 0, stockTotal: 0, pieceTotal: 0, lossTotal: 0,
      bars: Object.freeze([]),
      distinctStockCount: 0,
      stockBreakdown: Object.freeze({})
    });
  }
  const bars = ffdPackMultiStock(spec);
  if (bars.length === 0) {
    return Object.freeze({
      status: 'infeasible',
      barCount: 0, stockTotal: 0, pieceTotal: 0, lossTotal: 0,
      bars: Object.freeze([]),
      distinctStockCount: 0,
      stockBreakdown: Object.freeze({})
    });
  }
  return summarizeMultiStockBars(spec, bars, 'greedy_ffd_multi');
}

/**
 * solveMultiStockRobust(spec) — 多定尺の堅牢版
 *
 * Phase 2 day-5 時点では multi-stock MIP を持たないので、FFD のみ。
 * Phase 2 day-7+ で multi-stock MIP を追加したらここに try/catch を挟む。
 */
async function solveMultiStockRobust(spec) {
  // 将来 multi-stock MIP が追加されたらここで try → catch → fallback
  return solveMultiStockGreedy(spec);
}

// ============================================================================
// 公開
// ============================================================================

module.exports = {
  // 単一定尺
  buildLp: buildLp,
  decodeFlow: decodeFlow,
  solveSingleStock: solveSingleStock,
  solveSingleStockGreedy: solveSingleStockGreedy,
  solveSingleStockRobust: solveSingleStockRobust,
  // 多定尺 (Phase 2 day-5)
  solveMultiStockGreedy: solveMultiStockGreedy,
  solveMultiStockRobust: solveMultiStockRobust,
  // 内部 helper をテスト用に露出
  _ffdPack: ffdPack,
  _ffdPackMultiStock: ffdPackMultiStock,
  _summarizeBars: summarizeBars,
  _summarizeMultiStockBars: summarizeMultiStockBars
};
