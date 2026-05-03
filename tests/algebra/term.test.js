const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

function loadTerm() {
  const sandbox = { console };
  vm.createContext(sandbox);
  for (const rel of [
    'src/core/toriai-namespace.js',
    'src/calculation/yield/algebra/term.js'
  ]) {
    const code = fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
  }
  return sandbox.Toriai.calculation.yield.algebra.term;
}

describe('algebra/term — TERM constructors and validators', () => {
  let term;
  beforeAll(() => { term = loadTerm(); });

  // -------------------------------------------------------------------------
  // ATOM
  // -------------------------------------------------------------------------
  describe('makeAtom', () => {
    test('accepts a positive integer length', () => {
      const a = term.makeAtom(1222);
      expect(a.type).toBe(term.ATOM);
      expect(a.length).toBe(1222);
      expect(term.isAtom(a)).toBe(true);
    });

    test('rejects 0, negative, non-integer, NaN', () => {
      expect(() => term.makeAtom(0)).toThrow();
      expect(() => term.makeAtom(-1)).toThrow();
      expect(() => term.makeAtom(1.5)).toThrow();
      expect(() => term.makeAtom(NaN)).toThrow();
      expect(() => term.makeAtom('1222')).toThrow();
      expect(() => term.makeAtom(undefined)).toThrow();
    });

    test('returned atom is frozen (immutable)', () => {
      const a = term.makeAtom(1222);
      expect(Object.isFrozen(a)).toBe(true);
      expect(() => { 'use strict'; a.length = 9999; }).toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // PATTERN
  // -------------------------------------------------------------------------
  describe('makePattern', () => {
    const baseSpec = { stock: 10000, blade: 3, endLoss: 150 };

    test('builds a valid pattern with sorted pieces', () => {
      const p = term.makePattern({ ...baseSpec, pieces: [1222, 1222, 1222, 1222, 1222, 1222, 1222, 1222] });
      expect(p.type).toBe(term.PATTERN);
      expect(p.stock).toBe(10000);
      expect(p.pieces).toHaveLength(8);
      expect(p.pieces.every(n => n === 1222)).toBe(true);
    });

    test('sorts pieces in descending order on construction (R1 enforced at constructor)', () => {
      const p = term.makePattern({ ...baseSpec, pieces: [1000, 3000, 2000] });
      expect(p.pieces).toEqual([3000, 2000, 1000]);
    });

    test('does not mutate the input pieces array', () => {
      const input = [1000, 3000, 2000];
      term.makePattern({ ...baseSpec, pieces: input });
      expect(input).toEqual([1000, 3000, 2000]);
    });

    test('rejects when total size > effective length', () => {
      // 1222 * 9 + 8*3 = 10998 + 24 = 11022 > 9850
      expect(() => term.makePattern({ ...baseSpec, pieces: Array(9).fill(1222) })).toThrow();
    });

    test('rejects negative or zero piece lengths', () => {
      expect(() => term.makePattern({ ...baseSpec, pieces: [1222, 0, 1222] })).toThrow();
      expect(() => term.makePattern({ ...baseSpec, pieces: [1222, -1, 1222] })).toThrow();
    });

    test('rejects invalid stock / blade / endLoss', () => {
      expect(() => term.makePattern({ ...baseSpec, stock: 0, pieces: [100] })).toThrow();
      expect(() => term.makePattern({ ...baseSpec, stock: -10, pieces: [100] })).toThrow();
      expect(() => term.makePattern({ stock: 10000, blade: -1, endLoss: 150, pieces: [100] })).toThrow();
      expect(() => term.makePattern({ stock: 10000, blade: 3, endLoss: -1, pieces: [100] })).toThrow();
    });

    test('rejects when endLoss >= stock (effective length non-positive)', () => {
      expect(() => term.makePattern({ stock: 100, blade: 0, endLoss: 100, pieces: [50] })).toThrow();
      expect(() => term.makePattern({ stock: 100, blade: 0, endLoss: 200, pieces: [50] })).toThrow();
    });

    test('accepts empty pieces (representational ε pattern)', () => {
      const p = term.makePattern({ ...baseSpec, pieces: [] });
      expect(p.pieces).toHaveLength(0);
      expect(term.patSize(p)).toBe(0);
    });

    test('accepts a single piece (no blade subtraction for n=1)', () => {
      const p = term.makePattern({ ...baseSpec, pieces: [9000] });
      // 9000 + 0*3 = 9000 <= 9850 → valid
      expect(term.patSize(p)).toBe(9000);
    });

    test('returned pattern and pieces array are frozen', () => {
      const p = term.makePattern({ ...baseSpec, pieces: [1222, 1222] });
      expect(Object.isFrozen(p)).toBe(true);
      expect(Object.isFrozen(p.pieces)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // patSize / patLoss / patYield — BUG-V2-001 数値再現
  // -------------------------------------------------------------------------
  describe('pattern metrics — verified against BUG-V2-001 hand calculation', () => {
    const blade = 3;
    const endLoss = 150;

    test('[1222 × 8] in 10m bar: size 9797, loss 53', () => {
      const p = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(8).fill(1222) });
      expect(term.patSize(p)).toBe(9797); // 1222*8 + 7*3
      expect(term.patEff(p)).toBe(9850);  // 10000 - 150
      expect(term.patLoss(p)).toBe(53);
    });

    test('[1222 × 6] in 10m bar: size 7347, loss 2503 (the V2 bug)', () => {
      const p = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(6).fill(1222) });
      expect(term.patSize(p)).toBe(7347); // 1222*6 + 5*3
      expect(term.patLoss(p)).toBe(2503);
    });

    test('[1222 × 6] in 9m bar: loss 1503 (the optimal swap)', () => {
      const p = term.makePattern({ stock: 9000, blade, endLoss, pieces: Array(6).fill(1222) });
      expect(term.patEff(p)).toBe(8850);
      expect(term.patSize(p)).toBe(7347);
      expect(term.patLoss(p)).toBe(1503);
    });

    test('patYield = pieces / eff', () => {
      const p = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(8).fill(1222) });
      // 1222*8 / 9850 = 9776 / 9850 ≈ 0.99249
      expect(term.patYield(p)).toBeCloseTo(9776 / 9850, 6);
    });
  });

  // -------------------------------------------------------------------------
  // patternEquals / patternKey
  // -------------------------------------------------------------------------
  describe('patternEquals (multiset semantics)', () => {
    const baseSpec = { stock: 10000, blade: 3, endLoss: 150 };

    test('order-independent equality (A1 commutativity)', () => {
      const a = term.makePattern({ ...baseSpec, pieces: [3000, 2000, 1000] });
      const b = term.makePattern({ ...baseSpec, pieces: [1000, 2000, 3000] });
      expect(term.patternEquals(a, b)).toBe(true);
    });

    test('multiset cardinality matters', () => {
      const a = term.makePattern({ ...baseSpec, pieces: [1000, 1000, 2000] });
      const b = term.makePattern({ ...baseSpec, pieces: [1000, 2000, 2000] });
      expect(term.patternEquals(a, b)).toBe(false);
    });

    test('different stock / blade / endLoss are not equal even with same pieces', () => {
      const a = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      const b = term.makePattern({ stock: 9000,  blade: 3, endLoss: 150, pieces: [1222] });
      expect(term.patternEquals(a, b)).toBe(false);
    });

    test('patternKey collides iff patternEquals returns true', () => {
      const a = term.makePattern({ ...baseSpec, pieces: [3000, 2000, 1000] });
      const b = term.makePattern({ ...baseSpec, pieces: [1000, 2000, 3000] });
      const c = term.makePattern({ ...baseSpec, pieces: [3000, 2000, 1000, 1000] });
      expect(term.patternKey(a)).toBe(term.patternKey(b));
      expect(term.patternKey(a)).not.toBe(term.patternKey(c));
    });
  });

  // -------------------------------------------------------------------------
  // PLAN
  // -------------------------------------------------------------------------
  describe('makePlan + planMetrics', () => {
    const blade = 3;
    const endLoss = 150;
    let pat10m_8x1222, pat10m_6x1222, pat9m_6x1222;

    beforeAll(() => {
      pat10m_8x1222 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(8).fill(1222) });
      pat10m_6x1222 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(6).fill(1222) });
      pat9m_6x1222  = term.makePattern({ stock: 9000,  blade, endLoss, pieces: Array(6).fill(1222) });
    });

    test('builds an empty plan', () => {
      const p = term.emptyPlan();
      expect(term.isPlan(p)).toBe(true);
      expect(p.entries).toHaveLength(0);
    });

    test('rejects non-array entries', () => {
      expect(() => term.makePlan(null)).toThrow();
      expect(() => term.makePlan({})).toThrow();
    });

    test('rejects entries with non-pattern or non-integer count', () => {
      expect(() => term.makePlan([{ pattern: {}, count: 1 }])).toThrow();
      expect(() => term.makePlan([{ pattern: pat10m_8x1222, count: -1 }])).toThrow();
      expect(() => term.makePlan([{ pattern: pat10m_8x1222, count: 1.5 }])).toThrow();
    });

    test('count = 0 entries are allowed (R4 will prune them later)', () => {
      const p = term.makePlan([{ pattern: pat10m_8x1222, count: 0 }]);
      expect(p.entries).toHaveLength(1);
      expect(p.entries[0].count).toBe(0);
    });

    test('plan and entries are frozen', () => {
      const p = term.makePlan([{ pattern: pat10m_8x1222, count: 41 }]);
      expect(Object.isFrozen(p)).toBe(true);
      expect(Object.isFrozen(p.entries)).toBe(true);
      expect(Object.isFrozen(p.entries[0])).toBe(true);
    });

    test('planMetrics reproduces V2 output: 41×[10m,8] + 1×[10m,6] = 334 pieces, 420,000mm, loss 2,556mm', () => {
      const v2Plan = term.makePlan([
        { pattern: pat10m_8x1222, count: 41 },
        { pattern: pat10m_6x1222, count: 1 }
      ]);
      const m = term.planMetrics(v2Plan);
      expect(m.barCount).toBe(42);
      expect(m.stockTotal).toBe(420000);            // 42 × 10000
      expect(m.pieceTotal).toBe(1222 * 334);        // 408,148
      expect(m.lossTotal).toBe(41 * 53 + 1 * 2503); // 2,173 + 2,503 = 4,676 (実効ロス、端ロス150含まない)
    });

    test('planMetrics reproduces optimal swap: 41×[10m,8] + 1×[9m,6] = 334 pieces, 419,000mm', () => {
      const optimalPlan = term.makePlan([
        { pattern: pat10m_8x1222, count: 41 },
        { pattern: pat9m_6x1222, count: 1 }
      ]);
      const m = term.planMetrics(optimalPlan);
      expect(m.barCount).toBe(42);
      expect(m.stockTotal).toBe(419000);            // 41×10000 + 1×9000
      expect(m.pieceTotal).toBe(1222 * 334);
      expect(m.lossTotal).toBe(41 * 53 + 1 * 1503); // 2,173 + 1,503 = 3,676
    });

    test('optimal plan saves exactly 1,000mm of stock vs V2 plan (BUG-V2-001 acceptance numbers)', () => {
      const v2Plan = term.makePlan([
        { pattern: pat10m_8x1222, count: 41 },
        { pattern: pat10m_6x1222, count: 1 }
      ]);
      const optimalPlan = term.makePlan([
        { pattern: pat10m_8x1222, count: 41 },
        { pattern: pat9m_6x1222, count: 1 }
      ]);
      expect(term.planMetrics(v2Plan).stockTotal - term.planMetrics(optimalPlan).stockTotal).toBe(1000);
    });
  });
});
