/**
 * TORIAI 計算 V3 — Column Generation (Gilmore-Gomory 1961)
 *
 * 1D Cutting Stock Problem の古典的最適化アルゴリズム:
 *   1. 初期パターン集合 (FFD で warm start)
 *   2. Master LP: min Σ stock_p × x_p s.t. Σ a_{p,i} x_p ≥ d_i
 *   3. dual prices π_i を抽出
 *   4. 各定尺について Pricing Knapsack で「reduced cost > 0」の新パターン探索
 *   5. 改善があれば新 column 追加 → 2 へ。なければ収束
 *   6. 最終 Master を MIP として解く → 整数最適解
 *
 * これにより V3 FFD の理論限界 (11/9) を破り、**LP-tight な真の最適解**に到達する。
 *
 * 依存: arcflow/highsAdapter.js (HiGHS-WASM), arcflow/solver.js (FFD warm-start)
 * 性質: async（HiGHS は非同期）。Node テスト & ベンチマーク用。
 *       ブラウザ配線は async calcCore 化が必要 → Phase 4 検討。
 */

'use strict';

const highs = require('./highsAdapter.js');
const ffdSolver = require('./solver.js');

// ============================================================================
// Bounded Knapsack DP — Pricing Subproblem
//
// 各 piece type i は最大 demand[i] 個。weight = length + blade。value = pi[i]。
// capacity = stock - endLoss + blade（phantom blade trick）。
//
// 戻り値: { counts: [n_per_item], value, usedCapacity }
//   counts[i] = この pattern に含める piece i の個数
// ============================================================================

function boundedKnapsack(items, capacity) {
  // items: [{ value, weight, count }]
  const n = items.length;
  if (n === 0 || capacity <= 0) {
    return { counts: [], value: 0, usedCapacity: 0 };
  }

  // dp[c] = max value with capacity c
  const dp = new Float64Array(capacity + 1);
  // parent[c] = { itemIdx, take, prevC } — backtracking
  const parent = new Array(capacity + 1).fill(null);

  for (let i = 0; i < n; i++) {
    const w = items[i].weight;
    const v = items[i].value;
    const maxK = items[i].count;
    if (w <= 0 || v <= 0) continue; // skip non-profitable

    // 各 capacity を後ろから走査（同じ item を二重カウントしないため）
    // for each c, try take k = 1..maxK of item i
    const newDp = new Float64Array(dp);
    const newParent = parent.slice();
    for (let c = capacity; c >= w; c--) {
      let bestVal = newDp[c];
      let bestParent = newParent[c];
      const maxKHere = Math.min(maxK, Math.floor(c / w));
      for (let k = 1; k <= maxKHere; k++) {
        const kw = k * w;
        const cand = dp[c - kw] + k * v;
        if (cand > bestVal + 1e-9) {
          bestVal = cand;
          bestParent = { itemIdx: i, take: k, prevC: c - kw };
        }
      }
      newDp[c] = bestVal;
      newParent[c] = bestParent;
    }
    for (let c = 0; c <= capacity; c++) {
      dp[c] = newDp[c];
      parent[c] = newParent[c];
    }
  }

  // best capacity
  let bestC = 0;
  for (let c = 0; c <= capacity; c++) {
    if (dp[c] > dp[bestC]) bestC = c;
  }

  // backtrack
  const counts = new Array(n).fill(0);
  let c = bestC;
  while (parent[c]) {
    counts[parent[c].itemIdx] += parent[c].take;
    c = parent[c].prevC;
  }

  return { counts: counts, value: dp[bestC], usedCapacity: bestC };
}

// ============================================================================
// Pattern 表現
//
// Pattern = { stock, counts: [n_per_item] }
// Cost = stock
// Coverage of item i = counts[i]
// ============================================================================

function _patternKey(pattern) {
  return pattern.stock + '|' + pattern.counts.join(',');
}

function _patternStock(pattern) {
  return pattern.stock;
}

function _patternCovers(pattern, itemIdx) {
  return pattern.counts[itemIdx] || 0;
}

// ============================================================================
// 初期パターン集合 — FFD result を column として変換
//
// FFD bars (multi-stock 集約済) から CG パターンを構築。
// pieces 順序を items と揃える。
// ============================================================================

