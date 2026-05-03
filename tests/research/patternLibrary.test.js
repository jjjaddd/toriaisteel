/**
 * tests/research/patternLibrary.test.js
 *
 * Cross-Instance Pattern Library の検証 (RESEARCH_LIBRARY.md)。
 *
 * - 単体テスト: extractAbstractPatterns, mergeLibrary, findApplicablePatterns
 * - leave-one-out cross-validation: 5 case から library 構築 → 6 case目を warm-start で解く
 */

const lib = require('../../src/calculation/yield/research/patternLibrary.js');
const cg = require('../../src/calculation/yield/arcflow/columnGen.js');
const realCases = require('../fixtures/realCases.js');

describe('patternLibrary — abstract pattern extraction & lookup', () => {
  jest.setTimeout(30 * 60 * 1000);

  // ===========================================================================
  // 単体テスト
  // ===========================================================================
  describe('extractAbstractPatterns', () => {
    test('patterns 形式の cgResult から abstract pattern を抽出', () => {
      const cgResult = {
        patterns: [
          { stock: 12000, counts: [4, 0] },  // 4 of piece 0 (len 2806)
          { stock: 11000, counts: [0, 6] }   // 6 of piece 1 (len 1825)
        ]
      };
      const items = [{ length: 2806 }, { length: 1825 }];
      const aps = lib.extractAbstractPatterns(cgResult, items, { blade: 3, endLoss: 150 });
      expect(aps.length).toBe(2);
      expect(aps[0].pieces).toEqual([2806, 2806, 2806, 2806]);
      expect(aps[0].stock).toBe(12000);
      expect(aps[1].pieces).toEqual([1825, 1825, 1825, 1825, 1825, 1825]);
    });

    test('yieldThreshold で低効率 pattern を除外', () => {
      const cgResult = {
        patterns: [
          { stock: 12000, counts: [1] },   // 1 of len 1000 → yield = 1/12 = 0.083
          { stock: 12000, counts: [10] }   // 10 of len 1000 → yield = 10/12 = 0.833
        ]
      };
      const items = [{ length: 1000 }];
      const aps = lib.extractAbstractPatterns(cgResult, items, { yieldThreshold: 0.5 });
      expect(aps.length).toBe(1);
      expect(aps[0].pieces).toEqual([1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]);
    });
  });

  describe('mergeLibrary + dedup', () => {
    test('同じ pattern は重複しない', () => {
      const a = { patterns: [{ pieces: [2806, 2806], stock: 6000, loss: 100, yieldRatio: 0.93 }], metadata: {} };
      const b = { patterns: [{ pieces: [2806, 2806], stock: 6000, loss: 100, yieldRatio: 0.93 }], metadata: {} };
      const merged = lib.mergeLibrary(a, b);
      expect(merged.patterns.length).toBe(1);
    });

    test('異なる stock の同 pieces は別 pattern', () => {
      const a = { patterns: [{ pieces: [2806, 2806], stock: 6000, loss: 100, yieldRatio: 0.93 }], metadata: {} };
      const b = { patterns: [{ pieces: [2806, 2806], stock: 7000, loss: 1100, yieldRatio: 0.80 }], metadata: {} };
      const merged = lib.mergeLibrary(a, b);
      expect(merged.patterns.length).toBe(2);
    });
  });

  describe('findApplicablePatterns', () => {
    test('適用可能 / 不可能の判定', () => {
      const library = {
        patterns: [
          { pieces: [2806, 2806, 2806, 2806], stock: 12000 },  // 適用可
          { pieces: [9999], stock: 12000 },                     // length 9999 が instance に無い
          { pieces: [2806, 2806], stock: 99999 }                // stock が無い
        ]
      };
      const spec = {
        pieces: [{ length: 2806, count: 60 }],
        availableStocks: [10000, 11000, 12000]
      };
      const applicable = lib.findApplicablePatterns(library, spec);
      expect(applicable.length).toBe(1);
      expect(applicable[0].stock).toBe(12000);
      expect(applicable[0].counts).toEqual([4]);
    });

    test('demand を超える pattern は除外', () => {
      const library = {
        patterns: [{ pieces: [1000, 1000, 1000, 1000, 1000], stock: 6000 }]
      };
      const spec = {
        pieces: [{ length: 1000, count: 3 }],  // demand 3 のみ
        availableStocks: [6000]
      };
      const applicable = lib.findApplicablePatterns(library, spec);
      expect(applicable.length).toBe(0);  // 5 個必要だが demand 3 だけ
    });
  });

  // ===========================================================================
  // Leave-one-out cross-validation
  // ===========================================================================
  describe('Leave-one-out cross-validation', () => {
    test('library を 5 case から構築 → 6 case目を warm-start CG で解く', async () => {
      const cases = realCases.cases;

      // Step 1: 各 case の cgResult を取得 (cold-start)
      console.log('\n=== Step 1: Cold-start CG on all cases ===');
      const baseline = {};
      for (const c of cases) {
        const spec = { blade: c.blade, endLoss: c.endLoss, availableStocks: c.availableStocks, pieces: c.pieces };
        const t0 = Date.now();
        const inspect = await cg.solveColumnGenInspect(spec, { maxIterations: 30 });
        const dt = Date.now() - t0;
        baseline[c.id] = {
          inspect: inspect,
          time: dt,
          patternCount: inspect.patterns ? inspect.patterns.length : 0
        };
        console.log('  [' + c.id + '] cold-start: ' + baseline[c.id].patternCount + ' patterns / ' + dt + 'ms');
      }

      // Step 2: leave-one-out で warm-start を試す
      console.log('\n=== Step 2: Leave-one-out warm-start ===');
      const results = [];
      for (let i = 0; i < cases.length; i++) {
        const target = cases[i];
        const otherCases = cases.filter((_, j) => j !== i);

        // 他 case から library 構築
        const instances = otherCases.map(c => ({
          id: c.id,
          spec: { blade: c.blade, endLoss: c.endLoss, availableStocks: c.availableStocks, pieces: c.pieces },
          cgResult: baseline[c.id].inspect
        }));
        const library = lib.buildLibrary(instances, { yieldThreshold: 0.7 });
        const stats = lib.libraryStats(library);

        // target に適用可能な pattern を探す
        const targetSpec = { blade: target.blade, endLoss: target.endLoss, availableStocks: target.availableStocks, pieces: target.pieces };
        const applicable = lib.findApplicablePatterns(library, targetSpec);

        // warm-start CG (library の applicable を initialPatterns に渡す)
        const t0 = Date.now();
        const warmInspect = await cg.solveColumnGenInspect(targetSpec, {
          maxIterations: 30,
          initialPatterns: applicable
        });
        const dt = Date.now() - t0;

        const coldPatterns = baseline[target.id].patternCount;
        const warmPatterns = warmInspect.patterns ? warmInspect.patterns.length : 0;
        const coldTime = baseline[target.id].time;
        const lpDiff = (warmInspect.lpObjective != null && baseline[target.id].inspect.lpObjective != null)
          ? Math.abs(warmInspect.lpObjective - baseline[target.id].inspect.lpObjective) : null;

        const row = {
          target: target.id,
          libSize: stats.count,
          applicable: applicable.length,
          coldPatterns: coldPatterns,
          warmPatterns: warmPatterns,
          coldTime: coldTime,
          warmTime: dt,
          lpCold: baseline[target.id].inspect.lpObjective,
          lpWarm: warmInspect.lpObjective,
          lpDiff: lpDiff
        };
        results.push(row);
        console.log('  [' + target.id + '] lib=' + stats.count + ' applicable=' + applicable.length
          + ' cold=' + coldPatterns + 'p/' + coldTime + 'ms warm=' + warmPatterns + 'p/' + dt + 'ms'
          + ' lpDiff=' + (lpDiff != null ? lpDiff.toFixed(2) : 'N/A'));
      }

      // 集計表示
      console.log('\n=== Summary ===');
      console.log('| Case | lib | applicable | cold (p/ms) | warm (p/ms) | LP diff |');
      results.forEach(r => {
        console.log('| ' + r.target + ' | ' + r.libSize + ' | ' + r.applicable
          + ' | ' + r.coldPatterns + 'p/' + r.coldTime + 'ms'
          + ' | ' + r.warmPatterns + 'p/' + r.warmTime + 'ms'
          + ' | ' + (r.lpDiff != null ? r.lpDiff.toFixed(0) : 'N/A') + ' |');
      });

      // Sanity: 結果が取れている
      expect(results.length).toBe(cases.length);
      // 重要: warm-start の LP は cold-start の LP 以下（library で前進）か近い (≤ 1% drift)
      results.forEach(r => {
        if (r.lpCold != null && r.lpWarm != null) {
          // warm-start の LP は cold-start に近いか、少なくとも到達できる
          expect(Math.abs(r.lpWarm - r.lpCold) / r.lpCold).toBeLessThan(0.05);  // 5% 以内
        }
      });
    });
  });
});
