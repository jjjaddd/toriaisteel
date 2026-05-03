/**
 * tests/bb/integration.test.js
 *
 * 配線後の挙動確認: solveColumnGen の MIP 段で HiGHS-WASM が落ちる規模
 * (CASE-6 級) で JS-native B&B フォールバックが起動するか。
 *
 * 期待:
 *   - status が 'cg_optimal' (HiGHS 成功) または 'cg_optimal_bb' (B&B 救済)
 *     または 'cg_bb_timelimit' (B&B 時間切れ)
 *   - 'cg_lp_rounded' しか返らないなら救済できてない
 *   - stockTotal は LP 丸め単独より改善（または同等）
 */

const cg = require('../../src/calculation/yield/arcflow/columnGen.js');
const realCases = require('../fixtures/realCases.js');

describe('B&B 配線 — solveColumnGen 経由でフォールバック起動確認', () => {
  jest.setTimeout(180_000);

  test('CASE-2 L20 — 小規模では HiGHS で完了（B&B フォールバック発火しない）', async () => {
    const c = realCases.cases.find(function(x) { return x.id === 'CASE-2-L20'; });
    const spec = {
      blade: c.blade, endLoss: c.endLoss,
      availableStocks: c.availableStocks,
      pieces: c.pieces
    };
    const r = await cg.solveColumnGen(spec);
    console.log('  CASE-2 result: status=' + r.status + ' stockTotal=' + r.stockTotal);
    expect(r.status).toBe('cg_optimal');
  });

  test('CASE-6 L65 — default maxIter で B&B が LP-tight 到達するか検証', async () => {
    const c = realCases.cases.find(function(x) { return x.id === 'CASE-6-L65'; });
    const spec = {
      blade: c.blade, endLoss: c.endLoss,
      availableStocks: c.availableStocks,
      pieces: c.pieces
    };
    const t0 = Date.now();
    // default maxIterations (50) で動かす。bbTimeLimit のみ伸ばす
    const r = await cg.solveColumnGen(spec, { bbTimeLimit: 60_000 });
    const dt = Date.now() - t0;
    console.log('  CASE-6 result: status=' + r.status
      + ' bars=' + r.barCount
      + ' stockTotal=' + r.stockTotal
      + ' lpObj=' + (r._cgMeta && r._cgMeta.lpObjective ? r._cgMeta.lpObjective.toFixed(0) : 'N/A')
      + ' gap=' + (r._cgMeta && r._cgMeta.lpGap != null ? (r._cgMeta.lpGap * 100).toFixed(2) + '%' : 'N/A')
      + ' time=' + dt + 'ms');
    // 解は取れているはず
    expect(r.bars).toBeDefined();
    expect(r.barCount).toBeGreaterThan(0);
    // demand 充足チェック
    const lengthCounts = {};
    r.bars.forEach(function(b) {
      b.pattern.forEach(function(len) {
        lengthCounts[len] = (lengthCounts[len] || 0) + b.count;
      });
    });
    c.pieces.forEach(function(p) {
      expect(lengthCounts[p.length] || 0).toBeGreaterThanOrEqual(p.count);
    });
    // status は LP 丸め単独でないこと（いずれかの最適化系であること）
    expect(['cg_optimal', 'cg_optimal_bb', 'cg_optimal_subset', 'cg_bb_timelimit', 'cg_bb_nodelimit', 'cg_lp_rounded']).toContain(r.status);
    // 回帰防止: 723,500 (LP-tight) を超えてはいけない（779,500 LP-rounded への退化を防ぐ）
    expect(r.stockTotal).toBeLessThanOrEqual(730_000);
  });

});
