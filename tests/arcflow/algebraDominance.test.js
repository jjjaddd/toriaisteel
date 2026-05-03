/**
 * tests/arcflow/algebraDominance.test.js
 *
 * RESEARCH_DOMINANCE.md §4 の最適性保存 + §5 のアルゴリズム検証。
 *
 * - dominates 述語の正確性
 * - findDominated の正確性
 * - prunePatterns の demand-safety
 * - 実 CG 出力に対する pruning 効果（CASE-6 で何 % 削れるか）
 */

const dom = require('../../src/calculation/yield/arcflow/algebraDominance.js');
const cg = require('../../src/calculation/yield/arcflow/columnGen.js');
const realCases = require('../fixtures/realCases.js');

describe('algebraDominance — pattern dominance for MIP pre-solve', () => {
  // -------------------------------------------------------------------------
  // dominates 述語
  // -------------------------------------------------------------------------
  describe('dominates(P, Q)', () => {
    test('同じパターンは dominate しない (反射性除外)', () => {
      const p = { stock: 10000, counts: [3, 2] };
      expect(dom.dominates(p, p)).toBe(false);
    });

    test('counts 同じ + stock より小さい → P >= Q (R5 dominance)', () => {
      const P = { stock: 8000, counts: [3, 2] };
      const Q = { stock: 10000, counts: [3, 2] };
      expect(dom.dominates(P, Q)).toBe(true);
      expect(dom.dominates(Q, P)).toBe(false);
    });

    test('stock 同じ + counts 全て >= かつ少なくとも 1 つ strict → P >= Q', () => {
      const P = { stock: 10000, counts: [3, 3] };
      const Q = { stock: 10000, counts: [3, 2] };
      expect(dom.dominates(P, Q)).toBe(true);
      expect(dom.dominates(Q, P)).toBe(false);
    });

    test('stock 小さい + counts も全て >= → strict P >= Q', () => {
      const P = { stock: 8000, counts: [4, 2] };
      const Q = { stock: 10000, counts: [3, 2] };
      expect(dom.dominates(P, Q)).toBe(true);
    });

    test('stock 大きい → dominate しない', () => {
      const P = { stock: 12000, counts: [10, 10] };
      const Q = { stock: 10000, counts: [3, 2] };
      expect(dom.dominates(P, Q)).toBe(false);
    });

    test('counts いずれか < → dominate しない', () => {
      const P = { stock: 8000, counts: [3, 1] };
      const Q = { stock: 10000, counts: [3, 2] };
      expect(dom.dominates(P, Q)).toBe(false);
    });

    test('完全同一 (counts も stock も同じ) → false (反射性除外)', () => {
      const P = { stock: 10000, counts: [3, 2] };
      const Q = { stock: 10000, counts: [3, 2] };
      expect(dom.dominates(P, Q)).toBe(false);
    });

    test('counts 長さ不一致 → false (defensive)', () => {
      const P = { stock: 8000, counts: [3, 2] };
      const Q = { stock: 10000, counts: [3, 2, 1] };
      expect(dom.dominates(P, Q)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // findDominated
  // -------------------------------------------------------------------------
  describe('findDominated(patterns)', () => {
    test('単一 pattern → 何もない', () => {
      const r = dom.findDominated([{ stock: 10000, counts: [1] }]);
      expect(r.size).toBe(0);
    });

    test('明確な支配関係を検出', () => {
      const patterns = [
        { stock: 10000, counts: [3] },  // 0
        { stock: 8000, counts: [3] },   // 1: 0 を支配
        { stock: 10000, counts: [4] }   // 2: 0 を支配
      ];
      const r = dom.findDominated(patterns);
      expect(r.has(0)).toBe(true);  // 0 は 1 にも 2 にも支配される
      expect(r.has(1)).toBe(false); // 1 を支配するものはない
      expect(r.has(2)).toBe(false); // 2 を支配するものはない
    });

    test('Pareto 上の複数 pattern (互いに非支配)', () => {
      const patterns = [
        { stock: 10000, counts: [5, 0] },  // piece 0 多い
        { stock: 10000, counts: [0, 5] },  // piece 1 多い
        { stock: 10000, counts: [3, 3] }   // 両方中庸
      ];
      const r = dom.findDominated(patterns);
      // どれも互いに非支配（piece の trade-off）
      expect(r.size).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // prunePatterns
  // -------------------------------------------------------------------------
  describe('prunePatterns(patterns)', () => {
    test('支配されないパターンだけ残る', () => {
      const patterns = [
        { stock: 10000, counts: [3] },
        { stock: 8000, counts: [3] },   // dominates [0]
        { stock: 6000, counts: [2] }
      ];
      const r = dom.prunePatterns(patterns);
      expect(r.kept.length).toBe(2);
      expect(r.dominated.length).toBe(1);
      expect(r.stats.dominatedCount).toBe(1);
    });

    test('stats が正確', () => {
      const patterns = [
        { stock: 10000, counts: [3, 2] },
        { stock: 8000, counts: [3, 2] }   // dominates [0]
      ];
      const r = dom.prunePatterns(patterns);
      expect(r.stats.total).toBe(2);
      expect(r.stats.keptCount).toBe(1);
      expect(r.stats.dominatedCount).toBe(1);
      expect(r.stats.pruneRatio).toBe(0.5);
    });
  });

  // -------------------------------------------------------------------------
  // verifyPruneSafety
  // -------------------------------------------------------------------------
  describe('verifyPruneSafety', () => {
    test('全 piece type が kept でカバーされる場合 safe', () => {
      const patterns = [
        { stock: 10000, counts: [3, 2] },
        { stock: 8000, counts: [3, 2] }
      ];
      const items = [{ count: 5 }, { count: 5 }];
      const r = dom.verifyPruneSafety(patterns, items);
      expect(r.safe).toBe(true);
    });

    test('demand 0 の piece type は除外しても safe', () => {
      const patterns = [{ stock: 10000, counts: [3, 0] }];
      const items = [{ count: 5 }, { count: 0 }];  // piece 1 の demand 0
      const r = dom.verifyPruneSafety(patterns, items);
      expect(r.safe).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 実 CG 出力に対する pruning 効果（実証実験）
  // -------------------------------------------------------------------------
  describe('実 CG 出力での pruning 効果', () => {
    jest.setTimeout(60_000);

    test('CASE-2 L20 の CG 出力 patterns で pruning 効果計測', async () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-2-L20'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      // CG を直接呼んで internal patterns 取得（公開された方法では取れないので、
      // ここでは CG 内部の知識を使う）
      const result = await cg.solveColumnGen(spec);
      // CG result には patterns が含まれない構造なので、_initialPatternsFromFfd で代用
      const items = c.pieces.map(function(p) {
        return { length: p.length, count: p.count, weight: p.length + c.blade };
      });
      const initPatterns = cg._initialPatternsFromFfd(spec, items);
      const pruned = dom.prunePatterns(initPatterns);
      console.log('  CASE-2 patterns:', pruned.stats);
      expect(pruned.kept.length).toBeGreaterThan(0);
      expect(pruned.kept.length).toBeLessThanOrEqual(initPatterns.length);
    });

    test('CASE-6 L65 の CG 出力 patterns で pruning 効果計測', async () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-6-L65'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const items = c.pieces.map(function(p) {
        return { length: p.length, count: p.count, weight: p.length + c.blade };
      });
      const initPatterns = cg._initialPatternsFromFfd(spec, items);
      const pruned = dom.prunePatterns(initPatterns);
      console.log('  CASE-6 initial FFD patterns:', pruned.stats);
      expect(pruned.kept.length).toBeGreaterThan(0);
    });
  });
});
