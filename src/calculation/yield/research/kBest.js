/**
 * TORIAI 計算 V3 — k-best 多様解列挙 (CSP)
 *
 * 設計 (RESEARCH_KBEST.md):
 *   1. CG で pattern 集合を確定
 *   2. MIP に no-good cut を加えて反復
 *   3. 各反復で前解と Hamming 距離 ≥ 1 の new 解を得る
 *   4. コスト許容範囲を超えたら打ち切り
 *
 * 用途: TORIAI で「最適解 + 代替プラン 2〜3 個」を提示する
 *
 * Node + Browser dual-mode。
 */

'use strict';

// dual-mode dependency resolver
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
var _bb = _resolveDep('../bb/branchAndBound.js', 'Toriai.calculation.yield.bb.branchAndBound');

// ============================================================================
// solveKBest(spec, k, opts) — k 個の near-optimal 解を返す
//
// spec: { pieces, availableStocks, blade?, endLoss? }
// k: 求める解の数（1〜10 程度）
// opts: {
//   tol?: number,         // 許容コスト増分比率 (default 0.05 = 5%)
//   bbTimeLimit?: number, // 各反復の B&B 時間制限 ms (default 10000)
//   verbose?: boolean
// }
// 戻り値: Promise<[
//   { x: number[], objective, bars, stockTotal, status, rank }
// ]>
// ============================================================================

async function solveKBest(spec, k, opts) {
  opts = opts || {};
  var tol = opts.tol != null ? opts.tol : 0.05;
  var bbTimeLimit = opts.bbTimeLimit != null ? opts.bbTimeLimit : 10000;
  var verbose = !!opts.verbose;

  // ---- 1) CG で pattern 集合を取得 ----
  // solveColumnGenInspect は CG 反復後の patterns + LP 値を返す
  var inspect = await _cg.solveColumnGenInspect(spec, { maxIterations: 30 });
  if (inspect.status !== 'cg_inspected' || !inspect.patterns || inspect.patterns.length === 0) {
    return [{ status: 'no_patterns', x: null, objective: NaN, bars: [], stockTotal: 0, rank: 1 }];
  }
  var patterns = inspect.patterns;
  var lpObjective = inspect.lpObjective;

  // ---- 2) base MIP を構築 ----
  var blade = spec.blade || 0;
  var items = spec.pieces.map(function(p) {
    return { length: p.length, count: p.count, weight: p.length + blade };
  });
  var baseMip = _buildMipFromPatterns(patterns, items);

  if (verbose) {
    console.log('[k-best] CG done: patterns=' + patterns.length + ' lp=' + lpObjective.toFixed(0));
  }

  // ---- 3) 反復で k 解列挙 ----
  var solutions = [];
  var currentMip = baseMip;
  var costLimit = Infinity;

  for (var i = 0; i < k; i++) {
    var bbRes;
    try {
      bbRes = _bb.solveMIP(currentMip, {
        timeLimit: bbTimeLimit,
        maxNodes: 50000
      });
    } catch (e) {
      if (verbose) console.log('[k-best] iter=' + (i + 1) + ' error: ' + e.message);
      break;
    }

    if (bbRes.status !== 'optimal' && bbRes.status !== 'timelimit' && bbRes.status !== 'nodelimit') {
      if (verbose) console.log('[k-best] iter=' + (i + 1) + ' status=' + bbRes.status + ' → 打ち切り');
      break;
    }
    if (!bbRes.x || !isFinite(bbRes.objective)) {
      if (verbose) console.log('[k-best] iter=' + (i + 1) + ' no x → 打ち切り');
      break;
    }

    // 1 解目で許容コスト上限を決める
    if (i === 0) {
      costLimit = bbRes.objective * (1 + tol);
    } else if (bbRes.objective > costLimit + 1e-6) {
      if (verbose) console.log('[k-best] iter=' + (i + 1) + ' obj=' + bbRes.objective + ' > limit=' + costLimit + ' → 打ち切り');
      break;
    }

    // 解抽出: original n 個分のみ (no-good で増えた y_p は捨てる)
    var n = patterns.length;
    var xInt = new Array(n);
    for (var p = 0; p < n; p++) xInt[p] = Math.round(bbRes.x[p] || 0);

    var formatted = _formatSolution(xInt, patterns, items, spec, bbRes.objective, i + 1);
    solutions.push(formatted);

    if (verbose) {
      console.log('[k-best] rank=' + (i + 1) + ' obj=' + bbRes.objective.toFixed(0)
        + ' bars=' + formatted.bars.length + ' nodes=' + bbRes.nodeCount);
    }

    // ---- 4) no-good cut を currentMip に追加 ----
    if (i < k - 1) {
      currentMip = _addNoGoodCut(currentMip, xInt, n);
    }
  }

  return solutions;
}

