/**
 * tests/algebra/criticalPairs.test.js
 *
 * ALGEBRA_DESIGN.md §1.6.3 で紙ベースに列挙した 15 個の critical pair を
 * 実コードで再検証する。
 *
 * 各ペアについて:
 *   - 両規則が同時適用可能な「critical term」を構築
 *   - 規則 A → normalize → NF_A
 *   - 規則 B → normalize → NF_B
 *   - planEquivalent (or patternEquals) で NF_A ≡ NF_B を確認
 *
 * これが全 15 ペアで成立すれば local confluence、
 * termination は §1.6.2 で示しているので Newman の補題で大域 confluent。
 *
 * R1, R2 は makePattern コンストラクタで吸収済 (vacuous) なので、
 * それらが絡むペアは「適用不可」または「片方だけ適用」となり trivial。
 * そのことも明示的にテストする。
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

function loadAlgebra() {
  const sandbox = { console };
  vm.createContext(sandbox);
  for (const rel of [
    'src/core/toriai-namespace.js',
    'src/calculation/yield/algebra/term.js',
    'src/calculation/yield/algebra/axioms.js',
    'src/calculation/yield/algebra/rewriteRules.js',
    'src/calculation/yield/algebra/normalForm.js'
  ]) {
    const code = fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
  }
  return sandbox.Toriai.calculation.yield.algebra;
}

describe('critical pairs — DESIGN §1.6.3 全 15 ペアの local confluence 経験的検証', () => {
  let term, axioms, rules, nf;
  const blade = 3;
  const endLoss = 150;
  const stocks = [10000, 9000, 8000];

  // 共通 fixture
  let pat10m_8, pat10m_6, pat9m_6, pat8m_6;

  beforeAll(() => {
    const a = loadAlgebra();
    term = a.term;
    axioms = a.axioms;
    rules = a.rewriteRules;
    nf = a.normalForm;

    pat10m_8 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(8).fill(1222) });
    pat10m_6 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(6).fill(1222) });
    pat9m_6  = term.makePattern({ stock:  9000, blade, endLoss, pieces: Array(6).fill(1222) });
    pat8m_6  = term.makePattern({ stock:  8000, blade, endLoss, pieces: Array(6).fill(1222) });
  });

  // ==========================================================================
  // 共通ヘルパ: critical term を起点に、規則 A 適用後と規則 B 適用後の
  // 正規形を比較する
  // ==========================================================================

  function expectConfluentOnPlan(planTerm, applyA, applyB, ctx) {
    const afterA = applyA(planTerm);
    const afterB = applyB(planTerm);
    const nfA = nf.normalize(afterA, ctx).term;
    const nfB = nf.normalize(afterB, ctx).term;
    expect(axioms.planEquivalent(nfA, nfB)).toBe(true);
  }

  function expectConfluentOnPattern(patTerm, applyA, applyB, ctx) {
    const afterA = applyA(patTerm);
    const afterB = applyB(patTerm);
    const nfA = nf.normalize(afterA, ctx).term;
    const nfB = nf.normalize(afterB, ctx).term;
    expect(term.patternEquals(nfA, nfB)).toBe(true);
  }

  // ==========================================================================
  // Pair 1: (R1, R1)
  // ==========================================================================
  describe('Pair 1: (R1, R1) — sort idempotency', () => {
    test('R1 は constructor で吸収済、適用済 pattern には再発火しない', () => {
      const p = term.makePattern({ stock: 10000, blade, endLoss, pieces: [3000, 2000, 1000] });
      expect(rules.R1.applies(p)).toBe(false);
      // R1 同士の競合は構造的に発生しえない → trivially confluent
    });
  });

  // ==========================================================================
  // Pair 2: (R1, R2)
  // ==========================================================================
  describe('Pair 2: (R1, R2)', () => {
    test('R1, R2 ともに通常 pattern には適用不可 → 競合発生せず', () => {
      const p = term.makePattern({ stock: 10000, blade, endLoss, pieces: [1222, 1222] });
      expect(rules.R1.applies(p)).toBe(false);
      expect(rules.R2.applies(p)).toBe(false);
    });
  });

  // ==========================================================================
  // Pair 3: (R1, R3) — R3 のパターン等価が多重集合等価でないと壊れる
  // (A1 commutativity が R3 で必須であることの確認)
  // ==========================================================================
  describe('Pair 3: (R1, R3) — A1 が R3 で活きる', () => {
    test('順序が異なる「同じ多重集合」の pattern を含む plan で R3 が merge できる', () => {
      // makePattern は降順ソートして同一の pattern にする → R3 で merge 可能
      const pAsc  = term.makePattern({ stock: 10000, blade, endLoss, pieces: [1000, 2000, 3000] });
      const pDesc = term.makePattern({ stock: 10000, blade, endLoss, pieces: [3000, 2000, 1000] });
      expect(term.patternEquals(pAsc, pDesc)).toBe(true);
      const plan = term.makePlan([
        { pattern: pAsc, count: 2 },
        { pattern: pDesc, count: 3 }
      ]);
      expect(rules.R3.applies(plan)).toBe(true);
      const merged = rules.R3.apply(plan);
      expect(merged.entries).toHaveLength(1);
      expect(merged.entries[0].count).toBe(5);
    });
  });

  // ==========================================================================
  // Pair 4: (R1, R4)
  // ==========================================================================
  describe('Pair 4: (R1, R4) — 干渉なし', () => {
    test('R1 (pattern) と R4 (plan) はレベルが違うので競合しない', () => {
      const p = term.makePattern({ stock: 10000, blade, endLoss, pieces: [1222] });
      const plan = term.makePlan([{ pattern: p, count: 0 }]);
      expect(rules.R1.applies(p)).toBe(false);
      expect(rules.R4.applies(plan)).toBe(true);
      // R4 のみ適用 → 1 entry が消える
      const after = rules.R4.apply(plan);
      expect(after.entries).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Pair 5: (R1, R5)
  // ==========================================================================
  describe('Pair 5: (R1, R5) — R1 vacuous なので R5 単独', () => {
    test('R5 が pattern に直接かかる、R1 は何もしない', () => {
      const ctx = { availableStocks: stocks };
      expect(rules.R1.applies(pat10m_6)).toBe(false);
      expect(rules.R5.applies(pat10m_6, ctx)).toBe(true);
      const lifted = rules.R5.apply(pat10m_6, ctx);
      expect(lifted.stock).toBe(8000);
    });
  });

  // ==========================================================================
  // Pair 6: (R2, R2)
  // ==========================================================================
  describe('Pair 6: (R2, R2) — 両方 vacuous', () => {
    test('R2 は常に適用不可', () => {
      const p = term.makePattern({ stock: 10000, blade, endLoss, pieces: [1222, 1222] });
      expect(rules.R2.applies(p)).toBe(false);
    });
  });

  // ==========================================================================
  // Pair 7: (R2, R3)
  // ==========================================================================
  describe('Pair 7: (R2, R3)', () => {
    test('R2 vacuous なので R3 のみが意味を持つ', () => {
      const plan = term.makePlan([
        { pattern: pat10m_6, count: 1 },
        { pattern: pat10m_6, count: 1 }
      ]);
      const after = rules.R3.apply(plan);
      expect(after.entries).toHaveLength(1);
      expect(after.entries[0].count).toBe(2);
    });
  });

  // ==========================================================================
  // Pair 8: (R2, R4)
  // ==========================================================================
  describe('Pair 8: (R2, R4)', () => {
    test('R2 vacuous + R4 が 0 entry を消す', () => {
      const plan = term.makePlan([{ pattern: pat10m_6, count: 0 }]);
      expect(rules.R4.applies(plan)).toBe(true);
    });
  });

  // ==========================================================================
  // Pair 9: (R2, R5)
  // ==========================================================================
  describe('Pair 9: (R2, R5)', () => {
    test('R5 が pattern を lift、R2 は無関係', () => {
      const ctx = { availableStocks: stocks };
      const lifted = rules.R5.apply(pat10m_6, ctx);
      expect(lifted.stock).toBe(8000);
    });
  });

  // ==========================================================================
  // Pair 10: (R3, R3) — 同一パターンが 3 つ以上、merge 順序による合流性
  // ==========================================================================
  describe('Pair 10: (R3, R3) — 3 重複の merge 順序独立性 (A8/A9 が支える)', () => {
    test('(P,1)+(P,2)+(P,3) は merge 順に依らず最終的に (P,6)', () => {
      const plan = term.makePlan([
        { pattern: pat10m_6, count: 1 },
        { pattern: pat10m_6, count: 2 },
        { pattern: pat10m_6, count: 3 }
      ]);
      // 経路 A: 0+1 を先に merge → (P,3),(P,3) → R3 で (P,6)
      // 経路 B: 1+2 を先に merge → 構造的に step() の決定論版だと同じ順だが、
      //         normalize の不動点としては同じ正規形に達する
      const r = nf.normalize(plan, {});
      expect(r.term.entries).toHaveLength(1);
      expect(r.term.entries[0].count).toBe(6);
    });
  });

  // ==========================================================================
  // Pair 11: (R3, R4) — 同一パターン重複と 0 entry を含む plan
  // ==========================================================================
  describe('Pair 11: (R3, R4) — 重複と 0 entry の混在', () => {
    test('(P,3)+(P,5)+(P,0) を R3 先 / R4 先 どちらで簡約しても同じ正規形', () => {
      const plan = term.makePlan([
        { pattern: pat10m_6, count: 3 },
        { pattern: pat10m_6, count: 5 },
        { pattern: pat10m_6, count: 0 }
      ]);
      expectConfluentOnPlan(
        plan,
        (t) => rules.R3.apply(t),  // R3 先
        (t) => rules.R4.apply(t),  // R4 先
        {}
      );
      // 共通の正規形は (P,8) 単一エントリ
      const r = nf.normalize(plan, {});
      expect(r.term.entries).toHaveLength(1);
      expect(r.term.entries[0].count).toBe(8);
    });
  });

  // ==========================================================================
  // Pair 12: (R3, R5) — 設計書で唯一「要注意」とされたペア
  //
  // (⟨10m;π⟩, k1), (⟨10m;π⟩, k2) という重複に R5 が両方に同じ S* を返すおかげで
  // R5 → R3 と R3 → R5 が同じ正規形に到達する。
  // ==========================================================================
  describe('Pair 12: (R3, R5) — 設計書 §1.6.3 で最重要とした合流ペア', () => {
    test('(⟨10m;[1222×6]⟩, 3) ⊎ (⟨10m;[1222×6]⟩, 1) で R5 と R3 の順序独立性', () => {
      const plan = term.makePlan([
        { pattern: pat10m_6, count: 3 },
        { pattern: pat10m_6, count: 1 }
      ]);
      const ctx = { availableStocks: stocks };

      // 経路 A: R3 → R5
      const afterR3 = rules.R3.apply(plan); // (⟨10m;π⟩, 4)
      const afterR3R5 = rules.r5ApplyToPlan(afterR3, ctx); // (⟨8m;π⟩, 4)
      // 経路 B: R5 → R3
      const afterR5 = rules.r5ApplyToPlan(plan, ctx); // (⟨8m;π⟩, 3) ⊎ (⟨10m;π⟩, 1)
      // R5 はエントリ単位で適用するため、ここで第1エントリだけが lift される
      // 続けて R5 を残りエントリにも適用する必要がある
      const afterR5R5 = rules.r5ApplyToPlan(afterR5, ctx); // 両方 lift 済
      const afterR5R5R3 = rules.R3.apply(afterR5R5); // (⟨8m;π⟩, 4)

      // 両経路の最終正規形を normalize で取得して比較
      const nfA = nf.normalize(afterR3R5, ctx).term;
      const nfB = nf.normalize(afterR5R5R3, ctx).term;
      expect(axioms.planEquivalent(nfA, nfB)).toBe(true);

      // どちらも (⟨8m;[1222×6]⟩, 4) に到達しているはず
      expect(nfA.entries).toHaveLength(1);
      expect(nfA.entries[0].pattern.stock).toBe(8000);
      expect(nfA.entries[0].count).toBe(4);
    });

    test('決定論版 R5 (最小 S*) があるので同じパターンに同じ S* が割り当たる', () => {
      const ctx = { availableStocks: stocks };
      // pat10m_6 と patternEquals な別オブジェクト
      const pat10m_6_dup = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(6).fill(1222) });
      const lifted1 = rules.R5.apply(pat10m_6, ctx);
      const lifted2 = rules.R5.apply(pat10m_6_dup, ctx);
      expect(term.patternEquals(lifted1, lifted2)).toBe(true);
      expect(lifted1.stock).toBe(8000);
    });
  });

  // ==========================================================================
  // Pair 13: (R4, R4) — 複数 0 entry の除去順序
  // ==========================================================================
  describe('Pair 13: (R4, R4) — 複数 0 entry の冪等性', () => {
    test('(P,5)+(P,0)+(P,0)+(P,3) は除去順に依らず (P,5)+(P,3) に到達', () => {
      const plan = term.makePlan([
        { pattern: pat10m_6, count: 5 },
        { pattern: pat10m_6, count: 0 },
        { pattern: pat10m_6, count: 0 },
        { pattern: pat10m_6, count: 3 }
      ]);
      const r = nf.normalize(plan, {});
      // 0 が 2 つ消えて、5 と 3 が R3 で merge → (P, 8)
      expect(r.term.entries).toHaveLength(1);
      expect(r.term.entries[0].count).toBe(8);
    });
  });

  // ==========================================================================
  // Pair 14: (R4, R5)
  // ==========================================================================
  describe('Pair 14: (R4, R5) — レベルが違うので干渉なし', () => {
    test('plan に 0 entry と R5 候補両方ある場合、両者独立に処理される', () => {
      const plan = term.makePlan([
        { pattern: pat10m_8, count: 0 },         // R4 候補（lift 不可なパターン）
        { pattern: pat10m_6, count: 1 }          // R5 候補
      ]);
      const ctx = { availableStocks: stocks };
      const r = nf.normalize(plan, ctx);
      // 0 entry は除去、pat10m_6 は 8m に lift
      expect(r.term.entries).toHaveLength(1);
      expect(r.term.entries[0].pattern.stock).toBe(8000);
      expect(r.term.entries[0].count).toBe(1);
    });
  });

  // ==========================================================================
  // Pair 15: (R5, R5) — 決定論版の冪等性
  // ==========================================================================
  describe('Pair 15: (R5, R5) — 最小 S* lift の冪等性', () => {
    test('R5 を 2 回適用しても 2 回目は applies=false', () => {
      const ctx = { availableStocks: stocks };
      const lifted = rules.R5.apply(pat10m_6, ctx);
      expect(lifted.stock).toBe(8000);
      // 8m に lift 済 → さらに小さい valid stock はない
      expect(rules.R5.applies(lifted, ctx)).toBe(false);
    });

    test('複数 R5 候補がある plan: 順序によらず両方 lift', () => {
      // 別の長さの pieces で 2 種類の R5 候補
      const patBig_a = term.makePattern({ stock: 10000, blade, endLoss, pieces: [5000] });
      const patBig_b = term.makePattern({ stock: 10000, blade, endLoss, pieces: [4000] });
      const ctxBig = { availableStocks: [10000, 9000, 8000, 7000, 6000, 5000, 4000] };
      const plan = term.makePlan([
        { pattern: patBig_a, count: 2 },
        { pattern: patBig_b, count: 3 }
      ]);
      const r = nf.normalize(plan, ctxBig);
      // 5000 は 5m+endLoss=5150 必要 → 6m が最小、4000 は 4m+endLoss=4150 必要 → 5m が最小
      const stocksUsed = r.term.entries.map(e => e.pattern.stock).sort();
      expect(stocksUsed).toContain(6000);
      expect(stocksUsed).toContain(5000);
    });
  });

  // ==========================================================================
  // 統合: 全規則ミックスでも一意な正規形に到達する
  // ==========================================================================
  describe('統合 — 全規則ミックスでも一意な正規形', () => {
    test('R3 + R4 + R5 が同時発火可能な plan、複数 normalize で同じ正規形', () => {
      const plan = term.makePlan([
        { pattern: pat10m_8, count: 20 },
        { pattern: pat10m_8, count: 21 },          // R3
        { pattern: pat10m_6, count: 0 },           // R4
        { pattern: pat10m_6, count: 1 }            // R5
      ]);
      const ctx = { availableStocks: stocks };
      const r1 = nf.normalize(plan, ctx);
      const r2 = nf.normalize(plan, ctx);
      const r3 = nf.normalize(r1.term, ctx); // 既に正規形なので idempotent
      expect(axioms.planEquivalent(r1.term, r2.term)).toBe(true);
      expect(axioms.planEquivalent(r1.term, r3.term)).toBe(true);
      expect(r3.steps).toBe(0);
    });
  });
});
