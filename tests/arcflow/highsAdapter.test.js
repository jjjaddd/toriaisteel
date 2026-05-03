/**
 * tests/arcflow/highsAdapter.test.js
 *
 * Phase 2 day-1: HiGHS-WASM が Jest 環境で動くことを確認する。
 *
 * - lazy load の動作
 * - README の例題で Optimal 解が出る
 * - 整数 (MIP) 制約で動く
 * - 切断問題用の超ミニ LP（V3 の本番コードに必要な機能）が解ける
 */

const adapter = require('../../src/calculation/yield/arcflow/highsAdapter.js');

describe('arcflow/highsAdapter — HiGHS-WASM smoke', () => {
  // HiGHS のロードに数百ms かかることがあるので timeout を伸ばす
  jest.setTimeout(30_000);

  beforeEach(() => {
    adapter._resetForTesting();
  });

  // -------------------------------------------------------------------------
  // lazy load
  // -------------------------------------------------------------------------
  test('loadHighs() returns a Promise resolving to an object with .solve', async () => {
    const highs = await adapter.loadHighs();
    expect(highs).toBeTruthy();
    expect(typeof highs.solve).toBe('function');
  });

  test('loadHighs() caches the instance on subsequent calls', async () => {
    const a = await adapter.loadHighs();
    const b = await adapter.loadHighs();
    expect(a).toBe(b);
  });

  // -------------------------------------------------------------------------
  // README example — known correct solution
  // -------------------------------------------------------------------------
  describe('README example LP', () => {
    const PROBLEM = `Maximize
 obj:
    x1 + 2 x2 + 4 x3 + x4
Subject To
 c1: - x1 + x2 + x3 + 10 x4 <= 20
 c2: x1 - 4 x2 + x3 <= 30
 c3: x2 - 0.5 x4 = 0
Bounds
 0 <= x1 <= 40
 2 <= x4 <= 3
End`;

    test('reaches Optimal with ObjectiveValue = 87.5', async () => {
      const sol = await adapter.solve(PROBLEM);
      expect(adapter.isOptimal(sol)).toBe(true);
      expect(sol.ObjectiveValue).toBeCloseTo(87.5, 6);
    });

    test('extractPrimal returns the expected variable values', async () => {
      const sol = await adapter.solve(PROBLEM);
      const primal = adapter.extractPrimal(sol);
      expect(primal.x1).toBeCloseTo(17.5, 6);
      expect(primal.x2).toBeCloseTo(1, 6);
      expect(primal.x3).toBeCloseTo(16.5, 6);
      expect(primal.x4).toBeCloseTo(2, 6);
    });
  });

  // -------------------------------------------------------------------------
  // MIP — integer constraint
  // 簡単な切断問題ミニ版: 1 種の部材 1222mm × 6 本を、定尺 8m or 9m or 10m
  // から 1 本選んで切る。母材長を最小化。
  //   xi = 定尺 i を使うか (binary)
  //   constraint: x8 + x9 + x10 == 1
  //   minimize: 8000 x8 + 9000 x9 + 10000 x10
  //   ただし、定尺 i に 1222×6 = 7332 + 5*3 = 7347 が乗る制約: i*1000 - 150 >= 7347
  //   つまり i >= 7497, 8m / 9m / 10m すべて valid
  // 期待: x8 = 1, ObjectiveValue = 8000
  // -------------------------------------------------------------------------
  describe('MIP smoke — minimal cutting decision', () => {
    const PROBLEM = `Minimize
 obj: 8000 x8 + 9000 x9 + 10000 x10
Subject To
 pick_one: x8 + x9 + x10 = 1
Bounds
 0 <= x8 <= 1
 0 <= x9 <= 1
 0 <= x10 <= 1
General
 x8 x9 x10
End`;

    test('MIP picks the cheapest stock that fits', async () => {
      const sol = await adapter.solve(PROBLEM);
      expect(adapter.isOptimal(sol)).toBe(true);
      expect(sol.ObjectiveValue).toBe(8000);
      const primal = adapter.extractPrimal(sol);
      expect(primal.x8).toBe(1);
      expect(primal.x9).toBe(0);
      expect(primal.x10).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // BUG-V2-001 micro LP: choose between 10m × 1 (loss 2503) and 9m × 1 (loss 1503)
  // for a single bar holding [1222 × 6]. Minimize loss.
  // -------------------------------------------------------------------------
  describe('BUG-V2-001 micro — V3 が選ぶべき答えを HiGHS が直接出す', () => {
    const PROBLEM = `Minimize
 loss: 2503 use10m + 1503 use9m + 503 use8m
Subject To
 pick_one: use10m + use9m + use8m = 1
Bounds
 0 <= use10m <= 1
 0 <= use9m <= 1
 0 <= use8m <= 1
General
 use10m use9m use8m
End`;

    test('selects 8m → loss 503mm (V2 の 2503 と比べて -2000mm 改善)', async () => {
      const sol = await adapter.solve(PROBLEM);
      expect(adapter.isOptimal(sol)).toBe(true);
      expect(sol.ObjectiveValue).toBe(503);
      const primal = adapter.extractPrimal(sol);
      expect(primal.use8m).toBe(1);
      expect(primal.use9m).toBe(0);
      expect(primal.use10m).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Infeasible 検知
  // -------------------------------------------------------------------------
  describe('Infeasible problem detection', () => {
    const INFEASIBLE = `Minimize
 obj: x
Subject To
 c1: x >= 10
 c2: x <= 5
Bounds
 -10 <= x <= 100
End`;

    test('isOptimal returns false for an infeasible problem', async () => {
      const sol = await adapter.solve(INFEASIBLE);
      expect(adapter.isOptimal(sol)).toBe(false);
      expect(sol.Status).toBe('Infeasible');
    });
  });
});