// ============================================================================
// _buildMipFromPatterns — patterns + items から MIP spec を構築
// ============================================================================

function _buildMipFromPatterns(patterns, items) {
  var n = patterns.length;
  var m = items.length;
  var c = new Array(n);
  for (var j = 0; j < n; j++) c[j] = patterns[j].stock;
  var A = [];
  for (var i = 0; i < m; i++) {
    var row = new Array(n).fill(0);
    for (var j2 = 0; j2 < n; j2++) row[j2] = patterns[j2].counts[i] || 0;
    A.push(row);
  }
  var b = items.map(function(it) { return it.count; });
  var types = items.map(function() { return '>='; });
  return {
    c: c, A: A, b: b, constraintTypes: types,
    integerVars: _range(n)
  };
}

// ============================================================================
// _addNoGoodCut — disjunctive no-good cut (binary big-M)
//
// 旧版 (y_p with epsilon cost) は y を膨らませて x = prevX のままを許す
// 致命的バグがあった。binary disjunction で正しく書き直し。
//
// 各 active pattern p (prevX[p] > 0) に binary z_p を導入:
//   z_p ∈ {0, 1}
//   z_p = 1 → x_p ≤ prevX[p] - 1  (big-M で line化)
//   Σ z_p ≥ 1                     (少なくとも 1 つ reduction)
//
// 「少なくとも 1 つの active pattern が strict 減少」を強制 →
// CSP の最適性保存により、これは「異なる解」の必要十分条件
// （prevX が optimal なら、different solution は必ず少なくとも 1 つの p で減少。
//   全部 ≥ なら cost が prevX 以上で strict 増加せず勝てない）
// ============================================================================

function _addNoGoodCut(mipSpec, prevX, nOrig) {
  // active pattern を抽出
  var active = [];
  for (var p = 0; p < nOrig; p++) {
    if (prevX[p] > 0) active.push(p);
  }
  if (active.length === 0) {
    // prevX が all zero、cut できない（理論上起きない）
    return mipSpec;
  }

  var totalCols = mipSpec.c.length;
  var numZ = active.length;
  var newCols = totalCols + numZ;

  // Big-M: x_p の安全な上界。総 demand 和を使う
  var M = 0;
  // mipSpec.b の最初の m 個は demand。簡易に sum * 2 を取れば十分大きい
  for (var i = 0; i < mipSpec.b.length && i < 100; i++) {
    if (mipSpec.b[i] > 0) M += mipSpec.b[i];
  }
  M = Math.max(100, M * 2);

  var newC = mipSpec.c.concat(new Array(numZ).fill(0));  // z には cost なし
  var newA = mipSpec.A.map(function(row) { return row.concat(new Array(numZ).fill(0)); });
  var newB = mipSpec.b.slice();
  var newTypes = mipSpec.constraintTypes.slice();

  // 制約 1: x_p + M × z_p ≤ prevX[p] - 1 + M  (∀ active p)
  //   z_p = 0 → x_p ≤ prevX[p] - 1 + M (M 大で実質非拘束)
  //   z_p = 1 → x_p ≤ prevX[p] - 1 (binding)
  for (var idx = 0; idx < numZ; idx++) {
    var pIdx = active[idx];
    var colZ = totalCols + idx;
    var row = new Array(newCols).fill(0);
    row[pIdx] = 1;
    row[colZ] = M;
    newA.push(row);
    newB.push(prevX[pIdx] - 1 + M);
    newTypes.push('<=');
  }

  // 制約 2: z_p ≤ 1  (binary upper bound)
  for (var idx2 = 0; idx2 < numZ; idx2++) {
    var colZ2 = totalCols + idx2;
    var row2 = new Array(newCols).fill(0);
    row2[colZ2] = 1;
    newA.push(row2);
    newB.push(1);
    newTypes.push('<=');
  }

  // 制約 3: Σ z_p ≥ 1
  var sumRow = new Array(newCols).fill(0);
  for (var idx3 = 0; idx3 < numZ; idx3++) {
    sumRow[totalCols + idx3] = 1;
  }
  newA.push(sumRow);
  newB.push(1);
  newTypes.push('>=');

  // z_p を integer vars に追加（binary は integer の特殊ケース、上界 1 で binary 化）
  var newIntegerVars = mipSpec.integerVars.slice();
  for (var idx4 = 0; idx4 < numZ; idx4++) {
    newIntegerVars.push(totalCols + idx4);
  }

  return {
    c: newC,
    A: newA,
    b: newB,
    constraintTypes: newTypes,
    integerVars: newIntegerVars
  };
}

