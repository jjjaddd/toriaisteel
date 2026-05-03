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
    'src/calculation/yield/algebra/axioms.js'
  ]) {
    const code = fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
  }
  return sandbox.Toriai.calculation.yield.algebra;
}

describe('algebra/axioms — A1〜A9 verification + PLAN combinators', () => {
  let term, axioms;
  beforeAll(() => {
    const algebra = loadAlgebra();
    term = algebra.term;
    axioms = algebra.axioms;
  });

  // -------------------------------------------------------------------------
  // PLAN 結合子 concatPlan
  // -------------------------------------------------------------------------
  describe('concatPlan', () => {
    test('concat with empty plan yields original entries', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      const planA = term.makePlan([{ pattern: p, count: 5 }]);
      const result = axioms.concatPlan(planA, term.emptyPlan());
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].count).toBe(5);
    });

    test('concat preserves order of entries (concatenation, not merge)', () => {
      const pat = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      const planA = term.makePlan([{ pattern: pat, count: 3 }]);
      const planB = term.makePlan([{ pattern: pat, count: 4 }]);
      const result = axioms.concatPlan(planA, planB);
      // 集約は R3 の仕事。concatPlan は単なる連結なので 2 エントリのまま
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].count).toBe(3);
      expect(result.entries[1].count).toBe(4);
    });

    test('rejects non-plan arguments', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      expect(() => axioms.concatPlan(p, term.emptyPlan())).toThrow();
      expect(() => axioms.concatPlan(term.emptyPlan(), null)).toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // planEquivalent — R3 lift-merge を先取りした多重集合等価
  // -------------------------------------------------------------------------
  describe('planEquivalent', () => {
    let pat10m_8, pat10m_6, pat9m_6;
    beforeAll(() => {
      pat10m_8 = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(8).fill(1222) });
      pat10m_6 = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      pat9m_6  = term.makePattern({ stock:  9000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
    });

    test('reflexivity: any plan is equivalent to itself', () => {
      const plan = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat10m_6, count: 1 }
      ]);
      expect(axioms.planEquivalent(plan, plan)).toBe(true);
    });

    test('entry order does not matter (A9)', () => {
      const plan1 = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat9m_6, count: 1 }
      ]);
      const plan2 = term.makePlan([
        { pattern: pat9m_6, count: 1 },
        { pattern: pat10m_8, count: 41 }
      ]);
      expect(axioms.planEquivalent(plan1, plan2)).toBe(true);
    });

    test('duplicate entries are merged virtually (R3 preview)', () => {
      const planSplit = term.makePlan([
        { pattern: pat10m_8, count: 20 },
        { pattern: pat10m_8, count: 21 }
      ]);
      const planMerged = term.makePlan([
        { pattern: pat10m_8, count: 41 }
      ]);
      expect(axioms.planEquivalent(planSplit, planMerged)).toBe(true);
    });

    test('count=0 entries are ignored (A6 preview)', () => {
      const planWithZero = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat10m_6, count: 0 }
      ]);
      const planClean = term.makePlan([
        { pattern: pat10m_8, count: 41 }
      ]);
      expect(axioms.planEquivalent(planWithZero, planClean)).toBe(true);
    });

    test('different stocks for same pieces are NOT equivalent', () => {
      const planA = term.makePlan([{ pattern: pat10m_6, count: 1 }]);
      const planB = term.makePlan([{ pattern: pat9m_6,  count: 1 }]);
      expect(axioms.planEquivalent(planA, planB)).toBe(false);
    });

    test('different counts are NOT equivalent', () => {
      const planA = term.makePlan([{ pattern: pat10m_8, count: 41 }]);
      const planB = term.makePlan([{ pattern: pat10m_8, count: 42 }]);
      expect(axioms.planEquivalent(planA, planB)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // A1: 部材の交換律
  // -------------------------------------------------------------------------
  describe('A1 — 部材の交換律', () => {
    test('reordered pieces yield equal patterns', () => {
      const r = axioms.verifyA1(10000, 3, 150, [1000, 3000, 2000], [3000, 2000, 1000]);
      expect(r.holds).toBe(true);
    });

    test('many-piece random-shuffle invariance', () => {
      const original = [1222, 1222, 1222, 1222, 1222, 1222, 1222, 1222];
      const shuffled = original.slice().reverse(); // trivial here, but confirms operator invariance
      const r = axioms.verifyA1(10000, 3, 150, original, shuffled);
      expect(r.holds).toBe(true);
    });

    test('non-multiset-equal inputs fail at the input check', () => {
      const r = axioms.verifyA1(10000, 3, 150, [1000, 2000], [1000, 2001]);
      expect(r.holds).toBe(false);
      expect(r.reason).toMatch(/multiset-equal/);
    });
  });

  // -------------------------------------------------------------------------
  // A2: 部材の結合律
  // -------------------------------------------------------------------------
  describe('A2 — 部材の結合律', () => {
    test('any insertion order yields the same flat pattern', () => {
      const r = axioms.verifyA2(10000, 3, 150, [1000], [2000], [3000]);
      expect(r.holds).toBe(true);
    });

    test('with empty sub-arrays', () => {
      const r = axioms.verifyA2(10000, 3, 150, [], [1222, 1222], [1222]);
      expect(r.holds).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // A3: 表記上の重複圧縮（representational, not semantic）
  // -------------------------------------------------------------------------
  describe('A3 — 表記上の重複圧縮（representational）', () => {
    test('repeated pieces produce stable normal form', () => {
      const r = axioms.verifyA3(10000, 3, 150, 1222, 8);
      expect(r.holds).toBe(true);
    });

    test('rejects non-positive repeatCount', () => {
      const r = axioms.verifyA3(10000, 3, 150, 1222, 0);
      expect(r.holds).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // A4: 容量制約
  // -------------------------------------------------------------------------
  describe('A4 — 容量制約', () => {
    test('valid pattern passes', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(8).fill(1222) });
      expect(axioms.verifyA4(p).holds).toBe(true);
    });

    test('non-pattern argument fails', () => {
      expect(axioms.verifyA4({}).holds).toBe(false);
      expect(axioms.verifyA4(null).holds).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // A5: 昇格不変性 — yield(P @ S') ≤ yield(P @ S) for S' > S
  // BUG-V2-001 の核心: 9m → 10m に上げると yield が下がる
  // -------------------------------------------------------------------------
  describe('A5 — 昇格不変性（BUG-V2-001 の核心）', () => {
    test('lifting [1222 × 6] from 9m → 10m: yield strictly decreases', () => {
      const pat9m = term.makePattern({ stock: 9000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      const r = axioms.verifyA5(pat9m, 10000);
      expect(r.holds).toBe(true);
    });

    test('lifting to same stock: yield unchanged (boundary case)', () => {
      const pat9m = term.makePattern({ stock: 9000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      const r = axioms.verifyA5(pat9m, 9000);
      expect(r.holds).toBe(true);
    });

    test('rejects lifting to smaller stock (axiom direction)', () => {
      const pat10m = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      const r = axioms.verifyA5(pat10m, 9000);
      expect(r.holds).toBe(false);
      expect(r.reason).toMatch(/largerStock/);
    });

    test('numeric verification: yield gap from 9m to 10m', () => {
      const pat9m  = term.makePattern({ stock:  9000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      const pat10m = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      // 9m: 7332 / 8850 ≈ 82.85%
      // 10m: 7332 / 9850 ≈ 74.44%
      expect(term.patYield(pat9m)).toBeGreaterThan(term.patYield(pat10m));
      expect(term.patYield(pat9m)).toBeCloseTo(7332 / 8850, 6);
      expect(term.patYield(pat10m)).toBeCloseTo(7332 / 9850, 6);
    });
  });

  // -------------------------------------------------------------------------
  // A6: 0 本エントリの単位元性
  // -------------------------------------------------------------------------
  describe('A6 — 0 本エントリの単位元性', () => {
    let pat;
    beforeAll(() => {
      pat = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
    });

    test('removing a count=0 entry preserves planEquivalent and metrics', () => {
      const plan = term.makePlan([
        { pattern: pat, count: 5 },
        { pattern: pat, count: 0 }
      ]);
      const r = axioms.verifyA6(plan, 1);
      expect(r.holds).toBe(true);
    });

    test('rejects pointing at a non-zero entry', () => {
      const plan = term.makePlan([{ pattern: pat, count: 5 }]);
      const r = axioms.verifyA6(plan, 0);
      expect(r.holds).toBe(false);
    });

    test('rejects out-of-range index', () => {
      const plan = term.makePlan([{ pattern: pat, count: 0 }]);
      expect(axioms.verifyA6(plan, 99).holds).toBe(false);
      expect(axioms.verifyA6(plan, -1).holds).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // A7: PLAN の単位元
  // -------------------------------------------------------------------------
  describe('A7 — PLAN の単位元 X ⊎ ε ≡ X', () => {
    test('plan ⊎ empty == plan', () => {
      const pat = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      const plan = term.makePlan([{ pattern: pat, count: 5 }]);
      expect(axioms.verifyA7(plan).holds).toBe(true);
    });

    test('empty plan ⊎ empty plan == empty plan', () => {
      expect(axioms.verifyA7(term.emptyPlan()).holds).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // A8: PLAN の結合律
  // -------------------------------------------------------------------------
  describe('A8 — PLAN の結合律', () => {
    test('(X ⊎ Y) ⊎ Z ≡ X ⊎ (Y ⊎ Z)', () => {
      const pat10m_8 = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(8).fill(1222) });
      const pat10m_6 = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      const pat9m_6  = term.makePattern({ stock:  9000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });

      const X = term.makePlan([{ pattern: pat10m_8, count: 41 }]);
      const Y = term.makePlan([{ pattern: pat10m_6, count: 1 }]);
      const Z = term.makePlan([{ pattern: pat9m_6, count: 2 }]);

      expect(axioms.verifyA8(X, Y, Z).holds).toBe(true);
    });

    test('with empty plans interleaved', () => {
      const pat = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      const X = term.makePlan([{ pattern: pat, count: 1 }]);
      const E = term.emptyPlan();
      expect(axioms.verifyA8(X, E, X).holds).toBe(true);
      expect(axioms.verifyA8(E, X, E).holds).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // A9: PLAN の交換律
  // -------------------------------------------------------------------------
  describe('A9 — PLAN の交換律', () => {
    test('X ⊎ Y ≡ Y ⊎ X', () => {
      const pat10m = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(8).fill(1222) });
      const pat9m  = term.makePattern({ stock:  9000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      const X = term.makePlan([{ pattern: pat10m, count: 41 }]);
      const Y = term.makePlan([{ pattern: pat9m, count: 1 }]);
      expect(axioms.verifyA9(X, Y).holds).toBe(true);
    });

    test('reflexive case X ⊎ X', () => {
      const pat = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      const X = term.makePlan([{ pattern: pat, count: 5 }]);
      expect(axioms.verifyA9(X, X).holds).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // BUG-V2-001 統合シナリオ
  // V2 plan と Optimal plan の代数的関係性を確認
  // -------------------------------------------------------------------------
  describe('BUG-V2-001 統合 — V2 と Optimal の代数的検証', () => {
    let pat10m_8, pat10m_6, pat9m_6;
    let v2Plan, optimalPlan;
    beforeAll(() => {
      pat10m_8 = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(8).fill(1222) });
      pat10m_6 = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      pat9m_6  = term.makePattern({ stock:  9000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      v2Plan = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat10m_6, count: 1 }
      ]);
      optimalPlan = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat9m_6, count: 1 }
      ]);
    });

    test('V2 plan ≢ Optimal plan (異なる代数オブジェクト)', () => {
      expect(axioms.planEquivalent(v2Plan, optimalPlan)).toBe(false);
    });

    test('A5 が両者の歩留まり差を説明する: pat10m_6 を pat9m_6 から lift', () => {
      const r = axioms.verifyA5(pat9m_6, 10000);
      expect(r.holds).toBe(true);
      // つまり pat10m_6 は pat9m_6 を lift した結果で、yield は下がっている = 損失増加
    });

    test('Optimal の patternKey が V2 のものと異なる（探索空間で別変数）', () => {
      const v2Key = term.patternKey(pat10m_6);
      const optKey = term.patternKey(pat9m_6);
      expect(v2Key).not.toBe(optKey);
    });

    test('A8/A9 により entry 順序は plan の同一性に影響しない（最適化は順序に依存してはならない）', () => {
      const v2Reordered = term.makePlan([
        { pattern: pat10m_6, count: 1 },
        { pattern: pat10m_8, count: 41 }
      ]);
      expect(axioms.planEquivalent(v2Plan, v2Reordered)).toBe(true);
    });
  });
});
