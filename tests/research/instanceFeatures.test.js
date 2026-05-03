/**
 * tests/research/instanceFeatures.test.js
 *
 * インスタンス特徴量計算の sanity check。
 */

const features = require('../../src/calculation/yield/research/instanceFeatures.js');

describe('instanceFeatures — basic features', () => {
  test('単純 1 piece type の k/n', () => {
    const f = features.computeBasicFeatures({
      pieces: [{ length: 1000, count: 5 }],
      availableStocks: [10000],
      blade: 0, endLoss: 0
    });
    expect(f.k).toBe(1);
    expect(f.n).toBe(5);
    expect(f.L_min).toBe(1000);
    expect(f.L_max).toBe(1000);
    expect(f.L_span).toBe(0);
    expect(f.S_count).toBe(1);
    expect(f.density).toBeCloseTo(10);  // 10000 / 1000
  });

  test('複数 piece type の集計', () => {
    const f = features.computeBasicFeatures({
      pieces: [
        { length: 1000, count: 3 },
        { length: 2000, count: 2 }
      ],
      availableStocks: [5000, 10000],
      blade: 5, endLoss: 100
    });
    expect(f.k).toBe(2);
    expect(f.n).toBe(5);
    expect(f.L_min).toBe(1000);
    expect(f.L_max).toBe(2000);
    expect(f.L_span).toBe(1000);
    expect(f.S_count).toBe(2);
    expect(f.S_min).toBe(5000);
    expect(f.S_max).toBe(10000);
    expect(f.S_span).toBe(5000);
  });

  test('空の pieces で null', () => {
    expect(features.computeBasicFeatures(null)).toBeNull();
  });
});

describe('instanceFeatures — algebra features', () => {
  test('demand_skew: 完全均等 → 0 に近い', () => {
    const f = features.computeAlgebraFeatures({
      pieces: [
        { length: 1000, count: 10 },
        { length: 2000, count: 10 },
        { length: 3000, count: 10 }
      ],
      availableStocks: [10000]
    });
    expect(f.demand_skew).toBeLessThan(0.05);
  });

  test('demand_skew: 一つ突出 → 大きい値', () => {
    const f = features.computeAlgebraFeatures({
      pieces: [
        { length: 1000, count: 100 },
        { length: 2000, count: 1 },
        { length: 3000, count: 1 }
      ],
      availableStocks: [10000]
    });
    expect(f.demand_skew).toBeGreaterThan(0.5);
  });

  test('length_clusters: 似た長さ群 → cluster=1', () => {
    const f = features.computeAlgebraFeatures({
      pieces: [
        { length: 1000, count: 5 },
        { length: 1100, count: 5 },
        { length: 1200, count: 5 }
      ],
      availableStocks: [10000]
    });
    expect(f.length_clusters).toBe(1);
  });

  test('length_clusters: 大きく分かれた長さ群 → cluster 増', () => {
    const f = features.computeAlgebraFeatures({
      pieces: [
        { length: 100, count: 5 },
        { length: 1000, count: 5 },
        { length: 5000, count: 5 }
      ],
      availableStocks: [10000]
    });
    expect(f.length_clusters).toBeGreaterThanOrEqual(3);
  });
});

describe('instanceFeatures — Gini coefficient sanity', () => {
  test('全要素同じ → 0', () => {
    expect(features._internal.giniCoefficient([5, 5, 5, 5])).toBeCloseTo(0);
  });

  test('1 要素のみ → 単独で 0 (degenerate)', () => {
    expect(features._internal.giniCoefficient([10])).toBeCloseTo(0);
  });

  test('完全偏り [0,0,0,100] → 1 に近い', () => {
    const g = features._internal.giniCoefficient([0, 0, 0, 100]);
    expect(g).toBeGreaterThan(0.6);
  });

  test('空配列 → 0', () => {
    expect(features._internal.giniCoefficient([])).toBe(0);
  });
});
