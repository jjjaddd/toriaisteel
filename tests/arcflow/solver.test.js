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
  // FFD Fallback (Phase 2 day-4)
  // BUG-V3-001 (HiGHS-WASM Aborted on medium MIP) を回避する純 JS パッカー
  // -------------------------------------------------------------------------
  describe('FFD fallback (純 JS、HiGHS 不使用)', () => {
    test('BUG-V2-001 micro [1222 × 6] in 8m: FFD でも 1 バー / loss 503', () => {
      const r = solver.solveSingleStockGreedy({
        stock: 8000, blade: 3, endLoss: 150,
        pieces: [{ length: 1222, count: 6 }]
      });
      expect(r.status).toBe('greedy_ffd');
      expect(r.barCount).toBe(1);
      expect(r.lossTotal).toBe(503);
    });

    test('[1222 × 16] in 10m: FFD で 2 バー (8+8)', () => {
      const r = solver.solveSingleStockGreedy({
        stock: 10000, blade: 3, endLoss: 150,
        pieces: [{ length: 1222, count: 16 }]
      });
      expect(r.barCount).toBe(2);
    });

    test('全 piece 数が常に満たされる（demand 保証）', () => {
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
      const r = solver.solveSingleStockGreedy(spec);
      expect(r.status).toBe('greedy_ffd');
      const totalPieces = r.bars.reduce(function(s, b) { return s + b.pattern.length * b.count; }, 0);
      expect(totalPieces).toBe(192);
    });

    test('物理的に入らない piece は infeasible を返す', () => {
      const r = solver.solveSingleStockGreedy({
        stock: 1000, blade: 3, endLoss: 150,
        pieces: [{ length: 9000, count: 1 }]
      });
      expect(r.status).toBe('infeasible');
      expect(r.barCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Robust solver: MIP → fallback to FFD
  // BUG-V3-001 を完全に隠蔽し、必ず使える解を返す
  // -------------------------------------------------------------------------
  describe('solveSingleStockRobust (MIP → FFD フォールバック)', () => {
    test('小規模 (BUG-V2-001 micro): MIP path で optimal', async () => {
      const r = await solver.solveSingleStockRobust({
        stock: 8000, blade: 3, endLoss: 150,
        pieces: [{ length: 1222, count: 6 }]
      });
      expect(r.status).toBe('optimal');
      expect(r.barCount).toBe(1);
      expect(r.lossTotal).toBe(503);
    });

    test('CASE-2 L20 12m 単一定尺: MIP が落ちて FFD で必ず解を返す (BUG-V3-001)', async () => {
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
      const r = await solver.solveSingleStockRobust(spec);
      // MIP が optimal なら 'optimal'、落ちて FFD なら 'greedy_ffd'
      expect(['optimal', 'greedy_ffd']).toContain(r.status);
      expect(r.barCount).toBeGreaterThan(0);
      const totalPieces = r.bars.reduce(function(s, b) { return s + b.pattern.length * b.count; }, 0);
      expect(totalPieces).toBe(192);
      // 12m 単一定尺なので最低 ceil(412266 / (12000 - 150 + blade補正)) 程度のバー数になる
      // V2 の多定尺 60 本と直接比較は不可（多定尺は day-5 以降で対応）
    }, 60_000);
  });
});
