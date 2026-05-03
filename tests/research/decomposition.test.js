/**
 * tests/research/decomposition.test.js
 *
 * Compatibility-graph decomposition の検証 (RESEARCH_DECOMP.md)。
 *
 * - 合成 disjoint case で 2 成分検出
 * - 6 実ケースで graph 構造を測定 (component 数、成分サイズ)
 * - 分解可能ケースで solveDecomposed の正しさ
 */

const decomp = require('../../src/calculation/yield/research/decomposition.js');
const cg = require('../../src/calculation/yield/arcflow/columnGen.js');
const realCases = require('../fixtures/realCases.js');

describe('decomposition — compatibility graph + sub-solve', () => {
  jest.setTimeout(10 * 60 * 1000);

  // ===========================================================================
  // unit: 合成 disjoint case
  // ===========================================================================
  test('合成: 大ピース 2 種 + 小ピース 2 種で 2 成分検出', () => {
    // stocks max = 10000, endLoss=100, blade=5
    // 大: [6000, 6500] (合計 12000+ で同 bar 不可)
    // 小: [1000, 2000] (合計 3000、同 bar 可)
    // 大と小は組み合わせ可能? 6000 + 1000 + 5 = 7005 ≤ 9800 = 10000 - 200 → 同 bar に入る
    // → 1 成分になる
    const spec1 = {
      blade: 5, endLoss: 100,
      availableStocks: [10000],
      pieces: [
        { length: 6000, count: 5 },
        { length: 6500, count: 5 },
        { length: 1000, count: 5 },
        { length: 2000, count: 5 }
      ]
    };
    const g1 = decomp.buildCompatibilityGraph(spec1);
    expect(g1.components.length).toBe(1);  // 全部繋がる

    // 真に分離: 大 + 大 (合計 stock 超) のみ
    const spec2 = {
      blade: 5, endLoss: 100,
      availableStocks: [10000],
      pieces: [
        { length: 7000, count: 5 },  // 7000+7000+5 = 14005 > 9800 → 同 bar 不可
        { length: 8000, count: 5 },  // 8000+8000+5 = 16005 > 9800 → 不可
        // 7000 + 8000 + 5 = 15005 > 9800 → 不可
      ]
    };
    const g2 = decomp.buildCompatibilityGraph(spec2);
    expect(g2.components.length).toBe(2);  // 7000 と 8000 が独立成分
    expect(g2.edges.length).toBe(0);  // 互換 edge なし
  });

  // ===========================================================================
  // 6 実ケースの graph 構造
  // ===========================================================================
  test('6 ケースの compatibility graph 構造', () => {
    console.log('\n=== Compatibility Graph Structure ===');
    realCases.cases.forEach(function(c) {
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const g = decomp.buildCompatibilityGraph(spec);
      const sizes = g.components.map(function(comp) { return comp.length; }).sort(function(a, b) { return b - a; });
      const k = c.pieces.length;
      const maxEdges = k * (k - 1) / 2;
      const density = maxEdges > 0 ? g.edges.length / maxEdges : 0;
      console.log('  [' + c.id + '] k=' + k
        + ' components=' + g.components.length
        + ' sizes=[' + sizes.join(',') + ']'
        + ' edges=' + g.edges.length + '/' + maxEdges
        + ' density=' + (density * 100).toFixed(1) + '%');
    });
  });

  // ===========================================================================
  // 分解可能ケースで sub-solve の整合性
  // ===========================================================================
  test('合成 disjoint で solveDecomposed が正しく解く', async () => {
    // 真に分離する 2 成分例
    // 短ピース: 1000mm x10
    // 長ピース: 7000mm x3 (二つ同 bar 不可)
    // 1000 + 7000 + 5 = 8005 < 9800 → これは同 bar 可能！失敗
    // ストック小さくして 1000 + 7000 で stock 7500 だと 1000+7000+5+200 = 8205 > 7500 → 不可
    // でも 1000 だけなら入る
    const spec = {
      blade: 5, endLoss: 100,
      availableStocks: [7500],
      pieces: [
        { length: 1000, count: 6 },   // 7000+1000+5 = 8005 > 7300 (capacity) → 不可
        { length: 7000, count: 3 }
      ]
    };
    const g = decomp.buildCompatibilityGraph(spec);
    expect(g.components.length).toBe(2);

    const r = await decomp.solveDecomposed(spec, { bbTimeLimit: 10_000, verbose: true });
    expect(r._decomp.decomposed).toBe(true);
    expect(r._decomp.componentCount).toBe(2);
    expect(r.bars.length).toBeGreaterThan(0);
    // 全 demand 充足
    const cnt = {};
    r.bars.forEach(function(b) {
      b.pattern.forEach(function(len) { cnt[len] = (cnt[len] || 0) + b.count; });
    });
    expect(cnt[1000]).toBeGreaterThanOrEqual(6);
    expect(cnt[7000]).toBeGreaterThanOrEqual(3);
  });
});
