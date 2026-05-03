/**
 * TORIAI 計算 V3 「Symbolic Pattern Algebra」
 *
 * rewriteRules.js — 簡約規則 R1〜R5 の実装。
 *
 * ALGEBRA_DESIGN.md §1.4 / §1.6.1 に厳密準拠。各規則は決定論版で実装する。
 *
 * 各規則は `{ applies, apply }` の対で公開する:
 *   - applies(term, ctx?) : boolean — 規則が発火可能か判定
 *   - apply  (term, ctx?) : term    — 1 回適用した結果を返す（applies が false のとき throw）
 *
 * 全規則は純関数。term は不変。apply は新しい frozen term を返す。
 *
 * 公開先: Toriai.calculation.yield.algebra.rewriteRules.*
 * 依存: algebra/term.js, algebra/axioms.js
 */

(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns || !ns.calculation || !ns.calculation.yield || !ns.calculation.yield.algebra) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[algebra/rewriteRules] requires algebra namespace');
    }
    return;
  }
  var algebra = ns.calculation.yield.algebra;
  var T = algebra.term;
  var Internal = algebra._internal || {};
  if (!T || !Internal.computeSize) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[algebra/rewriteRules] requires algebra/term to be loaded first');
    }
    return;
  }

  function fail(msg, ctx) {
    var err = new Error('[algebra/rewriteRules] ' + msg);
    if (ctx !== undefined) err.context = ctx;
    throw err;
  }

  // ===========================================================================
  // R1: sort
  //   ⟨S; π⟩ → ⟨S; sort_desc(π)⟩
  //
  // makePattern コンストラクタが pieces を降順 sort 済みなので、
  // この規則は **常に vacuous**（applies → false）。
  // 完全性のため対として残し、normalForm.step() の規則順序で R1 を最初に置くと
  // 「もし将来 unsorted な経路で pattern が作られても」自動修復される保険になる。
  // ===========================================================================

  var R1 = {
    name: 'R1.sort',
    appliesTo: 'pattern',
    applies: function(pattern) {
      if (!T.isPattern(pattern)) return false;
      // 既に降順か確認
      for (var i = 0; i < pattern.pieces.length - 1; i++) {
        if (pattern.pieces[i] < pattern.pieces[i + 1]) return true;
      }
      return false;
    },
    apply: function(pattern) {
      if (!R1.applies(pattern)) fail('R1 not applicable: pieces already sorted descending');
      // makePattern が再度ソートして frozen を返す
      return T.makePattern({
        stock: pattern.stock,
        blade: pattern.blade,
        endLoss: pattern.endLoss,
        pieces: pattern.pieces.slice()
      });
    }
  };

  // ===========================================================================
  // R2: collapse
  //   ⟨S; [..., ℓ, ℓ, ...]⟩ → 表記正規化（多重集合は不変）
  //
  // フラットリスト表現を採用しているため、表記の畳み込みは存在しない。
  // 多重集合としての一意性は makePattern + 降順ソート で保証済。
  // R2 は **常に vacuous**（applies → false）。R1 と同様、対として残す。
  // ===========================================================================

  var R2 = {
    name: 'R2.collapse',
    appliesTo: 'pattern',
    applies: function() { return false; },
    apply: function(pattern) {
      fail('R2 is representational only; nothing to apply on flat-list pieces');
    }
  };

  // ===========================================================================
  // R3: lift-merge
  //   PLAN { (P, k₁), (P, k₂), ... } → { (P, k₁+k₂), ... }
  //
  // 同一 patternKey を持つエントリを 1 つに集約する。
  // 決定論版: PLAN を頭から走査し、最初に見つかった重複を集約する。
  // 反復適用すると全ての重複が消える。
  // ===========================================================================

  function findFirstDuplicate(plan) {
    var seen = {};
    for (var i = 0; i < plan.entries.length; i++) {
      var k = T.patternKey(plan.entries[i].pattern);
      if (seen[k] !== undefined) {
        return { firstIdx: seen[k], dupIdx: i, key: k };
      }
      seen[k] = i;
    }
    return null;
  }

  var R3 = {
    name: 'R3.lift-merge',
    appliesTo: 'plan',
    applies: function(plan) {
      if (!T.isPlan(plan)) return false;
      return findFirstDuplicate(plan) !== null;
    },
    apply: function(plan) {
      var dup = findFirstDuplicate(plan);
      if (!dup) fail('R3 not applicable: no duplicate pattern in plan');
      var newEntries = [];
      for (var i = 0; i < plan.entries.length; i++) {
        if (i === dup.dupIdx) continue;
        var e = plan.entries[i];
        if (i === dup.firstIdx) {
          newEntries.push({
            pattern: e.pattern,
            count: e.count + plan.entries[dup.dupIdx].count
          });
        } else {
          newEntries.push({ pattern: e.pattern, count: e.count });
        }
      }
      return T.makePlan(newEntries);
    }
  };

  // ===========================================================================
  // R4: prune-empty
  //   PLAN に含まれる count = 0 のエントリを除去する
  //
  // 決定論版: 最初に見つかった count=0 を除去する 1 回適用。
  // 反復適用すると全ての 0 エントリが消える。
  // ===========================================================================

  function findFirstZeroCount(plan) {
    for (var i = 0; i < plan.entries.length; i++) {
      if (plan.entries[i].count === 0) return i;
    }
    return -1;
  }

  var R4 = {
    name: 'R4.prune-empty',
    appliesTo: 'plan',
    applies: function(plan) {
      if (!T.isPlan(plan)) return false;
      return findFirstZeroCount(plan) >= 0;
    },
    apply: function(plan) {
      var idx = findFirstZeroCount(plan);
      if (idx < 0) fail('R4 not applicable: no count=0 entry in plan');
      var kept = [];
      for (var i = 0; i < plan.entries.length; i++) {
        if (i === idx) continue;
        kept.push({ pattern: plan.entries[i].pattern, count: plan.entries[i].count });
      }
      return T.makePlan(kept);
    }
  };

  // ===========================================================================
  // R5: dominance
  //   ⟨S; π⟩ → ⟨S*; π⟩  if S* < S かつ ⟨S*; π⟩ valid
  //
  // 決定論版（DESIGN §1.6.1）:
  //   S* = min { s ∈ availableStocks | s - endLoss ≥ size(π) かつ s ≤ S }
  //   （可能な限り**最小**の定尺へ一気に lift する）
  //
  // ctx.availableStocks は number[] を要求。リストになければ R5 は vacuous。
  //
  // BUG-V2-001 の核心: pat10m_6 で ctx.availableStocks=[10000, 9000, 8000]
  // のとき S*=8000 になり、端材 2503mm → 503mm に削減される。
  // ===========================================================================

  function patternRequiredEff(pattern) {
    return Internal.computeSize(pattern.pieces, pattern.blade);
  }

  /**
   * 与えられた pattern について、availableStocks の中で
   *   - pattern.stock より厳密に小さい
   *   - pattern を載せて valid （size <= s - endLoss）
   * を満たす **最小の** stock を返す。なければ null。
   */
  function findMinDominatingStock(pattern, availableStocks) {
    if (!Array.isArray(availableStocks)) return null;
    var required = patternRequiredEff(pattern);
    var best = null;
    for (var i = 0; i < availableStocks.length; i++) {
      var s = availableStocks[i];
      if (!Internal.isPositiveInt(s)) continue;
      if (s >= pattern.stock) continue;
      if (s - pattern.endLoss < required) continue;
      if (best === null || s < best) best = s;
    }
    return best;
  }

  var R5 = {
    name: 'R5.dominance',
    appliesTo: 'pattern',
    /**
     * @param pattern
     * @param ctx { availableStocks: number[] }
     */
    applies: function(pattern, ctx) {
      if (!T.isPattern(pattern)) return false;
      if (!ctx || !Array.isArray(ctx.availableStocks)) return false;
      return findMinDominatingStock(pattern, ctx.availableStocks) !== null;
    },
    apply: function(pattern, ctx) {
      if (!ctx || !Array.isArray(ctx.availableStocks)) {
        fail('R5 requires ctx.availableStocks');
      }
      var sStar = findMinDominatingStock(pattern, ctx.availableStocks);
      if (sStar === null) fail('R5 not applicable: no dominating smaller stock available');
      return T.makePattern({
        stock: sStar,
        blade: pattern.blade,
        endLoss: pattern.endLoss,
        pieces: pattern.pieces.slice()
      });
    }
  };

  /**
   * R5 を PLAN レベルに持ち上げる便利関数。
   * Plan の entries を頭から走査し、最初に R5 が適用可能なエントリの pattern を lift する。
   * 1 回の lift で 1 entry を変更し、新しい PLAN を返す。
   */
  function r5ApplyToPlan(plan, ctx) {
    if (!T.isPlan(plan)) fail('r5ApplyToPlan: not a plan');
    var newEntries = [];
    var applied = false;
    for (var i = 0; i < plan.entries.length; i++) {
      var e = plan.entries[i];
      if (!applied && R5.applies(e.pattern, ctx)) {
        newEntries.push({ pattern: R5.apply(e.pattern, ctx), count: e.count });
        applied = true;
      } else {
        newEntries.push({ pattern: e.pattern, count: e.count });
      }
    }
    if (!applied) fail('r5ApplyToPlan: no entry has dominating smaller stock');
    return T.makePlan(newEntries);
  }

  function r5AppliesToPlan(plan, ctx) {
    if (!T.isPlan(plan)) return false;
    for (var i = 0; i < plan.entries.length; i++) {
      if (R5.applies(plan.entries[i].pattern, ctx)) return true;
    }
    return false;
  }

  // ===========================================================================
  // step — 1 ステップ簡約ディスパッチャ
  //
  // 渡された term に対して規則を順に試し、最初に発火した規則を 1 回適用する。
  // 規則の試行順:
  //   PLAN: R4 (prune) → R3 (merge) → R5 (per-entry lift)
  //   PATTERN: R1 (sort) → R5 (lift)
  //
  // R4 を R3 より先に置く理由: 0 entry を先に消した方が R3 の探索が軽い。
  // R5 を最後に置く理由: stock 変更後に R3 が再発火することがあるので、
  //   外側ループで R3 → R5 → R3 のように交互発火しやすくなる。
  //
  // 戻り値: { fired: boolean, ruleName: string|null, term: term }
  //   fired === false なら term は正規形（少なくとも step 順序においては）。
  // ===========================================================================

  function step(term, ctx) {
    ctx = ctx || {};
    if (T.isPlan(term)) {
      if (R4.applies(term)) return { fired: true, ruleName: R4.name, term: R4.apply(term) };
      if (R3.applies(term)) return { fired: true, ruleName: R3.name, term: R3.apply(term) };
      if (r5AppliesToPlan(term, ctx)) {
        return { fired: true, ruleName: 'R5.dominance(plan)', term: r5ApplyToPlan(term, ctx) };
      }
      return { fired: false, ruleName: null, term: term };
    }
    if (T.isPattern(term)) {
      if (R1.applies(term)) return { fired: true, ruleName: R1.name, term: R1.apply(term) };
      if (R5.applies(term, ctx)) return { fired: true, ruleName: R5.name, term: R5.apply(term, ctx) };
      return { fired: false, ruleName: null, term: term };
    }
    return { fired: false, ruleName: null, term: term };
  }

  // ---------------------------------------------------------------------------
  // 公開
  // ---------------------------------------------------------------------------

  algebra.rewriteRules = {
    // 個別規則
    R1: R1,
    R2: R2,
    R3: R3,
    R4: R4,
    R5: R5,

    // R5 の plan-level 拡張
    r5ApplyToPlan: r5ApplyToPlan,
    r5AppliesToPlan: r5AppliesToPlan,

    // ヘルパ
    findMinDominatingStock: findMinDominatingStock,
    findFirstDuplicate: findFirstDuplicate,
    findFirstZeroCount: findFirstZeroCount,
    patternRequiredEff: patternRequiredEff,

    // 1 ステップディスパッチャ
    step: step
  };

})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
