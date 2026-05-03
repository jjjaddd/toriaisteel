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
    'src/calculation/yield/algebra/rewriteRules.js'
  ]) {
    const code = fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
  }
  return sandbox.Toriai.calculation.yield.algebra;
}

describe('algebra/rewriteRules — R1〜R5 + step dispatcher', () => {
  let term, axioms, rules;
  beforeAll(() => {
    const a = loadAlgebra();
    term = a.term;
    axioms = a.axioms;
    rules = a.rewriteRules;
  });

  // -------------------------------------------------------------------------
  // R1: sort (vacuous in normal use, but should detect unsorted input)
  // -------------------------------------------------------------------------
  describe('R1 — sort', () => {
    test('does not apply to a freshly-built pattern (constructor sorts)', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [3000, 2000, 1000] });
      expect(rules.R1.applies(p)).toBe(false);
    });

    test('non-pattern argument', () => {
      expect(rules.R1.applies(null)).toBe(false);
      expect(rules.R1.applies({})).toBe(false);
    });

    test('apply throws when not applicable', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [3000, 2000, 1000] });
      expect(() => rules.R1.apply(p)).toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // R2: collapse — vacuous in flat-list representation
  // -------------------------------------------------------------------------
  describe('R2 — collapse', () => {
    test('never applies (representational only)', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222, 1222, 1222] });
      expect(rules.R2.applies(p)).toBe(false);
    });

    test('apply throws unconditionally', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      expect(() => rules.R2.apply(p)).toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // R3: lift-merge
  // -------------------------------------------------------------------------
  describe('R3 — lift-merge', () => {
    let pat;
    beforeAll(() => {
      pat = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
    });

    test('applies when same pattern appears twice', () => {
      const plan = term.makePlan([
        { pattern: pat, count: 3 },
        { pattern: pat, count: 5 }
      ]);
      expect(rules.R3.applies(plan)).toBe(true);
    });

    test('does not apply when all entries are unique', () => {
      const pat2 = term.makePattern({ stock: 9000, blade: 3, endLoss: 150, pieces: [1222] });
      const plan = term.makePlan([
        { pattern: pat, count: 3 },
        { pattern: pat2, count: 5 }
      ]);
      expect(rules.R3.applies(plan)).toBe(false);
    });

    test('apply merges first duplicate, sums counts', () => {
      const plan = term.makePlan([
        { pattern: pat, count: 3 },
        { pattern: pat, count: 5 }
      ]);
      const result = rules.R3.apply(plan);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].count).toBe(8);
    });

    test('apply with three duplicates only merges first pair (one step)', () => {
      const plan = term.makePlan([
        { pattern: pat, count: 1 },
        { pattern: pat, count: 2 },
        { pattern: pat, count: 4 }
      ]);
      const result = rules.R3.apply(plan);
      // Step 1: merge entries 0+1 -> count 3, leave entry 2 as count 4
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].count).toBe(3);
      expect(result.entries[1].count).toBe(4);
      // Re-apply to fully merge
      const result2 = rules.R3.apply(result);
      expect(result2.entries).toHaveLength(1);
      expect(result2.entries[0].count).toBe(7);
    });

    test('preserves planEquivalent semantics', () => {
      const plan = term.makePlan([
        { pattern: pat, count: 3 },
        { pattern: pat, count: 5 }
      ]);
      const after = rules.R3.apply(plan);
      expect(axioms.planEquivalent(plan, after)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // R4: prune-empty
  // -------------------------------------------------------------------------
  describe('R4 — prune-empty', () => {
    let pat;
    beforeAll(() => {
      pat = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
    });

    test('applies when count=0 entry present', () => {
      const plan = term.makePlan([
        { pattern: pat, count: 5 },
        { pattern: pat, count: 0 }
      ]);
      expect(rules.R4.applies(plan)).toBe(true);
    });

    test('does not apply when all counts > 0', () => {
      const plan = term.makePlan([{ pattern: pat, count: 5 }]);
      expect(rules.R4.applies(plan)).toBe(false);
    });

    test('apply removes first count=0 entry', () => {
      const plan = term.makePlan([
        { pattern: pat, count: 5 },
        { pattern: pat, count: 0 },
        { pattern: pat, count: 3 }
      ]);
      const result = rules.R4.apply(plan);
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].count).toBe(5);
      expect(result.entries[1].count).toBe(3);
    });

    test('preserves planEquivalent (A6)', () => {
      const plan = term.makePlan([
        { pattern: pat, count: 5 },
        { pattern: pat, count: 0 }
      ]);
      const after = rules.R4.apply(plan);
      expect(axioms.planEquivalent(plan, after)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // R5: dominance — BUG-V2-001 の核心
  // -------------------------------------------------------------------------
  describe('R5 — dominance', () => {
    let pat10m_8, pat10m_6;
    beforeAll(() => {
      pat10m_8 = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(8).fill(1222) });
      pat10m_6 = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
    });

    test('applies when smaller valid stock exists', () => {
      // pat10m_6 needs eff ≥ 7347, so 8m (eff 7850) suffices, 9m (8850) too
      const ctx = { availableStocks: [10000, 9000, 8000] };
      expect(rules.R5.applies(pat10m_6, ctx)).toBe(true);
    });

    test('does not apply when no smaller stock is valid', () => {
      // pat10m_8 needs eff ≥ 9797, only 10m fits -> R5 cannot apply
      const ctx = { availableStocks: [10000, 9000, 8000] };
      expect(rules.R5.applies(pat10m_8, ctx)).toBe(false);
    });

    test('does not apply without ctx.availableStocks', () => {
      expect(rules.R5.applies(pat10m_6)).toBe(false);
      expect(rules.R5.applies(pat10m_6, {})).toBe(false);
      expect(rules.R5.applies(pat10m_6, { availableStocks: 'oops' })).toBe(false);
    });

    test('apply lifts to MINIMUM valid smaller stock (deterministic)', () => {
      const ctx = { availableStocks: [10000, 9000, 8000] };
      const result = rules.R5.apply(pat10m_6, ctx);
      expect(result.stock).toBe(8000); // smallest valid
      expect(result.pieces).toEqual(pat10m_6.pieces);
    });

    test('apply respects availableStocks restriction', () => {
      // Without 8m: smallest valid is 9m
      const ctx = { availableStocks: [10000, 9000] };
      const result = rules.R5.apply(pat10m_6, ctx);
      expect(result.stock).toBe(9000);
    });

    test('throws when no dominating stock exists', () => {
      const ctx = { availableStocks: [10000] };
      expect(() => rules.R5.apply(pat10m_6, ctx)).toThrow();
    });

    test('R5 lift increases yield (A5 corollary)', () => {
      const ctx = { availableStocks: [10000, 9000, 8000] };
      const lifted = rules.R5.apply(pat10m_6, ctx);
      expect(term.patYield(lifted)).toBeGreaterThan(term.patYield(pat10m_6));
    });

    test('R5 strictly decreases stock (terminating)', () => {
      const ctx = { availableStocks: [10000, 9000, 8000] };
      const lifted = rules.R5.apply(pat10m_6, ctx);
      expect(lifted.stock).toBeLessThan(pat10m_6.stock);
    });
  });

  // -------------------------------------------------------------------------
  // r5ApplyToPlan / r5AppliesToPlan — PLAN レベル
  // -------------------------------------------------------------------------
  describe('r5ApplyToPlan / r5AppliesToPlan', () => {
    let pat10m_8, pat10m_6, pat8m_6;
    beforeAll(() => {
      pat10m_8 = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(8).fill(1222) });
      pat10m_6 = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      pat8m_6  = term.makePattern({ stock: 8000,  blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
    });

    test('applies to plan if any entry has dominating stock', () => {
      const v2Plan = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat10m_6, count: 1 }
      ]);
      const ctx = { availableStocks: [10000, 9000, 8000] };
      expect(rules.r5AppliesToPlan(v2Plan, ctx)).toBe(true);
    });

    test('apply lifts the FIRST applicable entry only', () => {
      const v2Plan = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat10m_6, count: 1 }
      ]);
      const ctx = { availableStocks: [10000, 9000, 8000] };
      const result = rules.r5ApplyToPlan(v2Plan, ctx);
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].pattern.stock).toBe(10000); // unchanged
      expect(result.entries[0].count).toBe(41);
      expect(result.entries[1].pattern.stock).toBe(8000); // lifted
      expect(result.entries[1].count).toBe(1);
    });

    test('produces the optimal BUG-V2-001 plan', () => {
      const v2Plan = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat10m_6, count: 1 }
      ]);
      const ctx = { availableStocks: [10000, 9000, 8000] };
      const result = rules.r5ApplyToPlan(v2Plan, ctx);
      const m = term.planMetrics(result);
      // Optimal with 8m = 41×10000 + 1×8000 = 418,000
      expect(m.stockTotal).toBe(418000);
      // V2 was 420,000 → save 2,000mm
      expect(term.planMetrics(v2Plan).stockTotal - m.stockTotal).toBe(2000);
    });

    test('with availableStocks=[10000, 9000] only, lifts to 9m (saves 1000mm)', () => {
      const v2Plan = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat10m_6, count: 1 }
      ]);
      const ctx = { availableStocks: [10000, 9000] };
      const result = rules.r5ApplyToPlan(v2Plan, ctx);
      const m = term.planMetrics(result);
      expect(m.stockTotal).toBe(419000);
    });

    test('throws if no entry can be lifted', () => {
      const plan = term.makePlan([{ pattern: pat10m_8, count: 41 }]);
      const ctx = { availableStocks: [10000, 9000, 8000] };
      expect(() => rules.r5ApplyToPlan(plan, ctx)).toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // step dispatcher
  // -------------------------------------------------------------------------
  describe('step — 1-step dispatcher', () => {
    let pat10m_8, pat10m_6;
    beforeAll(() => {
      pat10m_8 = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(8).fill(1222) });
      pat10m_6 = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
    });

    test('returns fired=false for a normal-form term', () => {
      const ctx = { availableStocks: [10000] }; // no smaller stocks → R5 can't fire
      const r = rules.step(pat10m_6, ctx);
      expect(r.fired).toBe(false);
      expect(r.term).toBe(pat10m_6);
    });

    test('PLAN: R4 fires before R3 (priority)', () => {
      const plan = term.makePlan([
        { pattern: pat10m_6, count: 0 },
        { pattern: pat10m_6, count: 5 }
      ]);
      const r = rules.step(plan, {});
      expect(r.fired).toBe(true);
      expect(r.ruleName).toBe('R4.prune-empty');
    });

    test('PLAN: R3 fires when no R4 candidate exists', () => {
      const plan = term.makePlan([
        { pattern: pat10m_6, count: 3 },
        { pattern: pat10m_6, count: 5 }
      ]);
      const r = rules.step(plan, {});
      expect(r.fired).toBe(true);
      expect(r.ruleName).toBe('R3.lift-merge');
    });

    test('PLAN: R5 fires last, when neither R3 nor R4 can', () => {
      const plan = term.makePlan([{ pattern: pat10m_6, count: 1 }]);
      const ctx = { availableStocks: [10000, 8000] };
      const r = rules.step(plan, ctx);
      expect(r.fired).toBe(true);
      expect(r.ruleName).toBe('R5.dominance(plan)');
    });

    test('PATTERN: R5 fires when smaller stock available', () => {
      const ctx = { availableStocks: [10000, 9000, 8000] };
      const r = rules.step(pat10m_6, ctx);
      expect(r.fired).toBe(true);
      expect(r.ruleName).toBe('R5.dominance');
      expect(r.term.stock).toBe(8000);
    });
  });

  // -------------------------------------------------------------------------
  // BUG-V2-001 統合: V2 plan を rewriteRules だけで Optimal plan に変換
  // -------------------------------------------------------------------------
  describe('BUG-V2-001 integration: V2 plan → Optimal via R5', () => {
    test('single R5 application on the right entry produces the optimal plan', () => {
      const blade = 3;
      const endLoss = 150;
      const pat10m_8 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(8).fill(1222) });
      const pat10m_6 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(6).fill(1222) });
      const pat8m_6  = term.makePattern({ stock:  8000, blade, endLoss, pieces: Array(6).fill(1222) });

      const v2Plan = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat10m_6, count: 1 }
      ]);
      const optimalExpected = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat8m_6, count: 1 }
      ]);

      const ctx = { availableStocks: [10000, 9000, 8000] };
      const result = rules.r5ApplyToPlan(v2Plan, ctx);
      expect(axioms.planEquivalent(result, optimalExpected)).toBe(true);
      // 全部材数は不変
      expect(term.planMetrics(result).pieceTotal).toBe(term.planMetrics(v2Plan).pieceTotal);
      // 母材総量は減る
      expect(term.planMetrics(result).stockTotal).toBeLessThan(term.planMetrics(v2Plan).stockTotal);
    });

    test('step() applied to V2 plan eventually reaches the optimal (manual fixed-point)', () => {
      const blade = 3;
      const endLoss = 150;
      const pat10m_8 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(8).fill(1222) });
      const pat10m_6 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(6).fill(1222) });

      let current = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat10m_6, count: 1 }
      ]);
      const ctx = { availableStocks: [10000, 9000, 8000] };

      // Step until quiescent (manual fixed-point; normalForm.js will automate this)
      const trace = [];
      for (let i = 0; i < 20; i++) {
        const r = rules.step(current, ctx);
        if (!r.fired) break;
        trace.push(r.ruleName);
        current = r.term;
      }
      // Expected: R5 fires once (lifts the pat10m_6 entry to 8m). No further rules apply.
      expect(trace).toEqual(['R5.dominance(plan)']);
      expect(term.planMetrics(current).stockTotal).toBe(418000);
    });
  });
});