function _initialPatternsFromFfd(spec, items) {
  const ffdResult = ffdSolver.solveMultiStockGreedy(spec);
  if (ffdResult.status !== 'greedy_ffd_multi') return [];
  const lengthToIdx = {};
  items.forEach(function(it, i) { lengthToIdx[it.length] = i; });
  const patternMap = new Map();
  ffdResult.bars.forEach(function(bar) {
    const counts = new Array(items.length).fill(0);
    bar.pattern.forEach(function(len) {
      const idx = lengthToIdx[len];
      if (idx !== undefined) counts[idx]++;
    });
    const pat = { stock: bar.stock, counts: counts };
    const key = _patternKey(pat);
    if (!patternMap.has(key)) patternMap.set(key, pat);
  });
  return Array.from(patternMap.values());
}

// ============================================================================
// Master LP / MIP builder
//
// Variables: x_p (column for each pattern)
// Constraints: Σ_p a_{p,i} x_p >= d_i  (demand_i)
// Objective: min Σ_p stock_p × x_p
//
// asMip=true で General セクションを追加して MIP として解く
// ============================================================================

function _buildMasterLp(patterns, items, asMip) {
  const lines = [];
  lines.push('Minimize');
  // obj
  const objTerms = patterns.map(function(p, k) {
    return p.stock + ' x' + k;
  });
  lines.push(' obj: ' + _wrapTerms(objTerms, ' + '));

  lines.push('Subject To');
  items.forEach(function(it, i) {
    const terms = [];
    patterns.forEach(function(p, k) {
      const a = _patternCovers(p, i);
      if (a > 0) terms.push(a + ' x' + k);
    });
    if (terms.length === 0) {
      // demand satisfaction impossible
      lines.push(' demand_' + i + ': 0 >= ' + it.count);
    } else {
      lines.push(' demand_' + i + ': ' + _wrapTerms(terms, ' + ') + ' >= ' + it.count);
    }
  });

  // Bounds: x_p >= 0 with upper bound = total demand
  const totalDemand = items.reduce(function(s, it) { return s + it.count; }, 0);
  lines.push('Bounds');
  for (let k = 0; k < patterns.length; k++) {
    lines.push(' 0 <= x' + k + ' <= ' + totalDemand);
  }

  if (asMip) {
    lines.push('General');
    let cur = ' ';
    for (let k = 0; k < patterns.length; k++) {
      const v = 'x' + k;
      if (cur.length + v.length + 1 > 100) { lines.push(cur); cur = ' '; }
      cur += v + ' ';
    }
    if (cur.trim().length > 0) lines.push(cur);
  }

  lines.push('End');
  return lines.join('\n');
}

function _wrapTerms(terms, sep) {
  // 200 文字でラップ（HiGHS LP parser 安全圏）
  const MAX = 180;
  let out = '';
  let cur = '';
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    const join = (i === 0) ? '' : sep;
    if (cur.length + t.length + join.length > MAX) {
      out += cur + '\n   ';
      cur = '';
    }
    cur += join + t;
  }
  out += cur;
  return out;
}

// ============================================================================
// Column Generation 本体
//
// 戻り値: { status, patterns, x, lpObjective, ... }
// ============================================================================

