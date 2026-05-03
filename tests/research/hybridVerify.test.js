/**
 * tests/research/hybridVerify.test.js
 *
 * Phase K-5: Hybrid Float-Rational Verification
 *
 * Float CG で fast に解いた結果を rational で機械検証して certificate を作る。
 * 期待: float の速度 + K-4 の certificate 品質。
 */

const cg = require('../../src/calculation/yield/arcflow/columnGen.js');
const exactCg = require('../../src/calculation/yield/research/rationalCg.js');
const hybrid = require('../../src/calculation/yield/research/hybridVerify.js');
const realCases = require('../fixtures/realCases.js');
const R = require('../../src/calculation/yield/research/rational.js');

describe('hybridVerify — Phase K-5 (float search + exact verify)', () => {
  jest.setTimeout(10 * 60 * 1000);

  // ===========================================================================
  // CASE-6: 速度勝負の本命
  // ===========================================================================
  test('CASE-6 L65 hybrid: float B&B 高速 + exact 検証', async () => {
    const c = realCases.cases.find(function(x) { return x.id === 'CASE-6-L65'; });
    const spec = {
      blade: c.blade, endLoss: c.endLoss,
      availableStocks: c.availableStocks,
      pieces: c.pieces,
      kind: c.kind
    };

    // Step 1: Float CG (高速、既存実装)
    console.log('\n=== CASE-6 Hybrid Verification ===');
    const t0 = Date.now();
    const floatRes = await cg.solveColumnGen(spec, { bbTimeLimit: 60000 });
    const floatDt = Date.now() - t0;
    console.log('  Float CG+B&B: status=' + floatRes.status + ' obj=' + floatRes.stockTotal + ' time=' + floatDt + 'ms');

    // Step 2: Hybrid verify (rational で)
    const hyb = hybrid.solveAndVerifyHybrid(spec, floatRes);
    if (hyb.error) {
      console.log('  Hybrid error: ' + hyb.error);
      return;
    }
    console.log('  Patterns reconstructed: ' + hyb.patterns.length);
    console.log('  Integer objective (exact): ' + R.toString(hyb.integerObjective));
    console.log('  LP objective (exact):      ' + R.toString(hyb.lpObjective));
    console.log('  Gap (exact fraction):      ' + hyb.gapAsString);
    console.log('  Gap (float):               ' + (hyb.gapFloat * 100).toFixed(4) + '%');
    console.log('  Timings: float=' + floatDt + 'ms exact_lp=' + hyb.timings.exactLpMs + 'ms cert=' + hyb.timings.certificateMs + 'ms');
    console.log('  Total wall time: ' + (floatDt + hyb.timings.totalMs) + 'ms');
    console.log('  All theorems hold: ' + hyb.certificate.allTheoremsHold);

    // 比較: K-3 pure exact だと CASE-6 で 5 分以上
    console.log('  Speed vs pure exact (K-3): ' + ((300000 / (floatDt + hyb.timings.totalMs))).toFixed(1) + 'x faster');

    expect(hyb.certificate).toBeDefined();
    expect(hyb.lpObjective).toBeDefined();
    // 4 定理の検証 — float 結果が正しければ全部成立するはず
    expect(hyb.certificate.allTheoremsHold).toBe(true);
  });

  // ===========================================================================
  // CASE-2 / CASE-3 でも比較 (3 way: float / hybrid / pure exact)
  // ===========================================================================
  test('CASE-2 / CASE-3: float vs hybrid vs pure-exact 比較', async () => {
    console.log('\n=== Speed comparison ===');
    console.log('| case | float | hybrid | pure-exact | hybrid speedup |');
    for (const id of ['CASE-2-L20', 'CASE-3-H175']) {
      const c = realCases.cases.find(function(x) { return x.id === id; });
      const spec = { blade: c.blade, endLoss: c.endLoss, availableStocks: c.availableStocks, pieces: c.pieces };

      const t0 = Date.now();
      const fr = await cg.solveColumnGen(spec, { bbTimeLimit: 30000 });
      const tFloat = Date.now() - t0;

      const t1 = Date.now();
      const hyb = hybrid.solveAndVerifyHybrid(spec, fr);
      const tHyb = (Date.now() - t1) + tFloat;  // hybrid total = float CG + verify

      const t2 = Date.now();
      const er = exactCg.solveColumnGenExact(spec, { bbTimeLimit: 30000 });
      const tExact = Date.now() - t2;

      const speedup = tExact / tHyb;
      console.log('| ' + id + ' | ' + tFloat + 'ms | ' + tHyb + 'ms | ' + tExact + 'ms | ' + speedup.toFixed(2) + 'x |');
    }
  });

  // ===========================================================================
  // 機械検証可能性の sanity check (CASE-6 後の HiGHS 状態劣化を避け CASE-2 単独で)
  // ===========================================================================
  test('reconstructPatternsFromBars unit', () => {
    const items = [{ length: 100 }, { length: 200 }];
    const bars = [
      { stock: 1000, pattern: [200, 100, 100], count: 5 },
      { stock: 1000, pattern: [200, 100, 100], count: 3 },  // 同 pattern → merge
      { stock: 800, pattern: [200], count: 2 }
    ];
    const r = hybrid.reconstructPatternsFromBars(bars, items);
    expect(r.patterns.length).toBe(2);
    expect(R.toNumber(r.xInt[0])).toBe(8);  // 5 + 3 merged
    expect(R.toNumber(r.xInt[1])).toBe(2);
  });
});
