/**
 * tests/research/algebraicCertificate.test.js
 *
 * Phase K-4: algebraic optimality certificate の検証。
 */

const cert = require('../../src/calculation/yield/research/algebraicCertificate.js');
const exactCg = require('../../src/calculation/yield/research/rationalCg.js');
const realCases = require('../fixtures/realCases.js');
const R = require('../../src/calculation/yield/research/rational.js');

describe('algebraicCertificate — Phase K-4', () => {
  jest.setTimeout(5 * 60 * 1000);

  // ===========================================================================
  // 単体テスト
  // ===========================================================================
  describe('computeReducedCost', () => {
    test('RC(p) = c(p) − Σ π_i × counts(p, i)', () => {
      const pattern = { stock: 10000, counts: [3, 2] };
      const pi = [R.fromInt(2000), R.fromInt(1500)];
      // RC = 10000 - (3*2000 + 2*1500) = 10000 - 9000 = 1000
      const rc = cert.computeReducedCost(pattern, pi);
      expect(R.eq(rc, R.fromInt(1000))).toBe(true);
    });
    test('RC = 0 (LP-tight basis)', () => {
      const pattern = { stock: 10000, counts: [3, 2] };
      const pi = [R.fromInt(2000), R.fromInt(2000)];
      // RC = 10000 - (6000 + 4000) = 0
      const rc = cert.computeReducedCost(pattern, pi);
      expect(R.isZero(rc)).toBe(true);
    });
  });

  describe('verifyPrimalFeasibility', () => {
    test('demand を満たす場合 holds', () => {
      const xInt = [R.fromInt(2)];
      const patterns = [{ stock: 100, counts: [3] }];
      const items = [{ length: 50, count: 5 }];
      const r = cert.verifyPrimalFeasibility(xInt, patterns, items);
      expect(r.allHold).toBe(true);
      expect(r.byPiece[0].holds).toBe(true);
    });
    test('demand 不足 fails', () => {
      const xInt = [R.fromInt(1)];
      const patterns = [{ stock: 100, counts: [3] }];
      const items = [{ length: 50, count: 5 }];
      const r = cert.verifyPrimalFeasibility(xInt, patterns, items);
      expect(r.allHold).toBe(false);
    });
  });

  // ===========================================================================
  // CASE-2 / CASE-3 で完全な certificate 生成
  // ===========================================================================
  describe('generate certificate for real cases', () => {
    test('CASE-2 L20 で 4 定理すべて成立、自然言語証明書を生成', () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-2-L20'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces,
        kind: c.kind
      };
      const cgRes = exactCg.solveColumnGenExact(spec, { bbTimeLimit: 30000 });
      expect(cgRes.status).toBe('cg_exact_optimal');

      const certificate = cert.generateCertificate(cgRes, spec);
      expect(certificate.allTheoremsHold).toBe(true);
      expect(certificate.verifications.T1_primal.allHold).toBe(true);
      expect(certificate.verifications.T2_dual.allHold).toBe(true);
      expect(certificate.verifications.T3_complementary.allHold).toBe(true);
      expect(certificate.verifications.T4_duality.equal).toBe(true);

      console.log('\n--- CASE-2 CERTIFICATE ---');
      console.log(certificate.naturalLanguage);
      console.log('--- END ---\n');
    });

    test('CASE-3 H175 で 4 定理すべて成立、gap = 1/239 の exact 表示', () => {
      const c = realCases.cases.find(function(x) { return x.id === 'CASE-3-H175'; });
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces,
        kind: c.kind
      };
      const cgRes = exactCg.solveColumnGenExact(spec, { bbTimeLimit: 30000 });

      const certificate = cert.generateCertificate(cgRes, spec);
      expect(certificate.allTheoremsHold).toBe(true);
      // gap should be exactly 1/239
      expect(R.eq(certificate.summary.gap, R.rational(1n, 239n))).toBe(true);

      console.log('\n--- CASE-3 CERTIFICATE ---');
      console.log(certificate.naturalLanguage);
      console.log('--- END ---\n');
    });
  });
});
