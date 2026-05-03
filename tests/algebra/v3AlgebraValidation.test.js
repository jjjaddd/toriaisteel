/**
 * tests/algebra/v3AlgebraValidation.test.js
 *
 * V3 ソルバの出力が Phase 1 で構築した algebra 正規形を満たすことを検証する。
 * これは「formal correctness check」: V3 が algebra 公理 A1-A9 + 簡約規則 R1-R5 を
 * 全て遵守した状態で解を返していることの実証。
 *
 * もし isNormalForm === false なら V3 は何かを見落としている → V3 のバグ。
 */

const bridge = require('../../src/calculation/yield/arcflow/algebraBridge.js');
const solver = require('../../src/calculation/yield/arcflow/solver.js');
const realCases = require('../fixtures/realCases.js');

describe('V3 result vs Algebra normal form', () => {
  let algebra;
  beforeAll(() => {
    algebra = bridge.loadAlgebraInSandbox();
  });

  // -------------------------------------------------------------------------
  // ブリッジの基本動作
  // -------------------------------------------------------------------------
  describe('ブリッジ機能', () => {
    test('loadAlgebraInSandbox が algebra namespace を返す', () => {
      expect(algebra).toBeTruthy();
      expect(algebra.term).toBeTruthy();
      expect(algebra.normalForm).toBeTruthy();
      expect(typeof algebra.normalForm.normalize).toBe('function');
    });

    test('v3ResultToPlan: V3 結果から TERM PLAN を構築', () => {
      const v3 = solver.solveMultiStockGreedy({
        blade: 3, endLoss: 150,
        availableStocks: [10000, 9000, 8000],
        pieces: [{ length: 1222, count: 6 }]
      });
      const plan = bridge.v3ResultToPlan(v3, { blade: 3, endLoss: 150 }, algebra);
      expect(algebra.term.isPlan(plan)).toBe(true);
      expect(plan.entries.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 各実ケースで V3 出力が算法的に正規形か
  // -------------------------------------------------------------------------
  describe('V3 FFD output is in algebra normal form', () => {
    test('BUG-V2-001 micro: V3 結果が algebra 正規形', () => {
      const spec = {
        blade: 3, endLoss: 150,
        availableStocks: [10000, 9000, 8000],
        pieces: [{ length: 1222, count: 6 }]
      };
      const v3 = solver.solveMultiStockGreedy(spec);
      const r = bridge.validateV3AgainstAlgebra(v3, spec, spec.availableStocks, algebra);
      expect(r.diagnosis).toBe('ok');
      expect(r.isNormalForm).toBe(true);
      expect(r.normalizeSteps).toBe(0);
    });

    test('USER 1222×333: V3 結果が algebra 正規形', () => {
      const spec = {
        blade: 3, endLoss: 150,
        availableStocks: [6000, 7000, 8000, 9000, 10000, 11000, 12000],
        pieces: [{ length: 1222, count: 333 }]
      };
      const v3 = solver.solveMultiStockGreedy(spec);
      const r = bridge.validateV3AgainstAlgebra(v3, spec, spec.availableStocks, algebra);
      if (!r.isNormalForm) {
        console.log('USER 1222×333 not normal:', r.diagnosis, r.normalizeTrace);
      }
      expect(r.isNormalForm).toBe(true);
    });

    test('CASE-2 L20: V3 結果が algebra 正規形', () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-2-L20'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const v3 = solver.solveMultiStockGreedy(spec);
      const r = bridge.validateV3AgainstAlgebra(v3, spec, spec.availableStocks, algebra);
      if (!r.isNormalForm) {
        console.log('CASE-2 not normal:', r.diagnosis, r.normalizeTrace);
      }
      expect(r.isNormalForm).toBe(true);
    });

    test('CASE-6 L65: V3 結果が algebra 正規形', () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-6-L65'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const v3 = solver.solveMultiStockGreedy(spec);
      const r = bridge.validateV3AgainstAlgebra(v3, spec, spec.availableStocks, algebra);
      if (!r.isNormalForm) {
        console.log('CASE-6 not normal:', r.diagnosis, r.normalizeTrace);
      }
      expect(r.isNormalForm).toBe(true);
    });

    test('複数 piece type ケースも algebra 正規形', () => {
      const spec = {
        blade: 3, endLoss: 150,
        availableStocks: [6000, 8000, 10000, 12000],
        pieces: [
          { length: 3000, count: 5 },
          { length: 2000, count: 8 },
          { length: 1500, count: 12 }
        ]
      };
      const v3 = solver.solveMultiStockGreedy(spec);
      const r = bridge.validateV3AgainstAlgebra(v3, spec, spec.availableStocks, algebra);
      expect(r.isNormalForm).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 逆変換: TERM PLAN → V3 result
  // -------------------------------------------------------------------------
  describe('planToV3Result (逆変換)', () => {
    test('正規化された PLAN を V3 形式に戻せる', () => {
      const spec = {
        blade: 3, endLoss: 150,
        availableStocks: [10000, 9000, 8000]
      };
      // 手で構築した冗長 PLAN（同パターン重複あり）
      const T = algebra.term;
      const pat = T.makePattern({ stock: 10000, blade: 3, endLoss: 150, pieces: [1222] });
      const messy = T.makePlan([
        { pattern: pat, count: 5 },
        { pattern: pat, count: 3 } // 重複（R3 で merge されるはず）
      ]);
      const ctx = { availableStocks: spec.availableStocks };
      const norm = algebra.normalForm.normalize(messy, ctx);
      const v3 = bridge.planToV3Result(norm.term, spec, algebra);
      // 8 個に集約され、stock も downsize されてるはず（R5）
      expect(v3.barCount).toBe(8);
      expect(v3.bars[0].stock).toBeLessThanOrEqual(10000);
    });
  });

  // -------------------------------------------------------------------------
  // 構造的な性質: V3 の出力が algebra の公理を満たす
  // -------------------------------------------------------------------------
  describe('V3 出力が algebra 公理を満たす（構造的検証）', () => {
    test('USER 1222×333: A4 (capacity) 満たす — 全 bar が valid pattern', () => {
      const spec = {
        blade: 3, endLoss: 150,
        availableStocks: [6000, 7000, 8000, 9000, 10000, 11000, 12000],
        pieces: [{ length: 1222, count: 333 }]
      };
      const v3 = solver.solveMultiStockGreedy(spec);
      const T = algebra.term;
      const A = algebra.axioms;
      v3.bars.forEach(function(bar) {
        const pat = T.makePattern({
          stock: bar.stock,
          blade: spec.blade,
          endLoss: spec.endLoss,
          pieces: bar.pattern.slice()
        });
        const a4 = A.verifyA4(pat);
        expect(a4.holds).toBe(true);
      });
    });

    test('CASE-6 L65: 全 bar が valid pattern (A4)', () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-6-L65'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const v3 = solver.solveMultiStockGreedy(spec);
      const T = algebra.term;
      const A = algebra.axioms;
      v3.bars.forEach(function(bar) {
        const pat = T.makePattern({
          stock: bar.stock,
          blade: spec.blade,
          endLoss: spec.endLoss,
          pieces: bar.pattern.slice()
        });
        const a4 = A.verifyA4(pat);
        expect(a4.holds).toBe(true);
      });
    });
  });
});