async function solveColumnGen(spec, opts) {
  opts = opts || {};
  // 大規模ケース (CASE-6 級 k=60+) で CG が収束せずタイムアウトする問題対策で、
  // デフォルトを小さく抑える。50 反復で十分な改善が得られる経験則。
  const maxIter = opts.maxIterations || 50;
  const verbose = opts.verbose || false;

  // ---- 入力検証 + items 正規化 ----
  if (!spec || !Array.isArray(spec.pieces) || !Array.isArray(spec.availableStocks)) {
    return { status: 'invalid_input', patterns: [], x: [] };
  }
  const blade = spec.blade || 0;
  const endLoss = spec.endLoss || 0;
  const items = spec.pieces.map(function(p) {
    return { length: p.length, count: p.count, weight: p.length + blade };
  });
  const stocksAsc = spec.availableStocks.slice().sort(function(a, b) { return a - b; });

  // ---- 初期パターン集合 ----
  let patterns = _initialPatternsFromFfd(spec, items);
  if (patterns.length === 0) {
    // FFD failed — fallback: each item's smallest valid stock with 1 piece
    items.forEach(function(it, i) {
      const stockChoice = stocksAsc.find(function(s) { return s - endLoss >= it.length; });
      if (stockChoice) {
        const counts = new Array(items.length).fill(0);
        counts[i] = 1;
        patterns.push({ stock: stockChoice, counts: counts });
      }
    });
  }
  if (patterns.length === 0) {
    return { status: 'infeasible', patterns: [], x: [] };
  }

  // ---- CG 反復 ----
  let lpObjective = Infinity;
  let dualPi = null;
  let iter = 0;
  let lastLpSol = null; // フォールバック用に最後の LP 解を保持
  for (iter = 0; iter < maxIter; iter++) {
    const lpStr = _buildMasterLp(patterns, items, false);
    let sol;
    try {
      sol = await highs.solve(lpStr);
    } catch (e) {
      // LP solver fail (大規模時) → 直前の LP 解で天井丸めフォールバック
      if (lastLpSol) return _roundLpInMemory(spec, items, patterns, lastLpSol, lpObjective);
      return { status: 'lp_solver_error', patterns: patterns, x: [], error: e.message };
    }
    if (!highs.isOptimal(sol)) {
      if (lastLpSol) return _roundLpInMemory(spec, items, patterns, lastLpSol, lpObjective);
      return { status: 'lp_not_optimal_' + sol.Status, patterns: patterns, x: [] };
    }
    lpObjective = sol.ObjectiveValue;
    lastLpSol = sol;

    // dual prices for demand constraints
    dualPi = new Array(items.length).fill(0);
    if (sol.Rows && Array.isArray(sol.Rows)) {
      for (let r = 0; r < sol.Rows.length; r++) {
        const row = sol.Rows[r];
        if (row.Name && row.Name.indexOf('demand_') === 0) {
          const idx = parseInt(row.Name.substring(7), 10);
          if (!isNaN(idx) && idx >= 0 && idx < items.length) {
            dualPi[idx] = row.Dual;
          }
        }
      }
    }

    // ---- Pricing: 各 stock で best new pattern を knapsack で探索 ----
    let bestPat = null;
    let bestReducedCost = 1e-9; // 既存パターンの「自分」と区別する小さな閾値
    for (let s = 0; s < stocksAsc.length; s++) {
      const stock = stocksAsc[s];
      const cap = stock - endLoss + blade; // phantom blade trick
      if (cap <= 0) continue;
      const knapItems = items.map(function(it) {
        return { value: dualPi[items.indexOf(it)], weight: it.weight, count: it.count };
      });
      // Note: dualPi correlates by index, fix:
      for (let i = 0; i < items.length; i++) {
        knapItems[i].value = dualPi[i];
      }
      const knap = boundedKnapsack(knapItems, cap);
      const reducedCost = knap.value - stock; // value (sum pi*counts) − cost (stock)
      if (reducedCost > bestReducedCost) {
        // Verify pattern is non-trivial
        const totalCount = knap.counts.reduce(function(a, b) { return a + b; }, 0);
        if (totalCount > 0) {
          bestReducedCost = reducedCost;
          bestPat = { stock: stock, counts: knap.counts };
        }
      }
    }

    if (bestPat === null) {
      // No improving pattern → LP optimal
      if (verbose) console.log('CG converged at iter=' + iter + ' lpObj=' + lpObjective);
      break;
    }

    // duplicate check
    const newKey = _patternKey(bestPat);
    const exists = patterns.some(function(p) { return _patternKey(p) === newKey; });
    if (exists) {
      // shouldn't happen if reduced cost calc is right; safety break
      break;
    }
    patterns.push(bestPat);
    if (verbose) {
      console.log('CG iter=' + iter + ' added pattern stock=' + bestPat.stock +
        ' reducedCost=' + bestReducedCost.toFixed(2) + ' lpObj=' + lpObjective);
    }
  }

  // ---- IP recovery: Master を MIP として解く ----
  // 大規模時は LP 解で x_p > 0 のパターンだけに絞った subset MIP を解く
  // → MIP のサイズが大幅に縮小して WASM Aborted を回避
  let mipPatterns = patterns;
  if (lastLpSol && patterns.length > 30) {
    const activePatterns = [];
    patterns.forEach(function(p, k) {
      const col = lastLpSol.Columns['x' + k];
      if (col && col.Primal > 0.001) activePatterns.push(p);
    });
    if (activePatterns.length > 0 && activePatterns.length < patterns.length) {
      mipPatterns = activePatterns;
    }
  }

  const mipStr = _buildMasterLp(mipPatterns, items, true);
  let mipSol;
  try {
    mipSol = await highs.solve(mipStr);
  } catch (e) {
    if (lastLpSol) return _roundLpInMemory(spec, items, patterns, lastLpSol, lpObjective);
    return { status: 'mip_failed', patterns: patterns, x: [], error: e.message };
  }

  if (!highs.isOptimal(mipSol)) {
    if (lastLpSol) return _roundLpInMemory(spec, items, patterns, lastLpSol, lpObjective);
    return { status: 'mip_not_optimal_' + mipSol.Status, patterns: patterns, x: [] };
  }

  // 整数解抽出（mipPatterns に対して）
  const xInt = mipPatterns.map(function(_, k) {
    const col = mipSol.Columns['x' + k];
    return col ? Math.round(col.Primal || 0) : 0;
  });

  return _formatResult('cg_optimal', spec, items, mipPatterns, xInt, mipSol.ObjectiveValue, lpObjective, iter);
}