// ============================================================================
// _formatSolution — x[] を bars 形式に整形
// ============================================================================

function _formatSolution(xInt, patterns, items, spec, objective, rank) {
  var blade = spec.blade || 0;
  var endLoss = spec.endLoss || 0;
  var bars = [];
  var stockTotal = 0;
  var pieceTotal = 0;
  var lossTotal = 0;
  patterns.forEach(function(pat, k) {
    if (xInt[k] <= 0) return;
    var pieces = [];
    pat.counts.forEach(function(c, i) {
      for (var j = 0; j < c; j++) pieces.push(items[i].length);
    });
    pieces.sort(function(a, b) { return b - a; });
    var sizeWithBlades = pieces.reduce(function(s, p) { return s + p; }, 0)
      + Math.max(0, pieces.length - 1) * blade;
    var lossPerBar = (pat.stock - endLoss) - sizeWithBlades;
    bars.push({ stock: pat.stock, pattern: pieces, count: xInt[k] });
    stockTotal += pat.stock * xInt[k];
    pieceTotal += pieces.reduce(function(s, p) { return s + p; }, 0) * xInt[k];
    lossTotal += lossPerBar * xInt[k];
  });
  var distinctStocks = new Set(bars.map(function(b) { return b.stock; }));
  var stockBreakdown = {};
  bars.forEach(function(b) { stockBreakdown[b.stock] = (stockBreakdown[b.stock] || 0) + b.count; });
  var barCount = bars.reduce(function(s, b) { return s + b.count; }, 0);

  return {
    rank: rank,
    status: 'k_best',
    x: xInt,
    objective: objective,
    barCount: barCount,
    stockTotal: stockTotal,
    pieceTotal: pieceTotal,
    lossTotal: lossTotal,
    bars: bars,
    distinctStockCount: distinctStocks.size,
    stockBreakdown: stockBreakdown
  };
}

function _range(n) {
  var r = new Array(n);
  for (var i = 0; i < n; i++) r[i] = i;
  return r;
}

// ============================================================================
// 公開 — Node (CommonJS) と Browser (Toriai global namespace) の dual-mode
// ============================================================================

var _exports = {
  solveKBest: solveKBest,
  _internal: {
    buildMipFromPatterns: _buildMipFromPatterns,
    addNoGoodCut: _addNoGoodCut,
    formatSolution: _formatSolution
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  var _g = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis);
  _g.Toriai = _g.Toriai || {};
  _g.Toriai.calculation = _g.Toriai.calculation || {};
  _g.Toriai.calculation.yield = _g.Toriai.calculation.yield || {};
  _g.Toriai.calculation.yield.research = _g.Toriai.calculation.yield.research || {};
  _g.Toriai.calculation.yield.research.kBest = _exports;
}
