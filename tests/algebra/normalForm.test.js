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

describe('algebra/normalForm — fixed-point reducer', () => {
  let term, axioms, rules, nf;
  beforeAll(() => {
    const a = loadAlgebra();
    term = a.term;
    axioms = a.axioms;
    rules = a.rewriteRules;
    nf = a.normalForm;
  });

  // -------------------------------------------------------------------------
  // 基本: normalize
  // -------------------------------------------------------------------------
  describe('normalize', () => {
    test('a freshly-built pattern with no R5 candidate is already normal', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      const r = nf.normalize(p, { availableStocks: [10000] });
      expect(r.terminated).toBe(true);
      expect(r.steps).toBe(0);
      expect(r.term).toBe(p); // 完全 idempotent
    });

    test('a pattern with R5 candidate is normalized in 1 step', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      const r = nf.normalize(p, { availableStocks: [10000, 9000, 8000] });
      expect(r.terminated).toBe(true);
      expect(r.steps).toBe(1);
      expect(r.term.stock).toBe(8000);
    });

    test('a plan with all-applicable R3, R4, R5 collapses to a single normal-form plan', () => {
      const blade = 3;
      const endLoss = 150;
      const pat10m_8 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(8).fill(1222) });
      const pat10m_6 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(6).fill(1222) });
      const pat10m_8_dup = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(8).fill(1222) });

      // 同一パターン重複 (R3) + 0 entry (R4) + R5 候補 (R5)
      const messy = term.makePlan([
        { pattern: pat10m_8, count: 20 },
        { pattern: pat10m_8_dup, count: 21 },           // R3 candidate
        { pattern: pat10m_6, count: 0 },                // R4 candidate
        { pattern: pat10m_6, count: 1 }                 // R5 candidate (later, after others settle)
      ]);
      const ctx = { availableStocks: [10000, 9000, 8000] };
      const r = nf.normalize(messy, ctx, { trace: true });
      expect(r.terminated).toBe(true);
      // Optimal の構造に到達: 41 × 10m_8 + 1 × 8m_6
      expect(r.term.entries).toHaveLength(2);
      const m = term.planMetrics(r.term);
      expect(m.barCount).toBe(42);
      expect(m.stockTotal).toBe(418000);
    });

    test('trace records each rule applied', () => {
      const pat = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      const plan = term.makePlan([
        { pattern: pat, count: 0 },
        { pattern: pat, count: 5 }
      ]);
      const r = nf.normalize(plan, {}, { trace: true });
      expect(r.trace.length).toBeGreaterThan(0);
      expect(r.trace).toContain('R4.prune-empty');
    });

    test('respects maxSteps safety bound', () => {
      const pat = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      const plan = term.makePlan([{ pattern: pat, count: 5 }]);
      // 0 step で正規形だが maxSteps=0 を渡すとそれでも 0 ステップで終わる
      const r = nf.normalize(plan, {}, { maxSteps: 0 });
      expect(r.steps).toBe(0);
    });

    test('output is frozen (immutable result object)', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      const r = nf.normalize(p, {});
      expect(Object.isFrozen(r)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // isNormalForm
  // -------------------------------------------------------------------------
  describe('isNormalForm', () => {
    test('fresh pattern with no R5 candidates is normal', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      expect(nf.isNormalForm(p, { availableStocks: [10000] })).toBe(true);
    });

    test('pattern with R5 candidate is NOT normal', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      expect(nf.isNormalForm(p, { availableStocks: [10000, 8000] })).toBe(false);
    });

    test('plan with duplicate is NOT normal (R3 fires)', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      const plan = term.makePlan([
        { pattern: p, count: 3 },
        { pattern: p, count: 4 }
      ]);
      expect(nf.isNormalForm(plan, {})).toBe(false);
    });

    test('plan with count=0 is NOT normal (R4 fires)', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      const plan = term.makePlan([{ pattern: p, count: 0 }]);
      expect(nf.isNormalForm(plan, {})).toBe(false);
    });

    test('result of normalize is always normal', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      const r = nf.normalize(p, { availableStocks: [10000, 9000, 8000] });
      expect(nf.isNormalForm(r.term, { availableStocks: [10000, 9000, 8000] })).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 経験的 confluence: 同じ入力に複数回 normalize しても同じ結果
  // -------------------------------------------------------------------------
  describe('confluence (経験的検証)', () => {
    test('idempotent: normalize(normalize(t)) == normalize(t)', () => {
      const blade = 3, endLoss = 150;
      const pat10m_8 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(8).fill(1222) });
      const pat10m_6 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(6).fill(1222) });
      const ctx = { availableStocks: [10000, 9000, 8000] };

      const messy = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat10m_6, count: 1 }
      ]);
      const r1 = nf.normalize(messy, ctx);
      const r2 = nf.normalize(r1.term, ctx);
      expect(axioms.planEquivalent(r1.term, r2.term)).toBe(true);
      expect(r2.steps).toBe(0); // 既に正規形なので追加ステップなし
    });

    test('two equivalent inputs produce equivalent normal forms', () => {
      const blade = 3, endLoss = 150;
      const pat10m_8 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(8).fill(1222) });
      const pat10m_6 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(6).fill(1222) });

      // 同じ意味の plan を異なる entry 順序で構築
      const planA = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat10m_6, count: 1 }
      ]);
      const planB = term.makePlan([
        { pattern: pat10m_6, count: 1 },
        { pattern: pat10m_8, count: 41 }
      ]);
      const ctx = { availableStocks: [10000, 9000, 8000] };
      const rA = nf.normalize(planA, ctx);
      const rB = nf.normalize(planB, ctx);
      expect(axioms.planEquivalent(rA.term, rB.term)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // normalizeWithMetrics
  // -------------------------------------------------------------------------
  describe('normalizeWithMetrics', () => {
    test('PLAN: returns planMetrics-shaped metrics', () => {
      const pat = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      const plan = term.makePlan([{ pattern: pat, count: 5 }]);
      const r = nf.normalizeWithMetrics(plan, {});
      expect(r.metrics.barCount).toBe(5);
      expect(r.metrics.stockTotal).toBe(50000);
    });

    test('PATTERN: returns size/eff/loss/yld', () => {
      const p = term.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: Array(6).fill(1222) });
      const r = nf.normalizeWithMetrics(p, { availableStocks: [10000, 8000] });
      // Lifted to 8m
      expect(r.term.stock).toBe(8000);
      expect(r.metrics.size).toBe(7347);
      expect(r.metrics.loss).toBe(503);
    });
  });

  // -------------------------------------------------------------------------
  // BUG-V2-001 完全シナリオ: V2 plan を normalize するだけで Optimal に
  // -------------------------------------------------------------------------
  describe('BUG-V2-001 end-to-end via normalize()', () => {
    test('V2 plan → normalize → Optimal plan in trace', () => {
      const blade = 3, endLoss = 150;
      const pat10m_8 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(8).fill(1222) });
      const pat10m_6 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(6).fill(1222) });

      const v2Plan = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat10m_6, count: 1 }
      ]);

      const ctx = { availableStocks: [10000, 9000, 8000] };
      const r = nf.normalize(v2Plan, ctx, { trace: true });

      expect(r.terminated).toBe(true);
      expect(r.trace).toEqual(['R5.dominance(plan)']);

      const m = term.planMetrics(r.term);
      expect(m.stockTotal).toBe(418000);                                  // V2 比 -2,000mm
      expect(m.pieceTotal).toBe(term.planMetrics(v2Plan).pieceTotal);     // 部材本数は不変
      expect(m.barCount).toBe(42);                                         // バー本数も不変
    });

    test('with restricted stocks [10000, 9000]: lifts to 9m', () => {
      const blade = 3, endLoss = 150;
      const pat10m_8 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(8).fill(1222) });
      const pat10m_6 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(6).fill(1222) });

      const v2Plan = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat10m_6, count: 1 }
      ]);

      const ctx = { availableStocks: [10000, 9000] };
      const r = nf.normalize(v2Plan, ctx);
      const m = term.planMetrics(r.term);
      expect(m.stockTotal).toBe(419000); // -1,000mm
    });

    test('with only 10m stock: V2 plan IS the normal form (no improvement available)', () => {
      const blade = 3, endLoss = 150;
      const pat10m_8 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(8).fill(1222) });
      const pat10m_6 = term.makePattern({ stock: 10000, blade, endLoss, pieces: Array(6).fill(1222) });

      const v2Plan = term.makePlan([
        { pattern: pat10m_8, count: 41 },
        { pattern: pat10m_6, count: 1 }
      ]);

      const ctx = { availableStocks: [10000] };
      const r = nf.normalize(v2Plan, ctx);
      expect(r.steps).toBe(0); // 既に正規形
      expect(term.planMetrics(r.term).stockTotal).toBe(420000);
    });
  });
});