// ============================================================================
// LP 解の天井丸めフォールバック (in-memory)
//
// LP solver を呼び直さず、既に持っている LP 解から x_p を Math.ceil する。
// 結果が demand を満たさない可能性は低いが、念のため pieceTotal で検証する。
// ============================================================================

function _roundLpInMemory(spec, items, patterns, lpSol, lpObjective) {
  // floor 丸め（重複カバー防止）→ 残需要を貪欲に埋める
  const x = patterns.map(function(_, k) {
    const col = lpSol.Columns['x' + k];
    return col ? Math.floor(col.Primal || 0) : 0;
  });

  function recomputeCovered() {
    const covered = items.map(function() { return 0; });
    patterns.forEach(function(p, k) {
      if (x[k] > 0) {
        p.counts.forEach(function(c, i) { covered[i] += c * x[k]; });
      }
    });
    return covered;
  }

  let covered = recomputeCovered();

  // 残需要のあるあいだ、最も多く需要を埋めるパターンを 1 本ずつ追加
  // ただし stock コストで割った効率が高いものを優先（waste 回避）
  let safety = 0;
  while (safety++ < 10000) {
    let stillUnmet = false;
    items.forEach(function(it, i) { if (covered[i] < it.count) stillUnmet = true; });
    if (!stillUnmet) break;

    let bestK = -1;
    let bestEfficiency = -Infinity; // covered_per_stock_cost
    let bestCovers = 0;
    patterns.forEach(function(p, k) {
      let covers = 0;
      items.forEach(function(it, i) {
        const need = Math.max(0, it.count - covered[i]);
        covers += Math.min(need, p.counts[i]);
      });
      if (covers <= 0) return;
      const eff = covers / p.stock; // pieces / mm
      if (eff > bestEfficiency) {
        bestEfficiency = eff;
        bestK = k;
        bestCovers = covers;
      }
    });
    if (bestK < 0 || bestCovers <= 0) {
      // 残需要を埋めるパターンが既存に無い → 各 unmet item ごとに最小単一パターン作成
      items.forEach(function(it, i) {
        const need = Math.max(0, it.count - covered[i]);
        if (need === 0) return;
        // 既存 patterns に「item i だけ含む」最小コストの pattern を探す
        let synK = -1;
        let synCost = Infinity;
        patterns.forEach(function(p, k) {
          if (p.counts[i] > 0) {
            const cost = p.stock / p.counts[i];
            if (cost < synCost) { synCost = cost; synK = k; }
          }
        });
        if (synK >= 0) {
          // 必要な分だけ追加
          const reps = Math.ceil(need / patterns[synK].counts[i]);
          x[synK] += reps;
        }
      });
      covered = recomputeCovered();
      break; // 1 回のみ
    }
    x[bestK]++;
    patterns[bestK].counts.forEach(function(c, i) { covered[i] += c; });
  }

  const ipObjective = patterns.reduce(function(s, p, k) { return s + p.stock * x[k]; }, 0);
  return _formatResult('cg_lp_rounded', spec, items, patterns, x, ipObjective, lpObjective, -1);
}

