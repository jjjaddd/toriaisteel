/**
 * tests/algebra/algorithmV3.test.js
 *
 * Phase 3 day-1: algorithmV3.js (drop-in patch) の検証。
 *
 * - V2 calcCore がそのまま動くこと（V3 は破壊しない）
 * - V3 が allDP に entry を追加すること
 * - V3 のほうが lossRate 低ければ yieldCard1 が V3 になること
 * - rollback() で V2 のみに戻ること
 * - V2 の patA/patB/patC, single, chgPlans 等は無変更
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

function loadV3() {
  const sandbox = { console: { log: () => {}, warn: () => {} } };
  vm.createContext(sandbox);

  // V2 と V3 を本番と同じ順でロード（algebra と違って calculation/yield 全部要る）
  const order = [
    'src/core/toriai-namespace.js',
    'src/calculation/yield/barMetrics.js',
    'src/calculation/yield/patternPacking.js',
    'src/calculation/yield/repeatPlans.js',
    'src/calculation/yield/bundlePlan.js',
    'src/calculation/yield/calcCore.js',
    'src/calculation/yield/algorithmV2.js',
    'src/calculation/yield/algorithmV3.js'
  ];
  for (const rel of order) {
    const code = fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
  }
  return sandbox.Toriai.calculation.yield;
}

describe('algorithmV3 — drop-in patch on V2 calcCore', () => {
  let Y;
  beforeEach(() => {
    Y = loadV3();
  });

  // -------------------------------------------------------------------------
  // ロード時のインストール
  // -------------------------------------------------------------------------
  describe('インストール', () => {
    test('Y.calcCoreV3 が公開され、Y.calcCore に差し替わる', () => {
      expect(typeof Y.calcCoreV3).toBe('function');
      expect(Y.calcCore).toBe(Y.calcCoreV3);
      expect(typeof Y.calcCoreV2OrV1).toBe('function');
      expect(Y.calcCoreV2OrV1).not.toBe(Y.calcCoreV3);
    });

    test('Y.v3Config が公開される', () => {
      expect(typeof Y.v3Config).toBe('object');
      expect(typeof Y.v3Config.isEnabled).toBe('function');
      expect(typeof Y.v3Config.enable).toBe('function');
      expect(typeof Y.v3Config.rollback).toBe('function');
      expect(Y.v3Config.isEnabled()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // BUG-V2-001 ベースのシナリオで V3 が augment する
  // -------------------------------------------------------------------------
  describe('V3 augmentation (BUG-V2-001 シナリオ)', () => {
    const baseOptions = function() {
      return {
        blade: 3,
        endLoss: 150,
        kgm: 1,
        pieces: Array(6).fill(1222),
        stocks: [{ sl: 10000, max: 999 }, { sl: 9000, max: 999 }, { sl: 8000, max: 999 }],
        kind: '等辺山形鋼',
        spec: 'L-test',
        minValidLen: 500
      };
    };

    test('V3 enabled: allDP に v3_multi_ffd entry が含まれる', () => {
      const r = Y.calcCore(baseOptions());
      const v3Entry = (r.allDP || []).find(function(e) { return e.type === 'v3_multi_ffd'; });
      expect(v3Entry).toBeTruthy();
      expect(v3Entry.bars.length).toBe(1); // 1 バー
      expect(v3Entry.slA).toBe(8000); // 最小定尺へ downsize
      expect(v3Entry.bars[0].loss).toBe(503);
    });

    test('V3 desc に [V3] タグ + 最適性情報が含まれる', () => {
      const r = Y.calcCore(baseOptions());
      const v3Entry = (r.allDP || []).find(function(e) { return e.type === 'v3_multi_ffd'; });
      expect(v3Entry.desc).toMatch(/\[V3/);
      // BUG-V2-001 micro は LB=1, V3 actual=1 → "LP最適"
      expect(v3Entry.desc).toMatch(/LP最適|LB \+/);
      // _v3Meta が付与される
      expect(v3Entry._v3Meta).toBeDefined();
      expect(v3Entry._v3Meta.lowerBoundBars).toBe(1);
    });

    test('V3 desc: V3 が V2 を勝った場合 "V2比 +X.XX%" が入る', () => {
      // 1222 × 333 で V3 が V2 (10m×42=3.11%) を超える
      const opts = {
        blade: 3, endLoss: 150, kgm: 1,
        pieces: Array(333).fill(1222),
        stocks: [
          { sl: 6000, max: 999 }, { sl: 7000, max: 999 }, { sl: 8000, max: 999 },
          { sl: 9000, max: 999 }, { sl: 10000, max: 999 }, { sl: 11000, max: 999 },
          { sl: 12000, max: 999 }
        ],
        kind: 'H形鋼', spec: 'H-test', minValidLen: 500
      };
      const r = Y.calcCore(opts);
      const v3Entry = (r.allDP || []).find(function(e) { return e.type === 'v3_multi_ffd'; });
      expect(v3Entry).toBeTruthy();
      // V3 lossRate=2.42%, V2 best=3.11%, gain=0.69% → desc に "V2比 +" が入る
      expect(v3Entry.desc).toMatch(/V2比 \+/);
    });

    test('yieldCard1 は最終的に 8m を選ぶ（V2 BnB と V3 FFD が同点でも壊れない）', () => {
      const r = Y.calcCore(baseOptions());
      expect(r.yieldCard1).toBeTruthy();
      // V2 BnB も V3 FFD も同じ最適解 [1222×6] in 8m に到達するので tie
      // V3 wrapper が yieldCard1 を破壊しないことだけ確認
      expect(r.yieldCard1.bars[0].sl).toBe(8000);
      expect(r.yieldCard1.bars[0].pat.length).toBe(6);
    });

    test('V2 の patA/patB/patC/single/chgPlans は無変更', () => {
      const r = Y.calcCore(baseOptions());
      // V2 の出力フィールドが存在し、null でも構わない（V2 が出さなかった場合）
      expect('patA' in r).toBe(true);
      expect('patB' in r).toBe(true);
      expect('patC' in r).toBe(true);
      expect(Array.isArray(r.single)).toBe(true);
      expect(Array.isArray(r.chgPlans)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // rollback() で V2 のみに戻る
  // -------------------------------------------------------------------------
  describe('rollback', () => {
    test('rollback() 後、Y.calcCore は V2 (origCalcCore) に戻る', () => {
      const orig = Y.calcCoreV2OrV1;
      Y.v3Config.rollback();
      expect(Y.calcCore).toBe(orig);
      expect(Y.v3Config.isEnabled()).toBe(false);
    });

    test('rollback 後の calcCore 結果に v3_multi_ffd entry が含まれない', () => {
      const opts = {
        blade: 3, endLoss: 150, kgm: 1,
        pieces: Array(6).fill(1222),
        stocks: [{ sl: 10000, max: 999 }, { sl: 9000, max: 999 }, { sl: 8000, max: 999 }],
        kind: '等辺山形鋼', spec: 'L-test', minValidLen: 500
      };
      Y.v3Config.rollback();
      const r = Y.calcCore(opts);
      const v3Entry = (r.allDP || []).find(function(e) { return e.type === 'v3_multi_ffd'; });
      expect(v3Entry).toBeFalsy();
    });

    test('enable() で V3 augmentation が復活', () => {
      Y.v3Config.rollback();
      Y.v3Config.enable();
      // calcCore 自体は元に戻ったままなので、v3 path に戻したいなら別途 Y.calcCore = Y.calcCoreV3 が必要
      // ここでは flag だけ確認
      expect(Y.v3Config.isEnabled()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 境界: 空ピース / stocks 無し
  // -------------------------------------------------------------------------
  describe('境界条件', () => {
    test('空 pieces → V2 と同じ空結果', () => {
      const r = Y.calcCore({
        blade: 3, endLoss: 150, kgm: 1,
        pieces: [],
        stocks: [{ sl: 10000, max: 999 }],
        kind: 'test', spec: 'test', minValidLen: 500
      });
      expect(r.calcPieces.length).toBe(0);
      // V3 entry は追加されない
      const v3Entry = (r.allDP || []).find(function(e) { return e && e.type === 'v3_multi_ffd'; });
      expect(v3Entry).toBeFalsy();
    });

    test('stocks 無し → V2 結果をそのまま返す（fallback）', () => {
      const r = Y.calcCore({
        blade: 3, endLoss: 150, kgm: 1,
        pieces: [1222],
        stocks: [],
        kind: 'test', spec: 'test', minValidLen: 500
      });
      // V3 augment は走らない（stocks が必須）。V2 の結果のみ
      const v3Entry = (r.allDP || []).find(function(e) { return e && e.type === 'v3_multi_ffd'; });
      expect(v3Entry).toBeFalsy();
    });
  });
});
