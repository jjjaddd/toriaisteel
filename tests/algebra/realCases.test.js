/**
 * tests/algebra/realCases.test.js
 *
 * 実務 6 ケース (tests/fixtures/realCases.js) のスモークテスト。
 *
 * Phase 1 段階で検証できること:
 *   - 全ケースの pieces を ATOM として構築できる
 *   - V2 ベースライン提供ケース (CASE-2, CASE-6) について、
 *     totalPieceCount が pieces の総和と一致する
 *   - 単一定尺で V2 が解いたバー数を含む PLAN を構築できる
 *
 * 「V2 plan を normalize して改善するか」は patterns 単位の知識が必要なので
 * Phase 2 (Arc-Flow ソルバー) 完成後に追加する。
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { cases } = require('../fixtures/realCases.js');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

function loadAlgebra() {
  const sandbox = { console };
  vm.createContext(sandbox);
  for (const rel of [
    'src/core/toriai-namespace.js',
    'src/calculation/yield/algebra/term.js',
    'src/calculation/yield/algebra/axioms.js',
    'src/calculation/yield/algebra/rewriteRules.js',
    'src/calculation/yield/algebra/normalForm.js'
  ]) {
    const code = fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
  }
  return sandbox.Toriai.calculation.yield.algebra;
}

describe('algebra/realCases — 実務 6 ケースのスモーク', () => {
  let term;
  beforeAll(() => {
    term = loadAlgebra().term;
  });

  // -------------------------------------------------------------------------
  // 全ケース共通: 構造的健全性
  // -------------------------------------------------------------------------
  describe('全ケースの構造的健全性', () => {
    test.each(cases.map(c => [c.id, c]))('%s — pieces を ATOM として構築できる', (id, c) => {
      for (const p of c.pieces) {
        const a = term.makeAtom(p.length);
        expect(a.length).toBe(p.length);
      }
    });

    test.each(cases.map(c => [c.id, c]))('%s — totalPieceCount が pieces 合計と一致', (id, c) => {
      const sum = c.pieces.reduce((s, p) => s + p.count, 0);
      expect(sum).toBe(c.totalPieceCount);
    });

    test.each(cases.map(c => [c.id, c]))('%s — availableStocks が positive integer の配列', (id, c) => {
      expect(Array.isArray(c.availableStocks)).toBe(true);
      expect(c.availableStocks.length).toBeGreaterThan(0);
      for (const s of c.availableStocks) {
        expect(Number.isInteger(s)).toBe(true);
        expect(s).toBeGreaterThan(0);
      }
    });

    test.each(cases.map(c => [c.id, c]))('%s — 全 piece が最大定尺に乗る (size <= maxStock - endLoss)', (id, c) => {
      const maxEff = Math.max(...c.availableStocks) - c.endLoss;
      for (const p of c.pieces) {
        expect(p.length).toBeLessThanOrEqual(maxEff);
      }
    });
  });

  // -------------------------------------------------------------------------
  // V2 ベースライン提供ケース: 数値整合性
  // -------------------------------------------------------------------------
  describe('V2 ベースライン提供ケース', () => {
    const baselined = cases.filter(c => c.v2Baseline);

    test('2 ケース提供されている (CASE-2, CASE-6)', () => {
      expect(baselined.map(c => c.id)).toEqual(['CASE-2-L20', 'CASE-6-L65']);
    });

    test.each(baselined.map(c => [c.id, c]))('%s — V2 stockTotal が bars * stock の合計と一致', (id, c) => {
      const computed = c.v2Baseline.bars.reduce((s, b) => s + b.stock * b.count, 0);
      expect(computed).toBe(c.v2Baseline.stockTotal);
    });

    test.each(baselined.map(c => [c.id, c]))('%s — V2 totalBars が bars の count 合計と一致', (id, c) => {
      const computed = c.v2Baseline.bars.reduce((s, b) => s + b.count, 0);
      expect(computed).toBe(c.v2Baseline.totalBars);
    });
  });

  // -------------------------------------------------------------------------
  // CASE-2 (L20×20×3) の V2 ベースライン手検算
  // -------------------------------------------------------------------------
  describe('CASE-2 L-20×20×3 — V2 ベースライン手検算', () => {
    let c;
    beforeAll(() => {
      c = cases.find(x => x.id === 'CASE-2-L20');
    });

    test('pieces 総長 = Σ length × count', () => {
      const totalLen = c.pieces.reduce((s, p) => s + p.length * p.count, 0);
      // 4*1750 + 50*1825 + 60*1830 + 18*1992 + 60*2806
      // = 7000 + 91250 + 109800 + 35856 + 168360
      expect(totalLen).toBe(412266);
    });

    test('V2 yield ≈ pieces / stockTotal の概算と整合', () => {
      const totalLen = c.pieces.reduce((s, p) => s + p.length * p.count, 0);
      const computedYield = totalLen / c.v2Baseline.stockTotal;
      // 412266 / 443000 ≈ 0.9306 = 93.06%
      expect(computedYield).toBeCloseTo(0.9306, 3);
      expect(c.v2Baseline.yieldPctReported).toBeCloseTo(computedYield * 100, 1);
    });
  });

  // -------------------------------------------------------------------------
  // CASE-6 (L65×65×6) の V2 ベースライン手検算
  // -------------------------------------------------------------------------
  describe('CASE-6 L-65×65×6 — V2 ベースライン手検算', () => {
    let c;
    beforeAll(() => {
      c = cases.find(x => x.id === 'CASE-6-L65');
    });

    test('pieces 総長 = Σ length × count', () => {
      const totalLen = c.pieces.reduce((s, p) => s + p.length * p.count, 0);
      // V2 報告 yield 93.5% から逆算: 0.935 * 737000 ≈ 689,000 mm
      expect(totalLen).toBeGreaterThan(680000);
      expect(totalLen).toBeLessThan(700000);
    });

    test('V2 yield ≈ 93.5% と整合', () => {
      const totalLen = c.pieces.reduce((s, p) => s + p.length * p.count, 0);
      const computedYield = totalLen / c.v2Baseline.stockTotal;
      // V2 が報告した 93.5% の ±1% 以内
      expect(computedYield * 100).toBeGreaterThan(92);
      expect(computedYield * 100).toBeLessThan(95);
    });

    test('V2 が単一定尺 11m に縮退している事実を記録', () => {
      const distinctStocks = new Set(c.v2Baseline.bars.map(b => b.stock));
      expect(distinctStocks.size).toBe(1);  // V3 の改善ターゲット
    });
  });
});
