/**
 * tests/research/explain.test.js
 *
 * Solution Explanation via LP Duality の検証 (RESEARCH_EXPLAIN.md)。
 */

const explain = require('../../src/calculation/yield/research/explain.js');
const cg = require('../../src/calculation/yield/arcflow/columnGen.js');
const realCases = require('../fixtures/realCases.js');

describe('explain — LP duality based solution explanation', () => {
  jest.setTimeout(180_000);

  describe('reduced cost computation', () => {
    test('用済み pattern の RC は ≈ 0 (LP optimum で)', () => {
      // pattern: stock 10000, counts [3, 2]
      // duals: [3000, 0] → marginal value = 3*3000 + 2*0 = 9000
      // RC = 10000 - 9000 = 1000
      const rc = explain.computeReducedCost(
        { stock: 10000, counts: [3, 2] },
        [3000, 0]
      );
      expect(rc).toBe(1000);
    });

    test('null safe', () => {
      expect(explain.computeReducedCost(null, [1])).toBeNaN();
      expect(explain.computeReducedCost({ stock: 100, counts: [1] }, null)).toBeNaN();
    });
  });

  describe('classifyPattern', () => {
    test('used + RC ≈ 0 → used_at_margin', () => {
      expect(explain.classifyPattern(0.5, 5)).toBe('used_at_margin');
    });
    test('used + RC > eps → drift', () => {
      expect(explain.classifyPattern(50, 5)).toBe('used_with_drift');
    });
    test('unused + RC ≈ 0 → near margin', () => {
      expect(explain.classifyPattern(0.5, 0)).toBe('unused_at_margin');
    });
    test('unused + RC > 0 → premium', () => {
      expect(explain.classifyPattern(100, 0)).toBe('unused_with_premium');
    });
  });

  describe('CASE-2 で full explanation 生成', () => {
    test('CASE-2 L20 で説明を生成、自然言語含む', async () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-2-L20'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const inspect = await cg.solveColumnGenInspect(spec, { maxIterations: 30 });
      expect(inspect.dualPi).toBeDefined();
      expect(inspect.dualPi.length).toBe(c.pieces.length);
      const items = c.pieces.map(function(p) {
        return { length: p.length, count: p.count };
      });
      // 整数解は別途 solveColumnGen から取る
      const r = await cg.solveColumnGen(spec, { maxIterations: 30 });
      const exp = explain.explainSolution(r, inspect.patterns, inspect.dualPi, items);
      console.log('\n--- CASE-2 EXPLANATION ---\n' + exp.naturalLanguageJa + '\n--- END ---\n');
      expect(exp.patternExplanations.length).toBeGreaterThan(0);
      expect(exp.marginalCosts.length).toBe(c.pieces.length);
      expect(typeof exp.naturalLanguageJa).toBe('string');
      expect(exp.naturalLanguageJa.length).toBeGreaterThan(100);
      // used pattern の RC は概ね 0
      const used = exp.patternExplanations.filter(function(e) { return e.x > 0; });
      used.forEach(function(e) {
        // LP-tight ケースでは RC ≈ 0 になるはず
        expect(Math.abs(e.reducedCost)).toBeLessThan(100);
      });
    });
  });

  describe('CASE-6 で代替 pattern の premium 計算', () => {
    test('CASE-6 L65 で説明、unused pattern の premium が量化される', async () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-6-L65'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const inspect = await cg.solveColumnGenInspect(spec, { maxIterations: 20 });
      expect(inspect.dualPi).toBeDefined();
      const items = c.pieces.map(function(p) {
        return { length: p.length, count: p.count };
      });
      const r = await cg.solveColumnGen(spec, { maxIterations: 20, bbTimeLimit: 30000 });
      const exp = explain.explainSolution(r, inspect.patterns, inspect.dualPi, items);
      console.log('\n--- CASE-6 EXPLANATION (excerpt) ---\n'
        + exp.naturalLanguageJa.substring(0, 2000) + '\n[..]\n--- END ---\n');
      expect(exp.patternExplanations.length).toBeGreaterThan(5);
      // 少なくとも 1 つ premium のある未使用 pattern があるはず
      const unusedWithPremium = exp.patternExplanations.filter(function(e) {
        return e.x === 0 && e.reducedCost > 0;
      });
      expect(unusedWithPremium.length).toBeGreaterThan(0);
    });
  });
});
