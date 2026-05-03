/**
 * tests/bb/benchmark.test.js
 *
 * RESEARCH_BB_ALGEBRA.md §5 day-4: 比較実験。
 *
 * 比較対象:
 *   B-MF: JS-native B&B + Most-Fractional branching
 *   B-AG: JS-native B&B + Algebra-Guided branching
 *
 * 入力 patterns は CG (columnGen.solveColumnGenInspect) の出力を使う。
 * これにより「同じ pattern 集合 / 同じ MIP に対して branching の違いだけ」を見る。
 *
 * 計測:
 *   - status (optimal / timelimit / nodelimit)
 *   - objective (両者一致が期待値)
 *   - nodeCount (少ない方が良い)
 *   - wall-time
 *
 * 注意:
 *   この実験は副作用テスト（成否ではなく出力ログを残す）。
 *   結論は console.log で出して人間が判断する。
 */

const cg = require('../../src/calculation/yield/arcflow/columnGen.js');
const realCases = require('../fixtures/realCases.js');
const { solveMIP, mostFractionalScore } = require('../../src/calculation/yield/bb/branchAndBound.js');
const ab = require('../../src/calculation/yield/bb/algebraBranching.js');

function buildMipFromPatterns(patterns, items) {
  // c[p] = stock(p)
  // A[i][p] = counts(p, i)
  // b[i] = items[i].count
  // すべて '>=' 制約
  const n = patterns.length;
  const m = items.length;
  const c = new Array(n);
  for (let j = 0; j < n; j++) c[j] = patterns[j].stock;
  const A = [];
  for (let i = 0; i < m; i++) {
    const row = new Array(n).fill(0);
    for (let j = 0; j < n; j++) row[j] = patterns[j].counts[i] || 0;
    A.push(row);
  }
  const b = items.map(function(it) { return it.count; });
  const types = items.map(function() { return '>='; });
  return { c: c, A: A, b: b, constraintTypes: types };
}

function runOne(name, mip, opts, label) {
  const t0 = Date.now();
  const r = solveMIP(mip, opts);
  const dt = Date.now() - t0;
  console.log('  ' + label + ': status=' + r.status
    + ' obj=' + (r.objective != null ? r.objective.toFixed(0) : 'N/A')
    + ' nodes=' + r.nodeCount
    + ' lpCalls=' + r.lpCalls
    + ' time=' + dt + 'ms'
    + ' lpRelax=' + (r.lpRelaxation != null ? r.lpRelaxation.toFixed(0) : 'N/A'));
  return Object.assign({ wallTime: dt, label: label }, r);
}

describe('Algebra-Guided Branching benchmark', () => {
  jest.setTimeout(180_000);

  test('CASE-2 L20 — HiGHS-CG patterns で B-MF vs B-AG', async () => {
    const c = realCases.cases.find(function(x) { return x.id === 'CASE-2-L20'; });
    const spec = {
      blade: c.blade, endLoss: c.endLoss,
      availableStocks: c.availableStocks,
      pieces: c.pieces
    };
    const items = c.pieces.map(function(p) {
      return { length: p.length, count: p.count, weight: p.length + c.blade };
    });
    const inspect = await cg.solveColumnGenInspect(spec, { maxIterations: 30 });
    const patterns = inspect.patterns;
    const lpRelax = inspect.lpObjective;
    const pieceLengths = c.pieces.map(function(p) { return p.length; });
    console.log('\n[CASE-2-L20] patterns=' + patterns.length + ' lp_relax=' + lpRelax.toFixed(0));

    const mip = buildMipFromPatterns(patterns, items);

    const mfScore = mostFractionalScore;
    const agScore = ab.makeAlgebraBranchScore(patterns, {
      pieceLengths: pieceLengths, blade: c.blade, endLoss: c.endLoss,
      wFrac: 1, wLoss: 2, wDistinct: 0.1
    });

    const r1 = runOne('CASE-2', mip, { branchScore: mfScore, timeLimit: 60_000 }, 'B-MF');
    const r2 = runOne('CASE-2', mip, { branchScore: agScore, timeLimit: 60_000 }, 'B-AG');

    // 健全性: 両者とも optimal で同じ obj
    if (r1.status === 'optimal' && r2.status === 'optimal') {
      expect(Math.abs(r1.objective - r2.objective)).toBeLessThan(1);
    }
    // 少なくともどちらかは結果を返している
    expect(r1.status === 'optimal' || r2.status === 'optimal').toBe(true);
  });

  test('CASE-6 H194 — HiGHS が落ちる規模で B-MF vs B-AG', async () => {
    // CASE-6 が見つからないなら CASE-4 H194 を使う（HiGHS-WASM では MIP 失敗する大規模ケース）
    let target = realCases.cases.find(function(x) { return /^CASE-6/.test(x.id); });
    if (!target) target = realCases.cases.find(function(x) { return x.id === 'CASE-4-H194'; });
    if (!target) {
      console.log('  no large case found, skipping');
      return;
    }
    const c = target;
    const spec = {
      blade: c.blade, endLoss: c.endLoss,
      availableStocks: c.availableStocks,
      pieces: c.pieces
    };
    const items = c.pieces.map(function(p) {
      return { length: p.length, count: p.count, weight: p.length + c.blade };
    });
    const inspect = await cg.solveColumnGenInspect(spec, { maxIterations: 30 });
    const patterns = inspect.patterns;
    console.log('\n[' + c.id + '] patterns=' + patterns.length + ' lp_relax=' + (inspect.lpObjective || NaN).toFixed(0));

    const pieceLengths = c.pieces.map(function(p) { return p.length; });
    const mip = buildMipFromPatterns(patterns, items);

    const mfScore = mostFractionalScore;
    const agScore = ab.makeAlgebraBranchScore(patterns, {
      pieceLengths: pieceLengths, blade: c.blade, endLoss: c.endLoss,
      wFrac: 1, wLoss: 2, wDistinct: 0.1
    });

    // 大規模なので time/node limit は緩めに
    const r1 = runOne(c.id, mip, { branchScore: mfScore, timeLimit: 60_000, maxNodes: 50_000 }, 'B-MF');
    const r2 = runOne(c.id, mip, { branchScore: agScore, timeLimit: 60_000, maxNodes: 50_000 }, 'B-AG');

    // 完了しなくても OK（ログだけ残す）
    expect(true).toBe(true);
  });
});
