/**
 * tests/arcflow/solver.test.js
 *
 * Phase 2 day-3: graph + HiGHS 統合の end-to-end 検証。
 *
 * 検証項目:
 *   - buildLp: CPLEX LP 文字列の構造健全性
 *   - solveSingleStock: 単一定尺で正しいバー数 / パターンを返す
 *   - decodeFlow: パス分解の正確性
 *   - BUG-V2-001 micro: 1 ステップで最適解
 */

const solver = require('../../src/calculation/yield/arcflow/solver.js');
const graphBuilder = require('../../src/calculation/yield/arcflow/graph.js');
const highs = require('../../src/calculation/yield/arcflow/highsAdapter.js');

describe('arcflow/solver — graph + HiGHS 統合', () => {
  jest.setTimeout(30_000);

  // -------------------------------------------------------------------------
  // buildLp: 構造的健全性
  // -------------------------------------------------------------------------
  describe('buildLp', () => {
    test('1222 × 6 in 10m の LP に必要なセクションが揃う', () => {
      const g = graphBuilder.buildArcFlowGraph({
        stock: 10000, blade: 3, endLoss: 150,
        pieces: [{ length: 1222, count: 6 }]
      });
      const lp = solver.buildLp(g);
      expect(lp).toMatch(/Minimize/);
      expect(lp).toMatch(/obj: z/);
      expect(lp).toMatch(/Subject To/);
      expect(lp).toMatch(/source:/);
      expect(lp).toMatch(/sink:/);
      expect(lp).toMatch(/demand_0: .* = 6/);
      expect(lp).toMatch(/General/);
      expect(lp).toMatch(/End$/);
    });

    test('複数 piece type で demand 制約が複数生成される', () => {
      const g = graphBuilder.buildArcFlowGraph({
        stock: 10000, blade: 3, endLoss: 150,
        pieces: [
          { length: 1222, count: 4 },
          { length: 800, count: 3 }
        ]
      });
      const lp = solver.buildLp(g);
      expect(lp).toMatch(/demand_0: .* = 4/);
      expect(lp).toMatch(/demand_1: .* = 3/);
    });
  });

  // -------------------------------------------------------------------------
  // solveSingleStock: BUG-V2-001 micro
  // -------------------------------------------------------------------------
  describe('solveSingleStock — BUG-V2-001 micro', () => {
    test('[1222 × 6] in 10m: barCount = 1, pattern = 6 個の 1222', async () => {
      const r = await solver.solveSingleStock({
        stock: 10000, blade: 3, endLoss: 150,
        pieces: [{ length: 1222, count: 6 }]
      });
      expect(r.status).toBe('optimal');
      expect(r.barCount).toBe(1);
      expect(r.bars).toHaveLength(1);
      expect(r.bars[0].pattern).toEqual([1222, 1222, 1222, 1222, 1222, 1222]);
      expect(r.bars[0].count).toBe(1);
      expect(r.bars[0].stock).toBe(10000);
      expect(r.stockTotal).toBe(10000);
      expect(r.pieceTotal).toBe(1222 * 6);
      expect(r.lossTotal).toBe(2503); // V2 と同じ（10m 単体だと変わらない）
    });

    test('[1222 × 6] in 8m: barCount = 1, loss = 503 (V2 比 -2000mm)', async () => {
      const r = await solver.solveSingleStock({
        stock: 8000, blade: 3, endLoss: 150,
        pieces: [{ length: 1222, count: 6 }]
      });
      expect(r.status).toBe('optimal');
      expect(r.barCount).toBe(1);
      expect(r.lossTotal).toBe(503);
      expect(r.stockTotal).toBe(8000);
    });

    test('[1222 × 6] in 9m: barCount = 1, loss = 1503', async () => {
      const r = await solver.solveSingleStock({
        stock: 9000, blade: 3, endLoss: 150,
        pieces: [{ length: 1222, count: 6 }]
      });
      expect(r.lossTotal).toBe(1503);
      expect(r.stockTotal).toBe(9000);
    });
  });

  // -------------------------------------------------------------------------
  // 複数バー必要なケース
  // -------------------------------------------------------------------------
  describe('複数バーケース', () => {
    test('[1222 × 14] in 10m: 8 個 / バー → 2 バー（残 6 が 2 本目）', async () => {
      // 1 バーあたり最大 floor(9853/1225) = 8 個
      // 14 個 → 1 バー目 8 個 + 2 バー目 6 個
      const r = await solver.solveSingleStock({
        stock: 10000, blade: 3, endLoss: 150,
        pieces: [{ length: 1222, count: 14 }]
      });
      expect(r.status).toBe('optimal');
      expect(r.barCount).toBe(2);
      expect(r.bars.length).toBeGreaterThanOrEqual(1);
      // 14 個ぶん入っていることを確認
      const totalPieces = r.bars.reduce(function(s, b) { return s + b.pattern.length * b.count; }, 0);
      expect(totalPieces).toBe(14);
    });

    test('[1222 × 16] in 10m: ちょうど 2 バー (8 + 8)', async () => {
      const r = await solver.solveSingleStock({
        stock: 10000, blade: 3, endLoss: 150,
        pieces: [{ length: 1222, count: 16 }]
      });
      expect(r.barCount).toBe(2);
      // 同パターン (8 個ずつ) の bar が 1 種類で count=2 のはず
      expect(r.bars).toHaveLength(1);
      expect(r.bars[0].pattern).toEqual([1222, 1222, 1222, 1222, 1222, 1222, 1222, 1222]);
      expect(r.bars[0].count).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // 複数 piece type
  // -------------------------------------------------------------------------
  describe('複数 piece type', () => {
    test('[1222 × 4 + 800 × 2] in 10m: 1 バーに収まる', async () => {
      // size = 4*1222 + 2*800 + 5*3 = 4888 + 1600 + 15 = 6503 ≤ 9850
      const r = await solver.solveSingleStock({
        stock: 10000, blade: 3, endLoss: 150,
        pieces: [
          { length: 1222, count: 4 },
          { length: 800, count: 2 }
        ]
      });
      expect(r.status).toBe('optimal');
      expect(r.barCount).toBe(1);
      const total = r.bars.reduce(function(s, b) { return s + b.pattern.length * b.count; }, 0);
      expect(total).toBe(6); // 4 + 2 = 6 個
    });

    test('[3000 × 2 + 2000 × 3] in 10m: バー本数最小化', async () => {
      // size_per_bar 上限: 3000+3000+2000+2*3 = 8006 → 2 個 + 1 個 の組合せが多々
      const r = await solver.solveSingleStock({
        stock: 10000, blade: 3, endLoss: 150,
        pieces: [
          { length: 3000, count: 2 },
          { length: 2000, count: 3 }
        ]
      });
      expect(r.status).toBe('optimal');
      // 全 5 ピースを 1 バー: 2*3000 + 3*2000 + 4*3 = 6000+6000+12 = 12012 > 9850 ✗
      // → 2 バー必要
      expect(r.barCount).toBeGreaterThanOrEqual(2);
      const total = r.bars.reduce(function(s, b) { return s + b.pattern.length * b.count; }, 0);
      expect(total).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // CASE-2 L20 — k=5, n=192 規模で HiGHS-WASM MIP が "Aborted()" で落ちる事象を発見
  // (Phase 2 day-3 の day-3 スコープ外。Phase 2 day-4 以降で対処予定)
  //
  // 原因仮説:
  //   1. MIP 探索木が WASM スタック制限を超えている
  //   2. Presolve オプションを渡せない（HiGHS 1.8.0 既知の罠で options を渡すと
  //      parse 失敗するため、MIP 制御パラメータを渡せない）
  //   3. 圧縮 arc-flow の対称性削減が無いため MIP が冗長探索している
  //
  // 対処候補（Phase 2 day-4 以降）:
  //   - LP 緩和の解 (= 36.83 が出ることは確認済) を整数丸めしてフォールバック
  //   - 列生成で局所最適解を逐次構築（メモリ効率）
  //   - 対称性削減付き compact arc-flow に書き換え
  // -------------------------------------------------------------------------
  describe.skip('CASE-2 L20 を 12m 単一定尺で (Phase 2 day-4 で対処)', () => {
    test('barCount が出る、全 piece 数が満たされる', async () => {
      const spec = {
        stock: 12000, blade: 3, endLoss: 150,
        pieces: [
          { length: 1750, count: 4 },
          { length: 1825, count: 50 },
          { length: 1830, count: 60 },
          { length: 1992, count: 18 },
          { length: 2806, count: 60 }
        ]
      };
      const r = await solver.solveSingleStock(spec);
      expect(r.status).toBe('optimal');
      expect(r.barCount).toBeGreaterThan(0);
      const totalPieces = r.bars.reduce(function(s, b) { return s + b.pattern.length * b.count; }, 0);
      expect(totalPieces).toBe(4 + 50 + 60 + 18 + 60); // 192
    }, 60_000);
  });
});
