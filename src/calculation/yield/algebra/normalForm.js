/**
 * TORIAI 計算 V3 「Symbolic Pattern Algebra」
 *
 * normalForm.js — 簡約規則 R1〜R5 の不動点を取って正規形を求める。
 *
 * ALGEBRA_DESIGN.md §1.5 / §1.6 準拠。terminating + locally confluent
 * （Newman の補題により大域 confluent）なので、normalize は任意の入力に
 * 対し有限ステップで一意な正規形を返す。
 *
 * 公開先: Toriai.calculation.yield.algebra.normalForm.*
 * 依存: algebra/term.js, algebra/rewriteRules.js
 */

(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns || !ns.calculation || !ns.calculation.yield || !ns.calculation.yield.algebra) return;
  var algebra = ns.calculation.yield.algebra;
  var T = algebra.term;
  var R = algebra.rewriteRules;
  if (!T || !R || typeof R.step !== 'function') {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[algebra/normalForm] requires algebra/term and algebra/rewriteRules');
    }
    return;
  }

  // ===========================================================================
  // normalize(term, ctx, opts) — 不動点を取る
  //
  // step() が fired === false を返すまでループする。
  //
  // opts:
  //   maxSteps : 安全弁。termination が壊れていた場合の検知用（デフォルト 1000）
  //   trace    : true なら各ステップで適用された rule 名を配列に記録（デバッグ用）
  //
  // 戻り値:
  //   {
  //     term       : 最終 term（正規形）
  //     terminated : maxSteps 内に正規形に達したか
  //     steps      : 適用された規則の総ステップ数
  //     trace      : opts.trace ? [string] : []
  //   }
  // ===========================================================================

  function normalize(term, ctx, opts) {
    ctx = ctx || {};
    opts = opts || {};
    var maxSteps = typeof opts.maxSteps === 'number' && opts.maxSteps > 0 ? opts.maxSteps : 1000;
    var trace = opts.trace ? [] : null;
    var current = term;
    for (var i = 0; i < maxSteps; i++) {
      var r = R.step(current, ctx);
      if (!r.fired) {
        return Object.freeze({
          term: current,
          terminated: true,
          steps: i,
          trace: trace ? trace.slice() : []
        });
      }
      if (trace) trace.push(r.ruleName);
      current = r.term;
    }
    // maxSteps 越え。termination 仮定が壊れている可能性あり
    return Object.freeze({
      term: current,
      terminated: false,
      steps: maxSteps,
      trace: trace ? trace.slice() : []
    });
  }

  // ===========================================================================
  // isNormalForm(term, ctx) — term が正規形か判定
  //
  // step() を 1 回試して fired === false なら正規形。
  // 副作用なしの単発判定なので軽量。
  // ===========================================================================

  function isNormalForm(term, ctx) {
    var r = R.step(term, ctx || {});
    return !r.fired;
  }

  // ===========================================================================
  // normalizeWithMetrics(term, ctx, opts) — 正規形 + メトリクス付き
  //
  // 計算結果を直接 UI / レポートで使うことを想定。
  // PLAN なら planMetrics、PATTERN なら patSize/patLoss/patYield を付ける。
  // ===========================================================================

  function normalizeWithMetrics(term, ctx, opts) {
    var result = normalize(term, ctx, opts);
    var metrics = null;
    if (T.isPlan(result.term)) {
      metrics = T.planMetrics(result.term);
    } else if (T.isPattern(result.term)) {
      metrics = Object.freeze({
        size: T.patSize(result.term),
        eff: T.patEff(result.term),
        loss: T.patLoss(result.term),
        yld: T.patYield(result.term)
      });
    }
    return Object.freeze({
      term: result.term,
      terminated: result.terminated,
      steps: result.steps,
      trace: result.trace,
      metrics: metrics
    });
  }

  // ---------------------------------------------------------------------------
  // 公開
  // ---------------------------------------------------------------------------

  algebra.normalForm = {
    normalize: normalize,
    isNormalForm: isNormalForm,
    normalizeWithMetrics: normalizeWithMetrics
  };

})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