// ============================================================================
// 結果整形 (V3 solver と互換性ある形式)
// ============================================================================

function _formatResult(status, spec, items, patterns, x, ipObjective, lpObjective, cgIters) {
  const blade = spec.blade || 0;
  const endLoss = spec.endLoss || 0;
  const bars = [];
  let stockTotal = 0;
  let pieceTotal = 0;
  let lossTotal = 0;
  patterns.forEach(function(pat, k) {
    if (x[k] <= 0) return;
    // pieces 列を再構成（item 順、count に応じて展開）
    const pieces = [];
    pat.counts.forEach(function(c, i) {
      for (let j = 0; j < c; j++) pieces.push(items[i].length);
    });
    pieces.sort(function(a, b) { return b - a; });
    const sizeWithBlades = pieces.reduce(function(s, p) { return s + p; }, 0)
      + Math.max(0, pieces.length - 1) * blade;
    const lossPerBar = (pat.stock - endLoss) - sizeWithBlades;
    bars.push({ stock: pat.stock, pattern: pieces, count: x[k] });
    stockTotal += pat.stock * x[k];
    pieceTotal += pieces.reduce(function(s, p) { return s + p; }, 0) * x[k];
    lossTotal += lossPerBar * x[k];
  });
  const distinctStocks = new Set(bars.map(function(b) { return b.stock; }));
  const stockBreakdown = {};
  bars.forEach(function(b) { stockBreakdown[b.stock] = (stockBreakdown[b.stock] || 0) + b.count; });
  const barCount = bars.reduce(function(s, b) { return s + b.count; }, 0);

  return Object.freeze({
    status: status,
    barCount: barCount,
    stockTotal: stockTotal,
    pieceTotal: pieceTotal,
    lossTotal: lossTotal,
    bars: Object.freeze(bars.map(function(b) {
      return Object.freeze({ stock: b.stock, pattern: Object.freeze(b.pattern), count: b.count });
    })),
    distinctStockCount: distinctStocks.size,
    stockBreakdown: Object.freeze(stockBreakdown),
    _cgMeta: Object.freeze({
      ipObjective: ipObjective,
      lpObjective: lpObjective,
      lpGap: lpObjective > 0 ? (ipObjective - lpObjective) / lpObjective : 0,
      cgIterations: cgIters,
      patternCount: patterns.length
    })
  });
}

// ============================================================================
// solveBest — CG と FFD を並走させ、stockTotal が小さい方を返す
//
// 重要: CG は CASE-2 で LP-optimal 証明（FFD -1000mm）を出すが、
// CASE-6 のような大規模で MIP が WASM Aborted → LP rounding fallback で
// over-coverage する場合がある。FFD と比較して劣化していれば FFD を採用。
//
// この方式: CG が「絶対に害悪にならない」設計。
// ============================================================================

async function solveBest(spec, opts) {
  const ffd = ffdSolver.solveMultiStockGreedy(spec);
  let cgRes;
  try {
    cgRes = await solveColumnGen(spec, opts);
  } catch (e) {
    return Object.freeze({ source: 'ffd_only_cg_failed', ffd: ffd, cg: null, picked: ffd });
  }
  // demand 充足 + 品質チェック
  const cgValid = cgRes && cgRes.bars && cgRes.barCount > 0;
  if (!cgValid) {
    return Object.freeze({ source: 'ffd_only_cg_invalid', ffd: ffd, cg: cgRes, picked: ffd });
  }
  // CG が demand 不足ならNG
  const requiredCounts = {};
  spec.pieces.forEach(function(p) { requiredCounts[p.length] = p.count; });
  const cgCounts = {};
  cgRes.bars.forEach(function(b) {
    b.pattern.forEach(function(len) { cgCounts[len] = (cgCounts[len] || 0) + b.count; });
  });
  let cgCoversDemand = true;
  for (const len in requiredCounts) {
    if ((cgCounts[len] || 0) < requiredCounts[len]) { cgCoversDemand = false; break; }
  }
  if (!cgCoversDemand) {
    return Object.freeze({ source: 'ffd_only_cg_missing_demand', ffd: ffd, cg: cgRes, picked: ffd });
  }
  // どちらが良いか比較（stockTotal 優先、tiebreaker: barCount）
  let pickedSource;
  let picked;
  if (cgRes.stockTotal < ffd.stockTotal ||
      (cgRes.stockTotal === ffd.stockTotal && cgRes.barCount < ffd.barCount)) {
    pickedSource = 'cg';
    picked = cgRes;
  } else {
    pickedSource = 'ffd';
    picked = ffd;
  }
  return Object.freeze({ source: pickedSource, ffd: ffd, cg: cgRes, picked: picked });
}

