/**
 * TORIAI 計算 V3 — Cross-Instance Pattern Library
 *
 * 設計 (RESEARCH_LIBRARY.md):
 *   instance 間で再利用可能な abstract pattern を蒸留・lookup する。
 *
 * Abstract pattern: { pieces: number[], stock: number, loss: number, yieldRatio: number }
 *   - pieces は piece type index ではなく **長さの multiset**（instance 間で共有可能）
 *   - stock はそのまま長さ (5500, 6000, ..., 12000)
 *
 * Library = { patterns: AbstractPattern[], metadata: {...} }
 *
 * 純関数 + dual-mode。
 */

'use strict';

// ============================================================================
// extractAbstractPatterns(cgResult, items, opts) — CG 出力 → abstract pattern
//
// cgResult: solveColumnGen / solveColumnGenInspect の戻り値
// items: 元 spec の pieces ({length, count})
// opts: { yieldThreshold?: number (default 0) }
//
// 戻り値: AbstractPattern[]
// ============================================================================

function extractAbstractPatterns(cgResult, items, opts) {
  opts = opts || {};
  var yieldThreshold = opts.yieldThreshold != null ? opts.yieldThreshold : 0;
  var blade = opts.blade != null ? opts.blade : 0;
  var endLoss = opts.endLoss != null ? opts.endLoss : 0;
  var patterns = cgResult && cgResult.patterns ? cgResult.patterns : null;
  var bars = cgResult && cgResult.bars ? cgResult.bars : null;

  var abstracts = [];

  if (patterns && items) {
    // patterns 配列形式 (solveColumnGenInspect)
    for (var k = 0; k < patterns.length; k++) {
      var p = patterns[k];
      var pieces = [];
      var totalLen = 0;
      for (var i = 0; i < p.counts.length; i++) {
        var c = p.counts[i] || 0;
        for (var j = 0; j < c; j++) {
          pieces.push(items[i].length);
          totalLen += items[i].length;
        }
      }
      if (pieces.length === 0) continue;
      pieces.sort(function(a, b) { return b - a; });
      var sizeWithBlades = totalLen + Math.max(0, pieces.length - 1) * blade;
      var loss = p.stock - endLoss - sizeWithBlades;
      var yieldRatio = (totalLen) / p.stock;
      if (yieldRatio < yieldThreshold) continue;
      abstracts.push({
        pieces: pieces,
        stock: p.stock,
        loss: loss,
        yieldRatio: yieldRatio
      });
    }
  } else if (bars && bars.length > 0) {
    // bars 形式 (solveColumnGen の結果)
    bars.forEach(function(b) {
      if (!b.pattern || b.pattern.length === 0) return;
      var pieces = b.pattern.slice().sort(function(a, b) { return b - a; });
      var totalLen = pieces.reduce(function(s, x) { return s + x; }, 0);
      var sizeWithBlades = totalLen + Math.max(0, pieces.length - 1) * blade;
      var loss = b.stock - endLoss - sizeWithBlades;
      var yieldRatio = totalLen / b.stock;
      if (yieldRatio < yieldThreshold) return;
      abstracts.push({
        pieces: pieces,
        stock: b.stock,
        loss: loss,
        yieldRatio: yieldRatio
      });
    });
  }
  return abstracts;
}

// ============================================================================
// patternKey(ap) — abstract pattern の dedup 用キー
// ============================================================================

function patternKey(ap) {
  return ap.stock + '|' + ap.pieces.join(',');
}

// ============================================================================
// mergeLibrary(libA, libB) — 2 つの library を merge、重複除去
// ============================================================================

function mergeLibrary(libA, libB) {
  var seen = new Set();
  var merged = [];
  function consider(ap) {
    var k = patternKey(ap);
    if (seen.has(k)) return;
    seen.add(k);
    merged.push(ap);
  }
  if (libA && libA.patterns) libA.patterns.forEach(consider);
  if (libB && libB.patterns) libB.patterns.forEach(consider);
  return {
    patterns: merged,
    metadata: {
      sourceInstances: ((libA && libA.metadata && libA.metadata.sourceInstances) || [])
        .concat((libB && libB.metadata && libB.metadata.sourceInstances) || []),
      builtAt: Date.now()
    }
  };
}

// ============================================================================
// buildLibrary(instances, opts) — 複数 instance から library を構築
//
// instances: [{ id, spec, cgResult }]
// opts: { yieldThreshold? }
// ============================================================================

function buildLibrary(instances, opts) {
  opts = opts || {};
  var yieldThreshold = opts.yieldThreshold != null ? opts.yieldThreshold : 0;
  var library = { patterns: [], metadata: { sourceInstances: [], yieldThreshold: yieldThreshold, builtAt: Date.now() } };
  for (var i = 0; i < instances.length; i++) {
    var inst = instances[i];
    var items = inst.spec.pieces.map(function(p) { return { length: p.length, count: p.count }; });
    var aps = extractAbstractPatterns(inst.cgResult, items, {
      yieldThreshold: yieldThreshold,
      blade: inst.spec.blade,
      endLoss: inst.spec.endLoss
    });
    library = mergeLibrary(library, { patterns: aps, metadata: { sourceInstances: [inst.id] } });
  }
  return library;
}

// ============================================================================
// findApplicablePatterns(library, spec) — instance に適用可能な pattern を抽出
//
// 適用条件:
//   - ap.stock が spec.availableStocks に含まれる
//   - ap.pieces の各長さが spec.pieces の length 集合に含まれる
//
// 戻り値: { stock, counts } 形式 (instance-specific、CG が消費可能)
// ============================================================================

