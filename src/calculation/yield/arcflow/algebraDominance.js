/**
 * TORIAI 計算 V3 — Algebra-Driven Pattern Dominance
 *
 * 仮説 (RESEARCH_DOMINANCE.md §2):
 *   Pattern dominance を algebra で形式定義し、MIP 解く前に dominated パターンを
 *   枝刈りすれば、HiGHS-WASM が CASE-6 規模 MIP を解けるようになる。
 *
 * 形式定義 (§3.1):
 *   P >= Q  ⇔  ∀i: P.counts[i] >= Q.counts[i]
 *           ∧  P.stock <= Q.stock
 *           ∧  P != Q（少なくとも 1 つ strict）
 *
 * 最適性保存 (§4): dominated パターンを除いても MIP の最適解集合は失われない
 * （交換論証で証明、RESEARCH_DOMINANCE.md §4 参照）。
 *
 * 計算量: O(N² × k) where N = pattern 数、k = piece-type 数
 *
 * 純関数。HiGHS / algebra 依存ゼロ（Phase 1 algebra の R5 と同精神だが独立実装）。
 */

'use strict';

// ============================================================================
// dominates(P, Q) — P が Q を dominate するか
//
// pattern 形式: { stock: number, counts: number[] }
//   counts[i] = piece-type i の個数
//
// 戻り値: boolean
// ============================================================================

function dominates(P, Q) {
  if (P === Q) return false;
  // counts 長さ不一致は無効（同じ items index 前提）
  if (!P || !Q || !Array.isArray(P.counts) || !Array.isArray(Q.counts)) return false;
  if (P.counts.length !== Q.counts.length) return false;

  // cost 条件: P.stock <= Q.stock
  if (P.stock > Q.stock) return false;
  let strictGain = (P.stock < Q.stock);

  // coverage 条件: ∀i, P.counts[i] >= Q.counts[i]、いずれかで strict
  for (let i = 0; i < P.counts.length; i++) {
    if (P.counts[i] < Q.counts[i]) return false;
    if (P.counts[i] > Q.counts[i]) strictGain = true;
  }
  return strictGain;
}

// ============================================================================
// findDominated(patterns) — patterns 集合から dominated index 集合を返す
//
// O(N² × k) 時間計算量。CASE-6 規模 (N≈100, k≈60) で数 ms。
//
// 戻り値: Set<number> = dominated patterns の index
// ============================================================================

function findDominated(patterns) {
  const dominated = new Set();
  for (let q = 0; q < patterns.length; q++) {
    if (dominated.has(q)) continue; // 既に支配されてる
    for (let p = 0; p < patterns.length; p++) {
      if (p === q) continue;
      if (dominated.has(p)) continue; // 支配されたものから dominate されない（推移性）
      if (dominates(patterns[p], patterns[q])) {
        dominated.add(q);
        break;
      }
    }
  }
  return dominated;
}

// ============================================================================
// prunePatterns(patterns) — dominated を除いた pattern 配列を返す
//
// 戻り値: { kept: Pattern[], dominated: Pattern[], stats: {...} }
// ============================================================================

function prunePatterns(patterns) {
  const dominatedSet = findDominated(patterns);
  const kept = [];
  const dominated = [];
  for (let i = 0; i < patterns.length; i++) {
    if (dominatedSet.has(i)) dominated.push(patterns[i]);
    else kept.push(patterns[i]);
  }
  return {
    kept: kept,
    dominated: dominated,
    stats: {
      total: patterns.length,
      keptCount: kept.length,
      dominatedCount: dominated.length,
      pruneRatio: patterns.length > 0 ? dominated.length / patterns.length : 0
    }
  };
}

// ============================================================================
// 検証ユーティリティ: prune が demand 充足能力を失わないこと
//
// pruned set だけで demand を満たせる pattern 組合せが存在するか確認
// （単純な確認用、現実的には MIP solver に任せる）
// ============================================================================

function verifyPruneSafety(patterns, items) {
  const pruned = prunePatterns(patterns);
  // 各 piece type i について、kept patterns の中に i をカバーするものがあるか
  for (let i = 0; i < items.length; i++) {
    let covered = false;
    for (const p of pruned.kept) {
      if (p.counts[i] > 0) { covered = true; break; }
    }
    if (!covered && items[i].count > 0) {
      return {
        safe: false,
        reason: 'piece_type_' + i + '_no_kept_pattern_covers_it'
      };
    }
  }
  return { safe: true };
}

// ============================================================================
// 公開
// ============================================================================

module.exports = {
  dominates: dominates,
  findDominated: findDominated,
  prunePatterns: prunePatterns,
  verifyPruneSafety: verifyPruneSafety
};
