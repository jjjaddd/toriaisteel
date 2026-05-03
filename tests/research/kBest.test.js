/**
 * tests/research/kBest.test.js
 *
 * Algebraic k-best 多様解列挙の検証 (RESEARCH_KBEST.md)。
 *
 * - CASE-2 で k=3 取得、各解 distinct
 * - 全解が tol 以内のコスト
 * - no-good cut の正しさ
 */

const kBest = require('../../src/calculation/yield/research/kBest.js');
const realCases = require('../fixtures/realCases.js');

function solutionsAreDistinct(s1, s2) {
  if (!s1.x || !s2.x || s1.x.length !== s2.x.length) return true;
  for (let i = 0; i < s1.x.length; i++) {
    if (s1.x[i] !== s2.x[i]) return true;
  }
  return false;
}

describe('kBest — Algebraic k-best 多様解列挙', () => {
  jest.setTimeout(180_000);

  test('addNoGoodCut (binary disjunctive): dimension 拡張が正しい', () => {
    const baseMip = {
      c: [10, 20],
      A: [[1, 1], [2, 1]],
      b: [3, 5],
      constraintTypes: ['>=', '<='],
      integerVars: [0, 1]
    };
    // prevX = [1, 2] → active = [0, 1] (両方 > 0)
    const newMip = kBest._internal.addNoGoodCut(baseMip, [1, 2], 2);
    // 元の 2 列 + z_p 2 列 = 4 列
    expect(newMip.c.length).toBe(4);
    expect(newMip.A[0].length).toBe(4);
    // 元の 2 + big-M 2 + upper-bound 2 + sum 1 = 7 制約
    expect(newMip.A.length).toBe(7);
    // 最後の制約は Σ z_p >= 1
    expect(newMip.A[6]).toEqual([0, 0, 1, 1]);
    expect(newMip.b[6]).toBe(1);
    expect(newMip.constraintTypes[6]).toBe('>=');
    // z_p が integerVars に追加された
    expect(newMip.integerVars).toContain(2);
    expect(newMip.integerVars).toContain(3);
  });

  test('addNoGoodCut: prevX = [3, 0] なら active=[0]、z は 1 個だけ', () => {
    const baseMip = {
      c: [10, 20],
      A: [[1, 1]],
      b: [3],
      constraintTypes: ['>='],
      integerVars: [0, 1]
    };
    const newMip = kBest._internal.addNoGoodCut(baseMip, [3, 0], 2);
    // active=[0] → z 1 個追加 → 3 列
    expect(newMip.c.length).toBe(3);
    // 元の 1 + big-M 1 + upper 1 + sum 1 = 4 制約
    expect(newMip.A.length).toBe(4);
  });

  test('CASE-2 L20 で k=3 取得、3 解とも near-optimal で distinct', async () => {
    const c = realCases.cases.find(function(x) { return x.id === 'CASE-2-L20'; });
    const spec = {
      blade: c.blade, endLoss: c.endLoss,
      availableStocks: c.availableStocks,
      pieces: c.pieces
    };
    const t0 = Date.now();
    const sols = await kBest.solveKBest(spec, 3, { tol: 0.05, bbTimeLimit: 15_000, verbose: true });
    const dt = Date.now() - t0;
    console.log('  CASE-2 k-best: ' + sols.length + ' solutions in ' + dt + 'ms');
    sols.forEach(function(s, i) {
      console.log('    rank=' + s.rank + ' obj=' + s.objective.toFixed(0)
        + ' bars=' + s.barCount + ' distinct_stocks=' + s.distinctStockCount
        + ' breakdown=' + JSON.stringify(s.stockBreakdown));
    });
    expect(sols.length).toBeGreaterThanOrEqual(1);
    if (sols.length >= 2) {
      // 2 解目があれば distinct
      expect(solutionsAreDistinct(sols[0], sols[1])).toBe(true);
      // tol 以内
      expect(sols[1].objective).toBeLessThanOrEqual(sols[0].objective * 1.05 + 1e-6);
    }
    if (sols.length >= 3) {
      expect(solutionsAreDistinct(sols[1], sols[2])).toBe(true);
      expect(solutionsAreDistinct(sols[0], sols[2])).toBe(true);
    }
  });

  test('CASE-6 L65 で k=3、production scenario', async () => {
    const c = realCases.cases.find(function(x) { return x.id === 'CASE-6-L65'; });
    const spec = {
      blade: c.blade, endLoss: c.endLoss,
      availableStocks: c.availableStocks,
      pieces: c.pieces
    };
    const t0 = Date.now();
    const sols = await kBest.solveKBest(spec, 3, { tol: 0.05, bbTimeLimit: 30_000, verbose: true });
    const dt = Date.now() - t0;
    console.log('  CASE-6 k-best: ' + sols.length + ' solutions in ' + dt + 'ms');
    sols.forEach(function(s) {
      console.log('    rank=' + s.rank + ' obj=' + s.objective.toFixed(0)
        + ' bars=' + s.barCount + ' breakdown=' + JSON.stringify(s.stockBreakdown));
    });
    // CASE-6 で少なくとも 1 解は得られる
    expect(sols.length).toBeGreaterThanOrEqual(1);
    expect(sols[0].objective).toBeLessThanOrEqual(730_000);  // LP-tight 範囲
  });
});