function findApplicablePatterns(library, spec) {
  if (!library || !library.patterns) return [];
  var availStocks = new Set(spec.availableStocks);
  // length → piece type index map
  var lengthToIdx = new Map();
  for (var i = 0; i < spec.pieces.length; i++) {
    lengthToIdx.set(spec.pieces[i].length, i);
  }
  var applicable = [];
  var seenKeys = new Set();
  for (var p = 0; p < library.patterns.length; p++) {
    var ap = library.patterns[p];
    if (!availStocks.has(ap.stock)) continue;
    // すべての pieces が instance に存在する length か
    var ok = true;
    for (var j = 0; j < ap.pieces.length; j++) {
      if (!lengthToIdx.has(ap.pieces[j])) { ok = false; break; }
    }
    if (!ok) continue;
    // counts 配列を構築 (instance の piece type index 順)
    var counts = new Array(spec.pieces.length).fill(0);
    for (var k = 0; k < ap.pieces.length; k++) {
      var idx = lengthToIdx.get(ap.pieces[k]);
      counts[idx]++;
    }
    // demand を超えるパターンは skip (使い物にならない)
    var demandOk = true;
    for (var d = 0; d < counts.length; d++) {
      if (counts[d] > spec.pieces[d].count) { demandOk = false; break; }
    }
    if (!demandOk) continue;
    var pat = { stock: ap.stock, counts: counts };
    var key = ap.stock + '|' + counts.join(',');
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    applicable.push(pat);
  }
  return applicable;
}

// ============================================================================
// findApplicableApproximate(library, spec, opts) — 近似一致 lookup
//
// 各 library pattern について、その pieces を instance pieces の "近い長さ" に
// 置き換えて適用可能か判定する。
//
// opts:
//   tolerance: 長さの許容差比率 (default 0.02 = 2%)
//   blade, endLoss: capacity 検証用
//
// 戻り値: { stock, counts } 形式 (instance-specific)
// ============================================================================

function findApplicableApproximate(library, spec, opts) {
  if (!library || !library.patterns) return [];
  opts = opts || {};
  var tolerance = opts.tolerance != null ? opts.tolerance : 0.02;
  var blade = opts.blade != null ? opts.blade : (spec.blade || 0);
  var endLoss = opts.endLoss != null ? opts.endLoss : (spec.endLoss || 0);
  var availStocks = new Set(spec.availableStocks);

  var applicable = [];
  var seenKeys = new Set();

  for (var p = 0; p < library.patterns.length; p++) {
    var ap = library.patterns[p];
    if (!availStocks.has(ap.stock)) continue;
    // 各 piece に対し最も近い instance piece を greedy で割当
    var counts = new Array(spec.pieces.length).fill(0);
    var matchSum = 0;
    var ok = true;
    for (var j = 0; j < ap.pieces.length; j++) {
      var targetLen = ap.pieces[j];
      var bestIdx = -1;
      var bestDiff = Infinity;
      for (var pi = 0; pi < spec.pieces.length; pi++) {
        var diff = Math.abs(spec.pieces[pi].length - targetLen) / targetLen;
        if (diff > tolerance) continue;
        if (counts[pi] >= spec.pieces[pi].count) continue;  // demand 超過
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = pi;
        }
      }
      if (bestIdx < 0) { ok = false; break; }
      counts[bestIdx]++;
      matchSum += spec.pieces[bestIdx].length;
    }
    if (!ok) continue;
    // 容量検証: matchSum + blade*(n-1) + endLoss ≤ stock
    var totalPieces = ap.pieces.length;
    var used = matchSum + Math.max(0, totalPieces - 1) * blade + endLoss;
    if (used > ap.stock) continue;

    var pat = { stock: ap.stock, counts: counts };
    var key = ap.stock + '|' + counts.join(',');
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    applicable.push(pat);
  }
  return applicable;
}

// ============================================================================
// libraryStats(library) — 統計情報
// ============================================================================

function libraryStats(library) {
  if (!library || !library.patterns) return { count: 0 };
  var byStock = {};
  var totalPieces = 0;
  var avgYield = 0;
  library.patterns.forEach(function(ap) {
    byStock[ap.stock] = (byStock[ap.stock] || 0) + 1;
    totalPieces += ap.pieces.length;
    avgYield += ap.yieldRatio;
  });
  return {
    count: library.patterns.length,
    byStock: byStock,
    avgPiecesPerPattern: library.patterns.length > 0 ? totalPieces / library.patterns.length : 0,
    avgYield: library.patterns.length > 0 ? avgYield / library.patterns.length : 0,
    sourceCount: (library.metadata && library.metadata.sourceInstances) ? library.metadata.sourceInstances.length : 0
  };
}

// ============================================================================
// 公開
// ============================================================================

var _exports = {
  extractAbstractPatterns: extractAbstractPatterns,
  patternKey: patternKey,
  mergeLibrary: mergeLibrary,
  buildLibrary: buildLibrary,
  findApplicablePatterns: findApplicablePatterns,
  findApplicableApproximate: findApplicableApproximate,
  libraryStats: libraryStats
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  var _g = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis);
  _g.Toriai = _g.Toriai || {};
  _g.Toriai.calculation = _g.Toriai.calculation || {};
  _g.Toriai.calculation.yield = _g.Toriai.calculation.yield || {};
  _g.Toriai.calculation.yield.research = _g.Toriai.calculation.yield.research || {};
  _g.Toriai.calculation.yield.research.patternLibrary = _exports;
}
