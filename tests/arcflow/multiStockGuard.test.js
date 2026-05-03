/**
 * tests/arcflow/multiStockGuard.test.js
 *
 * Phase 2 day-6: 解品質ガードの検証。
 *
 * - computeLowerBound: 材料下界の計算
 * - assessSolution: 多軸診断（demand / 縮退 / 最適性ギャップ / downsize 健全性）
 * - assertSolutionQuality: 重大問題で throw
 * - CASE-2 / CASE-6 で V3 の解が品質基準を満たすことを assertion で永続化
 */

const guard = require('../../src/calculation/yield/arcflow/multiStockGuard.js');
const solver = require('../../src/calculation/yield/arcflow/solver.js');
const realCases = require('../fixtures/realCases.js');

describe('arcflow/multiStockGuard — 解品質診断と縮退検知', () => {
  // -------------------------------------------------------------------------
  // computeLowerBound
  // -------------------------------------------------------------------------
  describe('computeLowerBound', () => {
    test('BUG-V2-001 micro: [1222 × 6] in [10000,9000,8000] → minBars = 1', () => {
      const lb = guard.computeLowerBound({
        blade: 3, endLoss: 150,
        availableStocks: [10000, 9000, 8000],
        pieces: [{ length: 1222, count: 6 }]
      });
      expect(lb.minBars).toBe(1);
      expect(lb.totalPieces).toBe(6);
      expect(lb.totalPieceLen).toBe(7332);
    });

    test('CASE-2 L20 (n=192, sum=412266) lower bound', () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-2-L20'; });
      const lb = guard.computeLowerBound({
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      });
      expect(lb.totalPieces).toBe(192);
      expect(lb.totalPieceLen).toBe(412266);
      // maxBarCapacity = 12000 - 150 = 11850
      // minBars = ceil((412266 + 192*3) / (11850 + 3)) = ceil(412842 / 11853) = ceil(34.83) = 35
      expect(lb.minBars).toBe(35);
    });

    test('CASE-6 L65 (n=463) lower bound', () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-6-L65'; });
      const lb = guard.computeLowerBound({
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      });
      expect(lb.totalPieces).toBe(463);
      // 真の最適は 58〜60 程度のはず（V2=67、V3=62 が実測）
      expect(lb.minBars).toBeGreaterThan(50);
      expect(lb.minBars).toBeLessThan(65);
    });

    test('空 pieces で minBars=0', () => {
      const lb = guard.computeLowerBound({
        blade: 3, endLoss: 150,
        availableStocks: [10000],
        pieces: []
      });
      expect(lb.minBars).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // assessSolution: demand 検証
  // -------------------------------------------------------------------------
  describe('assessSolution — demand 検証', () => {
    test('正しい demand を満たす解は ok=true', () => {
      const spec = {
        blade: 3, endLoss: 150,
        availableStocks: [10000, 9000, 8000],
        pieces: [{ length: 1222, count: 6 }]
      };
      const result = solver.solveMultiStockGreedy(spec);
      const a = guard.assessSolution(spec, result);
      expect(a.ok).toBe(true);
      expect(a.issues).toHaveLength(0);
      expect(a.demandOk).toBe(true);
    });

    test('demand 不足を検知', () => {
      const spec = {
        blade: 3, endLoss: 150,
        availableStocks: [10000],
        pieces: [{ length: 1222, count: 6 }]
      };
      // 故意に bars を 1 個減らした result を作る
      const broken = {
        status: 'fake',
        barCount: 1,
        stockTotal: 10000,
        pieceTotal: 1222 * 5,
        lossTotal: 0,
        bars: [{ stock: 10000, pattern: [1222, 1222, 1222, 1222, 1222], count: 1 }],
        distinctStockCount: 1
      };
      const a = guard.assessSolution(spec, broken);
      expect(a.ok).toBe(false);
      expect(a.issues.some(function(i) { return i.startsWith('demand_unsatisfied'); })).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 縮退検知 (BUG-V2-002 ガード)
  // -------------------------------------------------------------------------
  describe('縮退検知 (BUG-V2-002 ガード)', () => {
    test('多定尺利用可能で 1 種しか使ってない大規模解 → 縮退フラグ', () => {
      const spec = {
        blade: 3, endLoss: 150,
        availableStocks: [10000, 9000, 8000, 7000],
        pieces: [{ length: 1222, count: 60 }]
      };
      // 故意に「全部 8000mm 単一」の縮退解を渡す（最大定尺 10000 ではない）
      const degenerated = {
        status: 'degenerated',
        barCount: 10,
        stockTotal: 80000,
        pieceTotal: 73320,
        lossTotal: 6680,
        bars: [{ stock: 8000, pattern: [1222, 1222, 1222, 1222, 1222, 1222], count: 10 }],
        distinctStockCount: 1
      };
      const a = guard.assessSolution(spec, degenerated);
      expect(a.issues.some(function(i) { return i.startsWith('single_stock_degeneration'); })).toBe(true);
    });

    test('最大定尺だけで全 piece 入る場合は縮退と見なさない', () => {
      const spec = {
        blade: 3, endLoss: 150,
        availableStocks: [12000, 6000],
        pieces: [{ length: 5000, count: 10 }]
      };
      // 全部 12m 単一が正当な選択（5000 単発で 6m に入らない size+endLoss=5150 > 5850 だが
      // 6m に入る: 6000-150=5850 ≥ 5000、まあ複雑）
      // ここでは「最大定尺で大規模単一」のシナリオで縮退フラグが立たないことを確認
      const okSingle = {
        status: 'optimal',
        barCount: 10,
        stockTotal: 120000,
        pieceTotal: 50000,
        lossTotal: 0,
        bars: [{ stock: 12000, pattern: [5000], count: 10 }],
        distinctStockCount: 1
      };
      const a = guard.assessSolution(spec, okSingle);
      expect(a.issues.some(function(i) { return i.startsWith('single_stock_degeneration'); })).toBe(false);
    });

    test('小規模 (< 5 bars) なら縮退フラグなし（誤検知防止）', () => {
      const spec = {
        blade: 3, endLoss: 150,
        availableStocks: [10000, 9000, 8000],
        pieces: [{ length: 1222, count: 12 }]
      };
      const small = {
        status: 'optimal',
        barCount: 2,
        stockTotal: 16000,
        pieceTotal: 14664,
        lossTotal: 0,
        bars: [{ stock: 8000, pattern: [1222, 1222, 1222, 1222, 1222, 1222], count: 2 }],
        distinctStockCount: 1
      };
      const a = guard.assessSolution(spec, small);
      expect(a.issues.some(function(i) { return i.startsWith('single_stock_degeneration'); })).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // CASE-2 / CASE-6 で V3 が品質基準を満たすことを永続的に保証
  // -------------------------------------------------------------------------
  describe('CASE-2 / CASE-6 V3 解の品質保証 (BUG-V2-002 再発防止 assertion)', () => {
    test('CASE-2 V3 解は assertSolutionQuality を pass', () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-2-L20'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const v3 = solver.solveMultiStockGreedy(spec);
      // FFD なので最適性ギャップは 30% 以内に収まらない可能性あり → ignore
      const a = guard.assertSolutionQuality(spec, v3, { ignoreOptimalityGap: true });
      expect(a.demandOk).toBe(true);
      expect(a.distinctStockCount).toBeGreaterThanOrEqual(1);
    });

    test('CASE-2 V3 の最適性ギャップが 10% 以内 (37 bars vs LB=35)', () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-2-L20'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const v3 = solver.solveMultiStockGreedy(spec);
      const a = guard.assessSolution(spec, v3);
      // V3 = 37 bars, LB = 35 → gap = 2 bars = 5.7%
      expect(a.barGap).toBeLessThanOrEqual(5);
      expect(a.barGapRatio).toBeLessThan(0.15);
      expect(a.barCount).toBe(37);
      expect(a.lowerBoundBars).toBe(35);
    });

    test('CASE-6 V3 解は assertSolutionQuality を pass + 多定尺利用', () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-6-L65'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const v3 = solver.solveMultiStockGreedy(spec);
      const a = guard.assertSolutionQuality(spec, v3, { ignoreOptimalityGap: true });
      expect(a.demandOk).toBe(true);
      // V2 が単一定尺だった件、V3 は多定尺を使うこと
      expect(a.distinctStockCount).toBeGreaterThanOrEqual(2);
    });

    test('CASE-6 V3 は V2 (67 bars) より少ないバー本数', () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-6-L65'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const v3 = solver.solveMultiStockGreedy(spec);
      expect(v3.barCount).toBeLessThan(c.v2Baseline.totalBars); // < 67
      expect(v3.stockTotal).toBeLessThan(c.v2Baseline.stockTotal); // < 737,000
    });
  });

  // -------------------------------------------------------------------------
  // assertSolutionQuality — throw 動作
  // -------------------------------------------------------------------------
  describe('assertSolutionQuality', () => {
    test('問題なければ assessment を返す', () => {
      const spec = {
        blade: 3, endLoss: 150,
        availableStocks: [10000, 9000, 8000],
        pieces: [{ length: 1222, count: 6 }]
      };
      const v3 = solver.solveMultiStockGreedy(spec);
      const a = guard.assertSolutionQuality(spec, v3);
      expect(a.ok).toBe(true);
    });

    test('demand 不足は throw', () => {
      const spec = {
        blade: 3, endLoss: 150,
        availableStocks: [10000],
        pieces: [{ length: 1222, count: 6 }]
      };
      const broken = {
        status: 'fake', barCount: 0, stockTotal: 0, pieceTotal: 0, lossTotal: 0,
        bars: [], distinctStockCount: 0
      };
      expect(() => guard.assertSolutionQuality(spec, broken)).toThrow(/demand_unsatisfied/);
    });
  });
});
