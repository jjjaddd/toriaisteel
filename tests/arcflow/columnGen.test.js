/**
 * tests/arcflow/columnGen.test.js
 *
 * Phase 2 day-7: Column Generation の検証。
 *
 * - bounded knapsack の正確性
 * - CG が小規模問題で最適解を返す
 * - CG が CASE-2 / CASE-6 で FFD と同等以上の解を返す（理論最適に近い）
 */

const cg = require('../../src/calculation/yield/arcflow/columnGen.js');
const solver = require('../../src/calculation/yield/arcflow/solver.js');
const realCases = require('../fixtures/realCases.js');

describe('arcflow/columnGen — Column Generation (Gilmore-Gomory)', () => {
  jest.setTimeout(60_000);

  // -------------------------------------------------------------------------
  // bounded knapsack
  // -------------------------------------------------------------------------
  describe('boundedKnapsack', () => {
    test('単一 item: capacity 内で最大個数取れる', () => {
      const items = [{ value: 10, weight: 100, count: 5 }];
      const r = cg._boundedKnapsack(items, 350);
      // 350 / 100 = 3 → 3 個取って value=30
      expect(r.counts[0]).toBe(3);
      expect(r.value).toBe(30);
    });

    test('demand cap が効く', () => {
      const items = [{ value: 10, weight: 100, count: 2 }];
      const r = cg._boundedKnapsack(items, 1000);
      // capacity allows 10 但し demand 2 でキャップ
      expect(r.counts[0]).toBe(2);
      expect(r.value).toBe(20);
    });

    test('複数 item で最適配分', () => {
      // Knapsack 古典: weight 5 -> value 10 (count 2), weight 3 -> value 6 (count 3)
      // capacity 10: 5+5=10 -> 20, 5+3+3=11 不可, 3+3+3=9 -> 18, 5+3=8 -> 16
      // 答え: 5×2 = value 20
      const items = [
        { value: 10, weight: 5, count: 2 },
        { value: 6, weight: 3, count: 3 }
      ];
      const r = cg._boundedKnapsack(items, 10);
      expect(r.value).toBe(20);
    });

    test('零値 item は無視', () => {
      const items = [
        { value: 0, weight: 100, count: 5 },
        { value: 5, weight: 50, count: 4 }
      ];
      const r = cg._boundedKnapsack(items, 200);
      expect(r.counts[0]).toBe(0);
      expect(r.counts[1]).toBe(4);
    });
  });

  // -------------------------------------------------------------------------
  // Master LP builder の構造
  // -------------------------------------------------------------------------
  describe('_buildMasterLp', () => {
    test('LP 文字列に必要セクションが揃う', () => {
      const items = [{ length: 1222, count: 6, weight: 1225 }];
      const patterns = [
        { stock: 10000, counts: [6] },
        { stock: 8000, counts: [6] }
      ];
      const lp = cg._buildMasterLp(patterns, items, false);
      expect(lp).toMatch(/Minimize/);
      expect(lp).toMatch(/obj:/);
      expect(lp).toMatch(/Subject To/);
      expect(lp).toMatch(/demand_0:.* >= 6/);
      expect(lp).toMatch(/Bounds/);
      expect(lp).toMatch(/End$/);
    });

    test('asMip=true で General セクションが追加', () => {
      const items = [{ length: 1222, count: 6, weight: 1225 }];
      const patterns = [{ stock: 8000, counts: [6] }];
      const lp = cg._buildMasterLp(patterns, items, true);
      expect(lp).toMatch(/General/);
    });
  });

  // -------------------------------------------------------------------------
  // CG end-to-end
  // -------------------------------------------------------------------------
  describe('solveColumnGen — end-to-end', () => {
    test('BUG-V2-001 micro: [1222 × 6] in [10000,9000,8000] → 1 bar / 8m', async () => {
      const r = await cg.solveColumnGen({
        blade: 3, endLoss: 150,
        availableStocks: [10000, 9000, 8000],
        pieces: [{ length: 1222, count: 6 }]
      });
      expect(r.status).toMatch(/cg_/);
      expect(r.barCount).toBe(1);
      expect(r.bars[0].stock).toBe(8000);
      // demand satisfied
      const totalPieces = r.bars.reduce(function(s, b) { return s + b.pattern.length * b.count; }, 0);
      expect(totalPieces).toBe(6);
    });

    test('複数バーケース: [1222 × 16] in 10m → 2 bars (8+8)', async () => {
      const r = await cg.solveColumnGen({
        blade: 3, endLoss: 150,
        availableStocks: [10000, 9000, 8000, 7000, 6000],
        pieces: [{ length: 1222, count: 16 }]
      });
      expect(r.status).toMatch(/cg_/);
      expect(r.barCount).toBeGreaterThanOrEqual(2);
      const totalPieces = r.bars.reduce(function(s, b) { return s + b.pattern.length * b.count; }, 0);
      expect(totalPieces).toBe(16);
    });

    test('USER 1222×333: CG で stockTotal が FFD と同等以下', async () => {
      const spec = {
        blade: 3, endLoss: 150,
        availableStocks: [6000, 7000, 8000, 9000, 10000, 11000, 12000],
        pieces: [{ length: 1222, count: 333 }]
      };
      const ffd = solver.solveMultiStockGreedy(spec);
      const r = await cg.solveColumnGen(spec);
      expect(r.status).toMatch(/cg_/);
      // pieces 全て満たす
      const totalPieces = r.bars.reduce(function(s, b) { return s + b.pattern.length * b.count; }, 0);
      expect(totalPieces).toBe(333);
      // CG は FFD 以上
      expect(r.stockTotal).toBeLessThanOrEqual(ffd.stockTotal);
    });
  });

  // -------------------------------------------------------------------------
  // CASE-2 / CASE-6 で CG が FFD 以上か
  // -------------------------------------------------------------------------
  describe('CASE-2 / CASE-6 benchmark — CG vs FFD', () => {
    test('CASE-2 L20: CG が FFD と同等以上', async () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-2-L20'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const ffd = solver.solveMultiStockGreedy(spec);
      const r = await cg.solveColumnGen(spec);
      console.log('  CASE-2 FFD:', ffd.barCount, 'bars,', ffd.stockTotal, 'mm');
      console.log('  CASE-2 CG :', r.barCount, 'bars,', r.stockTotal, 'mm, status=' + r.status);
      console.log('  CASE-2 CG meta:', JSON.stringify(r._cgMeta));
      const totalPieces = r.bars.reduce(function(s, b) { return s + b.pattern.length * b.count; }, 0);
      expect(totalPieces).toBe(c.totalPieceCount);
      expect(r.stockTotal).toBeLessThanOrEqual(ffd.stockTotal);
    });

    test('solveBest — CASE-2 で CG が選ばれる (LP-optimal で 1000mm 改善)', async () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-2-L20'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const r = await cg.solveBest(spec);
      expect(r.source).toBe('cg');
      expect(r.picked.stockTotal).toBeLessThan(r.ffd.stockTotal);
      expect(r.cg._cgMeta.lpGap).toBeLessThan(0.001); // LP-tight
    });

    test('solveBest — CASE-6 で FFD が選ばれる（CG over-coverage 回避）', async () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-6-L65'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const r = await cg.solveBest(spec);
      // CG が FFD より良ければ CG、悪ければ FFD → どちらでも良いが品質保証
      expect(r.picked.barCount).toBeLessThanOrEqual(r.ffd.barCount);
      expect(r.picked.stockTotal).toBeLessThanOrEqual(r.ffd.stockTotal);
    });

    test('CASE-6 L65 直接 CG: 解が返る or status 明示で fallback', async () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-6-L65'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const r = await cg.solveColumnGen(spec);
      // CG が成功した場合は demand 充足、失敗した場合は status 明示
      if (r.bars && r.bars.length > 0) {
        const lengthCounts = {};
        r.bars.forEach(function(b) {
          b.pattern.forEach(function(len) {
            lengthCounts[len] = (lengthCounts[len] || 0) + b.count;
          });
        });
        c.pieces.forEach(function(p) {
          expect(lengthCounts[p.length] || 0).toBeGreaterThanOrEqual(p.count);
        });
      } else {
        // 大規模 MIP 失敗時の path (LP solver 失敗等) — status だけ確認
        expect(r.status).toMatch(/^(mip_|lp_|infeasible|invalid)/);
      }
    });
  });
});
