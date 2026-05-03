/**
 * tests/research/hardness.test.js
 *
 * RESEARCH_HARDNESS.md の実証実験。
 * 6 ケース全てに対し:
 *   - インスタンス特徴量を計算
 *   - solveColumnGen を走らせて outcome (gap, time, nodes) を計測
 *   - CSV 形式で console.log
 *
 * 副作用テスト（成否ではなく出力で観察）。
 */

const features = require('../../src/calculation/yield/research/instanceFeatures.js');
const cg = require('../../src/calculation/yield/arcflow/columnGen.js');
const realCases = require('../fixtures/realCases.js');

describe('CSP インスタンス難易度ベンチマーク (RESEARCH_HARDNESS)', () => {
  jest.setTimeout(30 * 60 * 1000);  // 30 分（CASE-6 で 30s + 余裕）

  test('6 ケースで features + CG/B&B outcome を測定', async () => {
    const rows = [];
    const headers = [
      'case_id',
      'k', 'n', 'L_min', 'L_max', 'L_span', 'L_avg',
      'S_count', 'S_min', 'S_max', 'density',
      'demand_skew', 'length_clusters', 'ratio_variance', 'fits_variance', 'R5_potential',
      'lp_obj', 'ip_obj', 'lp_gap_pct', 'wall_ms', 'cg_iter', 'pattern_count', 'status'
    ];

    for (const c of realCases.cases) {
      const spec = {
        blade: c.blade, endLoss: c.endLoss,
        availableStocks: c.availableStocks,
        pieces: c.pieces
      };
      const f = features.computeAllFeatures(spec);
      const t0 = Date.now();
      let r;
      try {
        r = await cg.solveColumnGen(spec, { bbTimeLimit: 60_000 });
      } catch (e) {
        console.log('  ' + c.id + ' threw: ' + e.message);
        rows.push([c.id, '...err...', e.message]);
        continue;
      }
      const wall = Date.now() - t0;
      const lpObj = r._cgMeta && r._cgMeta.lpObjective ? r._cgMeta.lpObjective : NaN;
      const ipObj = r._cgMeta && r._cgMeta.ipObjective ? r._cgMeta.ipObjective : (r.stockTotal || NaN);
      const gapPct = lpObj > 0 ? ((ipObj - lpObj) / lpObj * 100) : NaN;
      const cgIter = r._cgMeta && r._cgMeta.cgIterations != null ? r._cgMeta.cgIterations : -1;
      const patCount = r._cgMeta && r._cgMeta.patternCount != null ? r._cgMeta.patternCount : -1;

      rows.push([
        c.id,
        f.k, f.n, f.L_min, f.L_max, f.L_span, f.L_avg,
        f.S_count, f.S_min, f.S_max, f.density,
        f.demand_skew, f.length_clusters, f.ratio_variance, f.fits_variance, f.R5_potential,
        Math.round(lpObj), Math.round(ipObj), gapPct.toFixed(3), wall, cgIter, patCount, r.status
      ]);

      console.log('  [' + c.id + '] k=' + f.k + ' n=' + f.n
        + ' density=' + f.density + ' skew=' + f.demand_skew
        + ' R5pot=' + f.R5_potential
        + ' → gap=' + gapPct.toFixed(2) + '% time=' + wall + 'ms patterns=' + patCount
        + ' status=' + r.status);
    }

    console.log('\n=== CSV ===\n' + headers.join(',') + '\n' + rows.map(function(r) { return r.join(','); }).join('\n') + '\n=== END ===');

    // sanity: 全ケースで結果が取れた
    expect(rows.length).toBe(realCases.cases.length);
  });
});