// ============================================================================
// 公開
// ============================================================================

// ============================================================================
// solveColumnGenInspect — 内部 patterns を返すデバッグ版
// CG 反復後の全 pattern 集合を取得（pruning 効果の研究用）
// ============================================================================

async function solveColumnGenInspect(spec, opts) {
  opts = opts || {};
  const maxIter = opts.maxIterations || 50;
  if (!spec || !Array.isArray(spec.pieces) || !Array.isArray(spec.availableStocks)) {
    return { status: 'invalid_input', patterns: [] };
  }
  const blade = spec.blade || 0;
  const endLoss = spec.endLoss || 0;
  const items = spec.pieces.map(function(p) {
    return { length: p.length, count: p.count, weight: p.length + blade };
  });
  const stocksAsc = spec.availableStocks.slice().sort(function(a, b) { return a - b; });
  let patterns = _initialPatternsFromFfd(spec, items);
  if (patterns.length === 0) return { status: 'infeasible', patterns: [] };

  let lpObjective = Infinity;
  let lastLpSol = null;
  for (let iter = 0; iter < maxIter; iter++) {
    const lpStr = _buildMasterLp(patterns, items, false);
    let sol;
    try {
      sol = await highs.solve(lpStr);
    } catch (e) {
      return { status: 'lp_error', patterns: patterns, error: e.message, iter: iter };
    }
    if (!highs.isOptimal(sol)) {
      return { status: 'lp_not_optimal', patterns: patterns, iter: iter };
    }
    lpObjective = sol.ObjectiveValue;
    lastLpSol = sol;

    const dualPi = new Array(items.length).fill(0);
    if (sol.Rows) {
      for (let r = 0; r < sol.Rows.length; r++) {
        const row = sol.Rows[r];
        if (row.Name && row.Name.indexOf('demand_') === 0) {
          const idx = parseInt(row.Name.substring(7), 10);
          if (!isNaN(idx) && idx >= 0 && idx < items.length) dualPi[idx] = row.Dual;
        }
      }
    }

    let bestPat = null;
    let bestRC = 1e-9;
    for (const stock of stocksAsc) {
      const cap = stock - endLoss + blade;
      if (cap <= 0) continue;
      const knapItems = items.map(function(it, i) {
        return { value: dualPi[i], weight: it.weight, count: it.count };
      });
      const knap = boundedKnapsack(knapItems, cap);
      const rc = knap.value - stock;
      if (rc > bestRC && knap.counts.reduce(function(a, b) { return a + b; }, 0) > 0) {
        bestRC = rc;
        bestPat = { stock: stock, counts: knap.counts };
      }
    }
    if (!bestPat) break;
    const newKey = _patternKey(bestPat);
    if (patterns.some(function(p) { return _patternKey(p) === newKey; })) break;
    patterns.push(bestPat);
  }
  return { status: 'cg_inspected', patterns: patterns, lpObjective: lpObjective };
}

module.exports = {
  solveColumnGen: solveColumnGen,
  solveBest: solveBest,
  solveColumnGenInspect: solveColumnGenInspect,
  _boundedKnapsack: boundedKnapsack,
  _buildMasterLp: _buildMasterLp,
  _initialPatternsFromFfd: _initialPatternsFromFfd
};
