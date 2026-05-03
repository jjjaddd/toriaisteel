/**
 * tests/bb/algebraBranching.test.js
 *
 * algebra-guided branching score の挙動確認 + B&B との結合テスト。
 */

const { solveMIP } = require('../../src/calculation/yield/bb/branchAndBound.js');
const ab = require('../../src/calculation/yield/bb/algebraBranching.js');

describe('algebraBranching — pattern feature & branch score', () => {
  describe('computePatternFeatures', () => {
    test('単一 piece: loss と lossRatio の計算', () => {
      // stock 10000, piece 3000 を 3 本、blade 5、endLoss 100
      const f = ab.computePatternFeatures(
        { stock: 10000, counts: [3] },
        [3000], 5, 100
      );
      expect(f.totalPieces).toBe(3);
      // usedLength = 3*3000 + 2*5 + 2*100 = 9000+10+200 = 9210
      expect(f.usedLength).toBe(9210);
      expect(f.loss).toBe(790);
      expect(f.lossRatio).toBeCloseTo(0.079);
      expect(f.distinctPieceCount).toBe(1);
    });

    test('複数 piece type', () => {
      const f = ab.computePatternFeatures(
        { stock: 10000, counts: [2, 1, 0] },
        [3000, 2000, 1000], 0, 0
      );
      expect(f.totalPieces).toBe(3);
      expect(f.usedLength).toBe(2 * 3000 + 1 * 2000);
      expect(f.distinctPieceCount).toBe(2);
    });

    test('空 pattern (counts 全 0)', () => {
      const f = ab.computePatternFeatures(
        { stock: 10000, counts: [0, 0] },
        [3000, 2000], 0, 0
      );
      expect(f.totalPieces).toBe(0);
      expect(f.usedLength).toBe(0);
      expect(f.loss).toBe(10000);
      expect(f.lossRatio).toBe(1);
      expect(f.distinctPieceCount).toBe(0);
    });
  });

  describe('makeAlgebraBranchScore', () => {
    test('lossRatio が高い pattern ほど高 score', () => {
      const patterns = [
        { stock: 10000, counts: [3] },  // loss 1000 → lossRatio 0.1
        { stock: 10000, counts: [2] }   // loss 4000 → lossRatio 0.4
      ];
      const score = ab.makeAlgebraBranchScore(patterns, {
        pieceLengths: [3000], blade: 0, endLoss: 0,
        wFrac: 0, wLoss: 1, wDistinct: 0
      });
      // 同じ fractionality（両方 0.5）で比べる
      expect(score(1, 1.5)).toBeGreaterThan(score(0, 1.5));
    });

    test('wFrac=1, wLoss=0 → 純 most-fractional 同等', () => {
      const patterns = [{ stock: 10000, counts: [3] }];
      const sa = ab.makeAlgebraBranchScore(patterns, {
        pieceLengths: [3000], wFrac: 1, wLoss: 0, wDistinct: 0
      });
      const sb = ab.makeMostFractionalScore();
      expect(sa(0, 1.5)).toBeCloseTo(sb(0, 1.5));
      expect(sa(0, 1.1)).toBeCloseTo(sb(0, 1.1));
    });
  });

  describe('B&B との結合', () => {
    test('algebra-guided は CSP-toy MIP で同じ最適解を出す', () => {
      // CSP-toy: 3 patterns, 2 piece types
      const patterns = [
        { stock: 10000, counts: [3, 0] },
        { stock: 10000, counts: [0, 5] },
        { stock: 8000,  counts: [2, 1] }
      ];
      const score = ab.makeAlgebraBranchScore(patterns, {
        pieceLengths: [3000, 2000], blade: 5, endLoss: 100
      });
      const r = solveMIP({
        c: [10000, 10000, 8000],
        A: [[3, 0, 2], [0, 5, 1]],
        b: [6, 5],
        constraintTypes: ['>=', '>=']
      }, { branchScore: score });
      expect(r.status).toBe('optimal');
      expect(r.objective).toBeLessThanOrEqual(30000 + 1e-6);
    });
  });
});
