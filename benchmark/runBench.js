#!/usr/bin/env node
/**
 * benchmark/runBench.js
 *
 * v1 / v2 を切り替えて calcCore() を実行し、所要時間・歩留まり・本数を測定する。
 *
 * 使い方:
 *   node benchmark/runBench.js                # calibration（小さい・速い）
 *   node benchmark/runBench.js boundary       # k=11..15 で v1==v2 を確認
 *   node benchmark/runBench.js normal         # 通常モード狙い
 *   node benchmark/runBench.js heavy          # 長考モード狙い
 *   node benchmark/runBench.js stress         # 落ちる境界
 *   node benchmark/runBench.js boundary --csv result.csv
 *
 * オプション:
 *   --csv <path>       結果を CSV ファイルにも書き出す
 *   --skip-v1-over <k> k がこの値を超えたら v1 をスキップ（v1 が落ちる対策）
 *   --timeout <ms>     各ケースの実行時間上限ヒント（v1 自身は時間制限を持たないので、
 *                      上限を超えたら NEXT 計測時に警告のみ）
 *   --only <v1|v2>     片方だけ走らせる
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const { Y, setMode } = require('./loadToriai');
const { buildMatrix } = require('./testCases');

// ----------------------------------------------------------
// CLI 引数パース
// ----------------------------------------------------------
const argv = process.argv.slice(2);
const matrixName = (!argv[0] || argv[0].startsWith('--')) ? 'calibration' : argv[0];
function flag(name, def) {
  const i = argv.indexOf('--' + name);
  if (i < 0) return def;
  return argv[i + 1];
}
const csvPath = flag('csv', null);
const skipV1Over = parseInt(flag('skip-v1-over', '15'), 10);
const onlyMode = flag('only', null); // 'v1' | 'v2' | null
const verbose = argv.includes('--verbose');

// ----------------------------------------------------------
// 1ケース実行
// ----------------------------------------------------------
function runOne(testCase, mode) {
  setMode(mode);
  if (typeof Y.resetDpCache === 'function') Y.resetDpCache();

  const t0 = performance.now();
  let result = null;
  let err = null;
  try {
    result = Y.calcCore({
      pieces: testCase.pieces,
      stocks: testCase.stocks.map(s => Object.assign({}, s)),
      blade: testCase.blade,
      endLoss: testCase.endLoss,
      kgm: testCase.kgm,
      remnants: testCase.remnants || [],
      minValidLen: testCase.minValidLen || 500,
    });
  } catch (e) {
    err = e.message || String(e);
  }
  const ms = performance.now() - t0;

  const card = result && result.yieldCard1;
  const allDpLen = result && result.allDP ? result.allDP.length : 0;
  const single = result && result.single ? result.single.length : 0;
  const chgPlans = result && result.chgPlans ? result.chgPlans.length : 0;

  return {
    mode: mode,
    ms: ms,
    error: err,
    lossRate: card ? card.lossRate : null,
    bars: card && card.bars ? card.bars.length : null,
    type: card ? card.type : null,
    desc: card ? card.desc : null,
    allDpCount: allDpLen,
    singleCount: single,
    chgCount: chgPlans,
  };
}

// ----------------------------------------------------------
// 結果フォーマット
// ----------------------------------------------------------
function formatRow(c, r) {
  return [
    c.meta.profile,
    c.meta.distribution,
    c.meta.k,
    c.meta.n,
    c.meta.uniqueLens,
    c.meta.seed,
    r.mode,
    r.ms.toFixed(1),
    r.error ? '' : (r.lossRate != null ? r.lossRate.toFixed(3) : ''),
    r.error ? '' : (r.bars != null ? r.bars : ''),
    r.error ? '' : (r.type || ''),
    r.error ? r.error.replace(/[\r\n,]/g, ' ').slice(0, 80) : '',
  ].join(',');
}

const HEADER = 'profile,distribution,k,n,uniqueLens,seed,version,ms,lossRate,bars,type,error';

// ----------------------------------------------------------
// 実行
// ----------------------------------------------------------
console.log('# TORIAI benchmark - matrix=' + matrixName + '  skip-v1-over=' + skipV1Over + (onlyMode ? '  only=' + onlyMode : ''));
console.log(HEADER);

const cases = buildMatrix(matrixName);
const lines = [HEADER];

let aggregateV1Ms = 0, aggregateV2Ms = 0, v1Count = 0, v2Count = 0;
let mismatches = 0;

for (const c of cases) {
  const k = c.meta.k;

  let r1 = null, r2 = null;
  if ((!onlyMode || onlyMode === 'v1') && k <= skipV1Over) {
    r1 = runOne(c, 'v1');
    aggregateV1Ms += r1.ms; v1Count++;
    const line = formatRow(c, r1);
    console.log(line);
    lines.push(line);
  }

  if (!onlyMode || onlyMode === 'v2') {
    r2 = runOne(c, 'v2');
    aggregateV2Ms += r2.ms; v2Count++;
    const line = formatRow(c, r2);
    console.log(line);
    lines.push(line);
  }

  // boundary ケース：k <= 13 で v1 と v2 が完全一致するか確認
  if (r1 && r2 && k <= 13 && r1.lossRate != null && r2.lossRate != null) {
    const same = (r1.bars === r2.bars)
      && Math.abs(r1.lossRate - r2.lossRate) < 1e-9;
    if (!same) {
      mismatches++;
      console.log('# !! MISMATCH at k=' + k + ' n=' + c.meta.n + ' profile=' + c.meta.profile
        + ' v1{bars=' + r1.bars + ',loss=' + (r1.lossRate||0).toFixed(4) + '}'
        + ' v2{bars=' + r2.bars + ',loss=' + (r2.lossRate||0).toFixed(4) + '}');
    } else if (verbose) {
      console.log('# ok k=' + k + ' n=' + c.meta.n + ' both bars=' + r1.bars + ' loss=' + r1.lossRate.toFixed(3));
    }
  }
}

// ----------------------------------------------------------
// サマリ
// ----------------------------------------------------------
console.log('# ----- summary -----');
console.log('# cases=' + cases.length);
if (v1Count > 0) console.log('# v1 avg=' + (aggregateV1Ms / v1Count).toFixed(1) + 'ms total=' + aggregateV1Ms.toFixed(0) + 'ms n=' + v1Count);
if (v2Count > 0) console.log('# v2 avg=' + (aggregateV2Ms / v2Count).toFixed(1) + 'ms total=' + aggregateV2Ms.toFixed(0) + 'ms n=' + v2Count);
console.log('# mismatches (k<=13)=' + mismatches + (mismatches === 0 ? '  ✓ identical' : '  ✗ DIFFER'));

if (csvPath) {
  fs.writeFileSync(csvPath, lines.join('\n') + '\n', 'utf8');
  console.log('# CSV written: ' + csvPath);
}

process.exit(mismatches > 0 ? 1 : 0);
