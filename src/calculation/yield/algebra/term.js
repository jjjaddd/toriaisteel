/**
 * TORIAI 計算 V3 「Symbolic Pattern Algebra」
 *
 * term.js — TERM / PATTERN / PLAN の表現と構築。
 *
 * ALGEBRA_DESIGN.md §1.1 / §3.2 に厳密準拠した純関数モジュール。
 * 副作用ゼロ、DOM/UI/storage 依存ゼロ。
 *
 * 公開先: Toriai.calculation.yield.algebra.*
 * 読込順: src/core/toriai-namespace.js の後ならどこでも可
 *         （V1/V2 計算ファイルとは独立、index.html への配線は Phase 3 末まで保留）
 */

(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns) return;

  ns.calculation = ns.calculation || {};
  ns.calculation.yield = ns.calculation.yield || {};
  ns.calculation.yield.algebra = ns.calculation.yield.algebra || {};

  var ATOM = 'atom';
  var PATTERN = 'pattern';
  var PLAN = 'plan';

  // ---------------------------------------------------------------------------
  // バリデータ — 不正値は即 throw（V3 は wrapper で V2 にフォールバックする方針）
  // ---------------------------------------------------------------------------

  function isPositiveInt(x) {
    return typeof x === 'number' && Number.isFinite(x) && Number.isInteger(x) && x > 0;
  }

  function isNonNegativeInt(x) {
    return typeof x === 'number' && Number.isFinite(x) && Number.isInteger(x) && x >= 0;
  }

  function fail(msg, ctx) {
    var err = new Error('[algebra/term] ' + msg);
    if (ctx !== undefined) err.context = ctx;
    throw err;
  }

  // ---------------------------------------------------------------------------
  // ATOM — 部材長 ℓ ∈ ℕ⁺
  // ---------------------------------------------------------------------------

  function makeAtom(length) {
    if (!isPositiveInt(length)) fail('atom length must be a positive integer', { length: length });
    return Object.freeze({ type: ATOM, length: length });
  }

  function isAtom(t) {
    return !!t && t.type === ATOM;
  }

  // ---------------------------------------------------------------------------
  // PATTERN — ⟨S; π⟩ 定尺 S 上の部材列 π
  //
  // pieces は **降順ソート済**で内部保持する。makePattern は入力を sort_desc して凍結。
  // ただし入力が空の場合は空パターン（ε に近い扱い）として保持できる。
  // ---------------------------------------------------------------------------

  function makePattern(spec) {
    if (!spec || typeof spec !== 'object') fail('pattern spec must be an object', { spec: spec });

    var stock = spec.stock;
    var pieces = spec.pieces;
    var blade = spec.blade;
    var endLoss = spec.endLoss;

    if (!isPositiveInt(stock)) fail('pattern.stock must be a positive integer', { stock: stock });
    if (!Array.isArray(pieces)) fail('pattern.pieces must be an array', { pieces: pieces });
    if (!isNonNegativeInt(blade)) fail('pattern.blade must be a non-negative integer', { blade: blade });
    if (!isNonNegativeInt(endLoss)) fail('pattern.endLoss must be a non-negative integer', { endLoss: endLoss });

    var eff = stock - endLoss;
    if (eff <= 0) fail('pattern effective length (stock - endLoss) must be positive', { stock: stock, endLoss: endLoss });

    for (var i = 0; i < pieces.length; i++) {
      if (!isPositiveInt(pieces[i])) fail('every piece length must be a positive integer', { index: i, value: pieces[i] });
    }

    var sorted = pieces.slice().sort(function(a, b) { return b - a; });
    var size = computeSize(sorted, blade);
    if (size > eff) fail('pattern size exceeds effective stock length', { size: size, eff: eff, stock: stock, endLoss: endLoss, pieces: sorted });

    Object.freeze(sorted);
    return Object.freeze({
      type: PATTERN,
      stock: stock,
      pieces: sorted,
      blade: blade,
      endLoss: endLoss
    });
  }

  function isPattern(t) {
    return !!t && t.type === PATTERN;
  }

  function computeSize(pieces, blade) {
    if (!pieces.length) return 0;
    var sum = 0;
    for (var i = 0; i < pieces.length; i++) sum += pieces[i];
    return sum + (pieces.length - 1) * blade;
  }

  function patSize(pattern) {
    assertIsPattern(pattern);
    return computeSize(pattern.pieces, pattern.blade);
  }

  function patEff(pattern) {
    assertIsPattern(pattern);
    return pattern.stock - pattern.endLoss;
  }

  function patLoss(pattern) {
    return patEff(pattern) - patSize(pattern);
  }

  function patYield(pattern) {
    var eff = patEff(pattern);
    if (eff <= 0) return 0;
    var sum = 0;
    for (var i = 0; i < pattern.pieces.length; i++) sum += pattern.pieces[i];
    return sum / eff;
  }

  function patternIsValid(pattern) {
    if (!isPattern(pattern)) return false;
    if (pattern.stock - pattern.endLoss <= 0) return false;
    return computeSize(pattern.pieces, pattern.blade) <= pattern.stock - pattern.endLoss;
  }

  /**
   * 多重集合等価。pieces はコンストラクタで降順ソート済なので
   * 単純な配列比較で OK。stock / blade / endLoss も完全一致を要求する。
   * （A1 交換律はコンストラクタ時の sort で実現済）
   */
  function patternEquals(a, b) {
    if (!isPattern(a) || !isPattern(b)) return false;
    if (a.stock !== b.stock) return false;
    if (a.blade !== b.blade) return false;
    if (a.endLoss !== b.endLoss) return false;
    if (a.pieces.length !== b.pieces.length) return false;
    for (var i = 0; i < a.pieces.length; i++) {
      if (a.pieces[i] !== b.pieces[i]) return false;
    }
    return true;
  }

  /**
   * パターン等価のための正準キー。Map / Set の key として使える文字列を返す。
   * R3 (lift-merge) の重複検出で使う。
   */
  function patternKey(pattern) {
    assertIsPattern(pattern);
    // pieces は降順ソート済なのでそのまま join
    return pattern.stock + '|' + pattern.blade + '|' + pattern.endLoss + '|' + pattern.pieces.join(',');
  }

  function assertIsPattern(p) {
    if (!isPattern(p)) fail('expected a pattern', { got: p });
  }

  // ---------------------------------------------------------------------------
  // PLAN — 多重集合 { (PATTERN, count), ... }
  //
  // entries は配列で保持するが、論理的には (pattern, count) の多重集合。
  // 同一パターンの重複は許す（R3 lift-merge で集約される前提）。
  // count = 0 のエントリも許容（R4 prune-empty で除去される前提）。
  // ---------------------------------------------------------------------------

  function makePlan(entries) {
    if (!Array.isArray(entries)) fail('plan entries must be an array', { entries: entries });
    var frozen = entries.map(function(e, i) {
      if (!e || typeof e !== 'object') fail('plan entry must be an object', { index: i, entry: e });
      if (!isPattern(e.pattern)) fail('plan entry.pattern must be a pattern term', { index: i, entry: e });
      if (!isNonNegativeInt(e.count)) fail('plan entry.count must be a non-negative integer', { index: i, entry: e });
      return Object.freeze({ pattern: e.pattern, count: e.count });
    });
    Object.freeze(frozen);
    return Object.freeze({ type: PLAN, entries: frozen });
  }

  function isPlan(t) {
    return !!t && t.type === PLAN;
  }

  function emptyPlan() {
    return makePlan([]);
  }

  /**
   * PLAN のメトリクス集約。
   *   barCount   : 全エントリの count 総和（実際に使う母材本数）
   *   stockTotal : 全本ぶんの定尺合計（mm）。BUG-V2-001 の比較指標
   *   pieceTotal : 切り出される部材長の合計（mm）
   *   lossTotal  : 全本の端材合計（mm）
   *   yieldPct   : 0..100。pieceTotal / Σ(count × eff)
   */
  function planMetrics(plan) {
    if (!isPlan(plan)) fail('expected a plan', { got: plan });
    var barCount = 0;
    var stockTotal = 0;
    var pieceTotal = 0;
    var effTotal = 0;
    var lossTotal = 0;
    for (var i = 0; i < plan.entries.length; i++) {
      var e = plan.entries[i];
      if (e.count === 0) continue;
      var p = e.pattern;
      var pieceSum = 0;
      for (var j = 0; j < p.pieces.length; j++) pieceSum += p.pieces[j];
      var size = computeSize(p.pieces, p.blade);
      var eff = p.stock - p.endLoss;
      barCount += e.count;
      stockTotal += e.count * p.stock;
      pieceTotal += e.count * pieceSum;
      effTotal += e.count * eff;
      lossTotal += e.count * (eff - size);
    }
    var yieldPct = effTotal > 0 ? (pieceTotal / effTotal) * 100 : 0;
    return Object.freeze({
      barCount: barCount,
      stockTotal: stockTotal,
      pieceTotal: pieceTotal,
      effTotal: effTotal,
      lossTotal: lossTotal,
      yieldPct: yieldPct
    });
  }

  // ---------------------------------------------------------------------------
  // 公開
  // ---------------------------------------------------------------------------

  var algebra = ns.calculation.yield.algebra;
  algebra.term = {
    // 種別タグ（テストで参照可能にする）
    ATOM: ATOM,
    PATTERN: PATTERN,
    PLAN: PLAN,

    // コンストラクタ
    makeAtom: makeAtom,
    makePattern: makePattern,
    makePlan: makePlan,
    emptyPlan: emptyPlan,

    // 述語
    isAtom: isAtom,
    isPattern: isPattern,
    isPlan: isPlan,
    patternIsValid: patternIsValid,

    // パターン計算
    patSize: patSize,
    patEff: patEff,
    patLoss: patLoss,
    patYield: patYield,
    patternEquals: patternEquals,
    patternKey: patternKey,

    // プラン計算
    planMetrics: planMetrics
  };

  // 内部ユーティリティを内部 namespace にも露出（rewriteRules.js 等から参照）
  algebra._internal = algebra._internal || {};
  algebra._internal.computeSize = computeSize;
  algebra._internal.isPositiveInt = isPositiveInt;
  algebra._internal.isNonNegativeInt = isNonNegativeInt;

})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
