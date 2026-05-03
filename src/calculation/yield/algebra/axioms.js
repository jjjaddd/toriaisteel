/**
 * TORIAI 計算 V3 「Symbolic Pattern Algebra」
 *
 * axioms.js — 公理 A1〜A9 の検証述語と PLAN 結合子。
 *
 * ALGEBRA_DESIGN.md §1.3〜§1.5 に厳密準拠した純関数モジュール。
 * 副作用ゼロ、TERM の不変性に依存。
 *
 * 公開先: Toriai.calculation.yield.algebra.axioms.*
 * 依存: algebra/term.js（先にロードされている必要あり）
 *
 * 役割の境界:
 *   - axioms.js  : 公理が成立するかを「観測」する verifier。**簡約はしない**
 *   - rewriteRules.js (Phase 1 day-3 以降) : 公理に従って TERM を「変形」する rewrite
 *   - normalForm.js  (Phase 1 day-4 以降) : rewrite の不動点を取って正規形にする
 */

(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns || !ns.calculation || !ns.calculation.yield || !ns.calculation.yield.algebra || !ns.calculation.yield.algebra.term) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[algebra/axioms] requires algebra/term to be loaded first');
    }
    return;
  }

  var T = ns.calculation.yield.algebra.term;
  var Internal = ns.calculation.yield.algebra._internal || {};

  // ---------------------------------------------------------------------------
  // PLAN 結合子（⊎）— A7/A8/A9 の検証に必要
  //
  // concatPlan(X, Y) = X ⊎ Y
  // 単純にエントリ配列を連結する。R3 lift-merge による集約は rewriteRules.js
  // が担当するので、ここでは集約しない（重複エントリも保持）。
  // ---------------------------------------------------------------------------

  function concatPlan(planA, planB) {
    if (!T.isPlan(planA)) throw new Error('[algebra/axioms] concatPlan: arg 1 is not a plan');
    if (!T.isPlan(planB)) throw new Error('[algebra/axioms] concatPlan: arg 2 is not a plan');
    var entries = planA.entries.concat(planB.entries);
    // makePlan が再度 Object.freeze するので、生のエントリを渡す
    var raw = entries.map(function(e) { return { pattern: e.pattern, count: e.count }; });
    return T.makePlan(raw);
  }

  // ---------------------------------------------------------------------------
  // PLAN 等価判定
  //
  // (PATTERN, count) の多重集合として等しいかを判定する。
  // 同一 patternKey のエントリは count を**合算してから比較**する
  // （これは R3 lift-merge を先取りした正規化）。
  // count = 0 のエントリは無視（A6 / R4 の先取り）。
  //
  // この関数は「rewriteRules.js を通したらどちらも同じ正規形になる」かを
  // 観測するための判定器であって、rewrite 自体は行わない。
  // ---------------------------------------------------------------------------

  function planEquivalent(planA, planB) {
    if (!T.isPlan(planA) || !T.isPlan(planB)) return false;
    var aMap = bucketize(planA);
    var bMap = bucketize(planB);
    var aKeys = Object.keys(aMap);
    var bKeys = Object.keys(bMap);
    if (aKeys.length !== bKeys.length) return false;
    for (var i = 0; i < aKeys.length; i++) {
      var k = aKeys[i];
      if (aMap[k] !== bMap[k]) return false;
    }
    return true;
  }

  function bucketize(plan) {
    var m = {};
    for (var i = 0; i < plan.entries.length; i++) {
      var e = plan.entries[i];
      if (e.count === 0) continue;
      var k = T.patternKey(e.pattern);
      m[k] = (m[k] || 0) + e.count;
    }
    return m;
  }

  // ---------------------------------------------------------------------------
  // 検証結果型
  //
  // verifyAxN は { holds: boolean, reason: string } を返す。
  // テストでは `.holds` だけ見ればよいが、失敗時に `.reason` でデバッグ可能。
  // ---------------------------------------------------------------------------

  function ok() { return Object.freeze({ holds: true, reason: '' }); }
  function fail(reason) { return Object.freeze({ holds: false, reason: reason }); }

  // ===========================================================================
  // A1: 部材の交換律
  //   ℓᵢ ⊕ ℓⱼ ≡ ℓⱼ ⊕ ℓᵢ
  //
  // makePattern コンストラクタが pieces を降順 sort するため、
  // 任意の順列入力に対して同じ pattern が返る。
  // verifyA1 は順列入力 2 つを受け取り、生成された pattern が等価かを観測する。
  // ===========================================================================

  function verifyA1(stock, blade, endLoss, piecesA, piecesB) {
    if (!isMultisetEqual(piecesA, piecesB)) {
      return fail('verifyA1 inputs are not multiset-equal: ' + JSON.stringify(piecesA) + ' vs ' + JSON.stringify(piecesB));
    }
    var p1, p2;
    try {
      p1 = T.makePattern({ stock: stock, blade: blade, endLoss: endLoss, pieces: piecesA });
      p2 = T.makePattern({ stock: stock, blade: blade, endLoss: endLoss, pieces: piecesB });
    } catch (e) {
      return fail('makePattern threw: ' + e.message);
    }
    return T.patternEquals(p1, p2) ? ok() : fail('different patterns from multiset-equal inputs');
  }

  // ===========================================================================
  // A2: 部材の結合律
  //   (a ⊕ b) ⊕ c ≡ a ⊕ (b ⊕ c)
  //
  // フラットリスト表現では「結合の入れ子」が存在しないので、
  // この公理は表現レベルで自動的に成立（vacuous）。
  // verifyA2 は「3 つの順列を異なる順で挿入しても同じ pattern」を観測する。
  // ===========================================================================

  function verifyA2(stock, blade, endLoss, a, b, c) {
    var p1, p2, p3;
    try {
      // (a ++ b) ++ c
      p1 = T.makePattern({ stock: stock, blade: blade, endLoss: endLoss, pieces: a.concat(b).concat(c) });
      // a ++ (b ++ c)
      p2 = T.makePattern({ stock: stock, blade: blade, endLoss: endLoss, pieces: a.concat(b.concat(c)) });
      // 任意の挿入順
      p3 = T.makePattern({ stock: stock, blade: blade, endLoss: endLoss, pieces: c.concat(a).concat(b) });
    } catch (e) {
      return fail('makePattern threw: ' + e.message);
    }
    if (!T.patternEquals(p1, p2)) return fail('(a++b)++c != a++(b++c)');
    if (!T.patternEquals(p1, p3)) return fail('(a++b)++c != c++a++b');
    return ok();
  }

  // ===========================================================================
  // A3: 表記上の重複圧縮（representational, NOT semantic）
  //
  // ⟨S; [ℓ, ℓ]⟩ と ⟨S; [ℓ²]⟩ は同じ多重集合を指す。これは A1 + A2 から従い、
  // makePattern が降順ソートで内部表現を統一するため自動的に成立。
  //
  // ※ 設計書 §1.4 の R2 は「表現の畳み込み」であって、バー本数は変えない。
  //   元の表記「⟨S; [ℓ]ⁿ⟩ ⊗ k ≡ ⟨S; [ℓ]⟩ ⊗ (n·k)」はバー数が変わるので
  //   セマンティック等価ではない（ALGEBRA_DESIGN v0.3 で訂正予定）。
  // verifyA3 は重複部材を含む pattern が一意の正規形を持つことを観測する。
  // ===========================================================================

  function verifyA3(stock, blade, endLoss, len, repeatCount) {
    if (!Internal.isPositiveInt(repeatCount)) return fail('repeatCount must be positive int');
    var pieces = [];
    for (var i = 0; i < repeatCount; i++) pieces.push(len);
    var p, p2;
    try {
      p = T.makePattern({ stock: stock, blade: blade, endLoss: endLoss, pieces: pieces });
      // 同じ multiset を別の順序で構築（といっても全部同じ値だが、確認のため）
      p2 = T.makePattern({ stock: stock, blade: blade, endLoss: endLoss, pieces: pieces.slice() });
    } catch (e) {
      return fail('makePattern threw: ' + e.message);
    }
    if (!T.patternEquals(p, p2)) return fail('repeated-piece pattern not stable across construction');
    if (T.patternKey(p) !== T.patternKey(p2)) return fail('patternKey differs for equivalent patterns');
    return ok();
  }

  // ===========================================================================
  // A4: 容量制約
  //   ⟨S; π⟩ valid ⇔ Σπ + (|π|-1)·b ≤ S - e
  //
  // verifyA4 は与えられた pattern について制約を独立計算で再検証する。
  // makePattern コンストラクタも同じ制約を確認しているが、
  // axioms 側で「不変条件として継続的に成立する」ことを宣言する意味がある。
  // ===========================================================================

  function verifyA4(pattern) {
    if (!T.isPattern(pattern)) return fail('not a pattern');
    var size = Internal.computeSize(pattern.pieces, pattern.blade);
    var eff = pattern.stock - pattern.endLoss;
    if (eff <= 0) return fail('effective length non-positive: stock=' + pattern.stock + ' endLoss=' + pattern.endLoss);
    if (size > eff) return fail('size ' + size + ' > eff ' + eff);
    // patternIsValid とも整合
    if (!T.patternIsValid(pattern)) return fail('patternIsValid disagrees');
    return ok();
  }

  // ===========================================================================
  // A5: 昇格不変性
  //   yield(P ⊙ S') ≤ yield(P)  for S' ≥ S
  //   = 同じ pieces を**より大きい定尺**に乗せると yield は下がる（または同じ）
  //
  // verifyA5(pattern, largerStock) は largerStock ≥ pattern.stock を要求し、
  // largerStock 上での同 pieces pattern の yield が pattern.yield 以下であることを観測。
  //
  // 等価な対偶: より小さい定尺に押し込めると yield は上がる、これが BUG-V2-001 の核心。
  // ===========================================================================

  function verifyA5(pattern, largerStock) {
    if (!T.isPattern(pattern)) return fail('arg 1 not a pattern');
    if (!Internal.isPositiveInt(largerStock)) return fail('largerStock must be positive int');
    if (largerStock < pattern.stock) return fail('largerStock (' + largerStock + ') must be >= pattern.stock (' + pattern.stock + ')');
    var lifted;
    try {
      lifted = T.makePattern({
        stock: largerStock,
        blade: pattern.blade,
        endLoss: pattern.endLoss,
        pieces: pattern.pieces.slice()
      });
    } catch (e) {
      return fail('makePattern on largerStock threw: ' + e.message);
    }
    var y0 = T.patYield(pattern);
    var y1 = T.patYield(lifted);
    if (y1 > y0 + 1e-9) return fail('yield went UP after lifting: ' + y0 + ' -> ' + y1);
    return ok();
  }

  // ===========================================================================
  // A6: 0 本エントリの単位元性
  //   ⟨S; π⟩ ⊗ 0 ≡ ε
  //
  // count=0 のエントリを含む plan と、そのエントリを除いた plan が
  // planEquivalent / planMetrics で等価。
  // ===========================================================================

  function verifyA6(plan, zeroEntryIndex) {
    if (!T.isPlan(plan)) return fail('not a plan');
    if (zeroEntryIndex < 0 || zeroEntryIndex >= plan.entries.length) return fail('index out of range');
    if (plan.entries[zeroEntryIndex].count !== 0) return fail('entry at index is not count=0');

    var withoutZero = T.makePlan(plan.entries.filter(function(_, i) { return i !== zeroEntryIndex; })
      .map(function(e) { return { pattern: e.pattern, count: e.count }; }));

    if (!planEquivalent(plan, withoutZero)) return fail('planEquivalent disagrees on 0-entry removal');

    var m1 = T.planMetrics(plan);
    var m2 = T.planMetrics(withoutZero);
    if (m1.barCount !== m2.barCount) return fail('barCount differs: ' + m1.barCount + ' vs ' + m2.barCount);
    if (m1.stockTotal !== m2.stockTotal) return fail('stockTotal differs');
    if (m1.lossTotal !== m2.lossTotal) return fail('lossTotal differs');
    return ok();
  }

  // ===========================================================================
  // A7: PLAN の単位元
  //   X ⊎ ε ≡ X
  // ===========================================================================

  function verifyA7(plan) {
    if (!T.isPlan(plan)) return fail('not a plan');
    var combined = concatPlan(plan, T.emptyPlan());
    var combined2 = concatPlan(T.emptyPlan(), plan);
    if (!planEquivalent(plan, combined)) return fail('X ⊎ ε ≢ X');
    if (!planEquivalent(plan, combined2)) return fail('ε ⊎ X ≢ X');
    return ok();
  }

  // ===========================================================================
  // A8: PLAN の結合律
  //   (X ⊎ Y) ⊎ Z ≡ X ⊎ (Y ⊎ Z)
  // ===========================================================================

  function verifyA8(planX, planY, planZ) {
    if (!T.isPlan(planX) || !T.isPlan(planY) || !T.isPlan(planZ)) return fail('all args must be plans');
    var left  = concatPlan(concatPlan(planX, planY), planZ);
    var right = concatPlan(planX, concatPlan(planY, planZ));
    return planEquivalent(left, right) ? ok() : fail('(X⊎Y)⊎Z ≢ X⊎(Y⊎Z)');
  }

  // ===========================================================================
  // A9: PLAN の交換律
  //   X ⊎ Y ≡ Y ⊎ X
  // ===========================================================================

  function verifyA9(planX, planY) {
    if (!T.isPlan(planX) || !T.isPlan(planY)) return fail('both args must be plans');
    var xy = concatPlan(planX, planY);
    var yx = concatPlan(planY, planX);
    return planEquivalent(xy, yx) ? ok() : fail('X⊎Y ≢ Y⊎X');
  }

  // ---------------------------------------------------------------------------
  // ヘルパ
  // ---------------------------------------------------------------------------

  function isMultisetEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    var sa = a.slice().sort(function(x, y) { return x - y; });
    var sb = b.slice().sort(function(x, y) { return x - y; });
    for (var i = 0; i < sa.length; i++) {
      if (sa[i] !== sb[i]) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // 公開
  // ---------------------------------------------------------------------------

  ns.calculation.yield.algebra.axioms = {
    // PLAN 結合子
    concatPlan: concatPlan,

    // PLAN 等価
    planEquivalent: planEquivalent,

    // 公理検証
    verifyA1: verifyA1,
    verifyA2: verifyA2,
    verifyA3: verifyA3,
    verifyA4: verifyA4,
    verifyA5: verifyA5,
    verifyA6: verifyA6,
    verifyA7: verifyA7,
    verifyA8: verifyA8,
    verifyA9: verifyA9,

    // 結果型のヘルパ
    _ok: ok,
    _fail: fail,
    _isMultisetEqual: isMultisetEqual,
    _bucketize: bucketize
  };

})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
