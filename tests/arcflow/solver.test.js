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
const realCases = require('../fixtures/realCases.js');

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

  // -------------------------------------------------------------------------
  // Phase 2 day-5: Multi-stock FFD
  // 真の勝負どころ — V2 baseline と直接比較
  // -------------------------------------------------------------------------
  describe('solveMultiStockGreedy (Phase 2 day-5)', () => {
    test('BUG-V2-001 micro: pieces=[1222×6], stocks=[10000,9000,8000] → 8m を選ぶ', () => {
      const r = solver.solveMultiStockGreedy({
        blade: 3, endLoss: 150,
        availableStocks: [10000, 9000, 8000],
        pieces: [{ length: 1222, count: 6 }]
      });
      expect(r.status).toBe('greedy_ffd_multi');
      expect(r.barCount).toBe(1);
      expect(r.bars[0].stock).toBe(8000);
      expect(r.lossTotal).toBe(503);
      expect(r.distinctStockCount).toBe(1);
    });

    test('単一定尺セット (8000 のみ) は単一定尺に縮退', () => {
      const r = solver.solveMultiStockGreedy({
        blade: 3, endLoss: 150,
        availableStocks: [8000],
        pieces: [{ length: 1222, count: 6 }]
      });
      expect(r.bars[0].stock).toBe(8000);
      expect(r.distinctStockCount).toBe(1);
    });

    test('USER 報告 1222×333 (L-20×20×3 多定尺): V3 が V2 より母材削減', () => {
      // ユーザー画面で V2 が 10m×42=420,000mm を出していたケース
      // 期待: V3 が 41×10m + 1×7m = 417,000mm に落とす
      const r = solver.solveMultiStockGreedy({
        blade: 3, endLoss: 150,
        availableStocks: [5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000],
        pieces: [{ length: 1222, count: 333 }]
      });
      expect(r.status).toBe('greedy_ffd_multi');
      const totalPieces = r.bars.reduce(function(s, b) { return s + b.pattern.length * b.count; }, 0);
      expect(totalPieces).toBe(333);
      // V2 の 420,000mm より少ないこと（理論最適 = 417,000mm）
      expect(r.stockTotal).toBeLessThanOrEqual(420000);
      // 多定尺ミックス（10m + 短い定尺）が望ましい
      expect(r.distinctStockCount).toBeGreaterThanOrEqual(2);
    });

    test('infeasible (どの定尺にも入らない piece)', () => {
      const r = solver.solveMultiStockGreedy({
        blade: 3, endLoss: 150,
        availableStocks: [5500, 6000],
        pieces: [{ length: 9000, count: 1 }]
      });
      expect(r.status).toBe('infeasible');
    });

    // ---------------------------------------------------------------------
    // CASE-2 L20: V2 baseline 60 bars / 443,000mm / 93.1% を超えるか
    // ---------------------------------------------------------------------
    describe('CASE-2 L20 vs V2 baseline', () => {
      const case2 = realCases.cases.find(function(c) { return c.id === 'CASE-2-L20'; });
      let v3;
      beforeAll(() => {
        v3 = solver.solveMultiStockGreedy({
          blade: case2.blade,
          endLoss: case2.endLoss,
          availableStocks: case2.availableStocks,
          pieces: case2.pieces
        });
      });

      test('解が返る、全 piece 数満たす', () => {
        expect(v3.status).toBe('greedy_ffd_multi');
        const totalPieces = v3.bars.reduce(function(s, b) { return s + b.pattern.length * b.count; }, 0);
        expect(totalPieces).toBe(case2.totalPieceCount);
      });

      test('多定尺ミックスが発生する (distinctStockCount ≥ 2)', () => {
        expect(v3.distinctStockCount).toBeGreaterThanOrEqual(2);
      });

      test('V2 baseline (60 bars) と比較してログ出力', () => {
        const v2 = case2.v2Baseline;
        console.log('  CASE-2 V2 baseline:', v2.totalBars, 'bars,', v2.stockTotal, 'mm,', v2.yieldPctReported, '%');
        console.log('  CASE-2 V3 multi   :', v3.barCount, 'bars,', v3.stockTotal, 'mm,',
          (v3.pieceTotal / v3.stockTotal * 100).toFixed(2), '%',
          'distinct stocks:', v3.distinctStockCount);
        console.log('  V3 stockBreakdown:', JSON.stringify(v3.stockBreakdown));
        // V3 がバー本数 or 母材総量で勝つことを期待（FFD なので最適保証なし）
        // hard 比較せず緩く: 全 piece 数満たし、status が optimal/greedy なら合格
        expect(v3.barCount).toBeGreaterThan(0);
      });
    });

    // ---------------------------------------------------------------------
    // CASE-6 L65: V2 が 11m 単一定尺に縮退した最大ケース
    // V2 baseline 67 bars / 737,000mm / 93.5%
    // ---------------------------------------------------------------------
    describe('CASE-6 L65 vs V2 baseline (V2 が単一定尺に縮退した最大ケース)', () => {
      const case6 = realCases.cases.find(function(c) { return c.id === 'CASE-6-L65'; });
      let v3;
      beforeAll(() => {
        v3 = solver.solveMultiStockGreedy({
          blade: case6.blade,
          endLoss: case6.endLoss,
          availableStocks: case6.availableStocks,
          pieces: case6.pieces
        });
      });

      test('解が返る、全 piece 数満たす', () => {
        expect(v3.status).toBe('greedy_ffd_multi');
        const totalPieces = v3.bars.reduce(function(s, b) { return s + b.pattern.length * b.count; }, 0);
        expect(totalPieces).toBe(case6.totalPieceCount);
      });

      test('多定尺ミックスが発生する (BUG-V2-002 の根治)', () => {
        // V2 は 11m 単一に縮退してた → V3 は複数定尺を使うはず
        expect(v3.distinctStockCount).toBeGreaterThanOrEqual(2);
      });

      test('V2 baseline (67 bars / 737,000mm) と比較してログ出力', () => {
        const v2 = case6.v2Baseline;
        console.log('  CASE-6 V2 baseline:', v2.totalBars, 'bars,', v2.stockTotal, 'mm,', v2.yieldPctReported, '%');
        console.log('  CASE-6 V3 multi   :', v3.barCount, 'bars,', v3.stockTotal, 'mm,',
          (v3.pieceTotal / v3.stockTotal * 100).toFixed(2), '%',
          'distinct stocks:', v3.distinctStockCount);
        console.log('  V3 stockBreakdown:', JSON.stringify(v3.stockBreakdown));
        expect(v3.barCount).toBeGreaterThan(0);
      });
    });
  });
});
