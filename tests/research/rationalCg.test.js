/**
 * tests/research/rationalCg.test.js
 *
 * Phase K-3: rational column generation (full exact pipeline) の検証。
 */

const exactCg = require('../../src/calculation/yield/research/rationalCg.js');
const cg = require('../../src/calculation/yield/arcflow/columnGen.js');
const realCases = require('../fixtures/realCases.js');
const R = require('../../src/calculation/yield/research/rational.js');

describe('rationalCg — full exact CG pipeline', () => {
  jest.setTimeout(10 * 60 * 1000);  // 10 minutes for slow exact

  // ===========================================================================
  // boundedKnapsackExact 単体テスト
  // ===========================================================================
  describe('boundedKnapsackExact', () => {
    test('基本: 単一 item で max value', () => {
      const items = [{ value: R.fromInt(10), weight: 100, count: 5 }];
      const r = exactCg.boundedKnapsackExact(items, 250);
      // 250 / 100 = 2 pieces fit, value = 20
      expect(r.counts).toEqual([2]);
      expect(R.eq(r.value, R.fromInt(20))).toBe(true);
      expect(r.usedCapacity).toBe(200);
    });

    test('複数 item で最適配分', () => {
      // value 10/wt 100 vs value 20/wt 250 (better ratio)
      const items = [
        { value: R.fromInt(10), weight: 100, count: 10 },
        { value: R.fromInt(20), weight: 250, count: 10 }
      ];
      const r = exactCg.boundedKnapsackExact(items, 1000);
      // 1000/250 = 4 of item 2 → value 80, vs 10 of item 1 → value 100
      // 1000 = 4×250 → 80 (item 2 only)
      // 1000 = 10×100 → 100 (item 1 only)
      // 750 = 3×250, +250 = 2×100 + slack 50 → 60+20=80
      // best: 10 of item 1 → value 100
      expect(R.eq(r.value, R.fromInt(100))).toBe(true);
      expect(r.counts).toEqual([10, 0]);
    });

    test('Rational value で厳密 (1/3 などの分数)', () => {
      const items = [{ value: R.rational(1n, 3n), weight: 1, count: 6 }];
      const r = exactCg.boundedKnapsackExact(items, 6);
      // 6 of value 1/3 → total 2
      expect(R.eq(r.value, R.fromInt(2))).toBe(true);
      expect(r.counts).toEqual([6]);
    });

    test('容量 0 → empty', () => {
      const r = exactCg.boundedKnapsackExact(
        [{ value: R.fromInt(10), weight: 1, count: 5 }],
        0
      );
      expect(R.isZero(r.value)).toBe(true);
    });
  });

  // ===========================================================================
  // CASE-2 で full exact CG パイプライン
  // ===========================================================================
  describe('full exact CG on real cases', () => {
    test('CASE-2 L20 (LP-tight, 5 piece types) full exact', async () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-2-L20'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };

      console.log('\n=== CASE-2 full exact ===');
      const t0 = Date.now();
      const r = exactCg.solveColumnGenExact(spec, { bbTimeLimit: 60000, verbose: false });
      const dt = Date.now() - t0;
      console.log('  status=' + r.status);
      console.log('  obj=' + (r.objective ? R.toString(r.objective) : 'N/A') + ' (=' + r.objectiveFloat + ')');
      console.log('  lp_obj=' + (r.lpObjective ? R.toString(r.lpObjective) : 'N/A') + ' (=' + r.lpObjectiveFloat + ')');
      console.log('  patterns=' + (r.patterns ? r.patterns.length : 0));
      console.log('  bbNodes=' + r.bbNodeCount);
      console.log('  bars=' + r.barCount + ' stockTotal=' + r.stockTotal);
      console.log('  gap=' + (r._exact && r._exact.gapRational ? R.toString(r._exact.gapRational) : 'N/A'));
      console.log('  total time=' + dt + 'ms');

      expect(r.status).toBe('cg_exact_optimal');
      expect(r.bars.length).toBeGreaterThan(0);
      // CASE-2 LP-tight expected: 442000
      expect(r.objectiveFloat).toBe(442000);
      // gap should be 0 (LP-tight)
      expect(r._exact.gapFloat).toBe(0);
      // float CG と一致
      const floatCg = await cg.solveColumnGen(spec);
      expect(r.objectiveFloat).toBe(floatCg.stockTotal);
    });

    test('CASE-3 H175 (4 piece types, medium) full exact', async () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-3-H175'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };

      console.log('\n=== CASE-3 full exact ===');
      const t0 = Date.now();
      const r = exactCg.solveColumnGenExact(spec, { bbTimeLimit: 60000, verbose: false });
      const dt = Date.now() - t0;
      console.log('  status=' + r.status);
      console.log('  obj=' + (r.objective ? R.toString(r.objective) : 'N/A') + ' (=' + r.objectiveFloat + ')');
      console.log('  lp_obj=' + (r.lpObjective ? R.toString(r.lpObjective) : 'N/A') + ' (=' + r.lpObjectiveFloat + ')');
      console.log('  patterns=' + (r.patterns ? r.patterns.length : 0));
      console.log('  bbNodes=' + r.bbNodeCount);
      console.log('  gap=' + (r._exact && r._exact.gapRational ? R.toString(r._exact.gapRational) : 'N/A'));
      console.log('  total time=' + dt + 'ms');

      expect(r.bars).toBeDefined();
      expect(r.bars.length).toBeGreaterThan(0);
      // float CG (CASE-3): 239,000 (with B&B fallback)
      // exact: should reach same or better
      expect(r.objectiveFloat).toBeLessThanOrEqual(245000);
    });
  });
});
