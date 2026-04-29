#!/usr/bin/env node
/**
 * benchmark/verifyCompat.js
 *
 * 「k <= 13 で v1 と v2 が完全に同じ結果を返すこと」を厳密に検証する専用スクリプト。
 * runBench.js のうち boundary 検証だけを抜き出した、CIで使いやすい形。
 *
 * 終了コード:
 *   0  = 全ケースで v1 == v2（OK）
 *   1  = 1件でも違いがあった（NG）
 *
 * 使い方:
 *   node benchmark/verifyCompat.js
 *   node benchmark/verifyCompat.js --max-k 13
 */

'use strict';

const { performance } = require('perf_hooks');
const { Y, setMode } = require('./loadToriai');
const { generateCase } = require('./testCases');

const argv = process.argv.slice(2);
function flag(name, def) {
  const i = argv.indexOf('--' + name);
  if (i < 0) return def;
  return argv[i + 1];
}
const maxK = parseInt(flag('max-k', '13'), 10);

function runOnce(c, mode) {
  setMode(mode);
  if (typeof Y.resetDpCache === 'function') Y.resetDpCache();
  const t0 = performance.now();
  const result = Y.calcCore({
    pieces: c.pieces,
    stocks: c.stocks.map(s => Object.assign({}, s)),
    blade: c.blade,
    endLoss: c.endLoss,
    kgm: c.kgm,
    remnants: [],
    minValidLen: 500,
  });
  const ms = performance.now() - t0;
  const card = result && result.yieldCard1;
  const single = (result && result.single || []).map(s => ({ sl: s.sl, bars: s.bars.length, lossRate: +s.lossRate.toFixed(6) }));
  const allDP = (result && result.allDP || []).map(d => ({ type: d.type, bars: d.bars.length, lossRate: +d.lossRate.toFixed(6), desc: d.desc }));
  return {
    ms: ms,
    cardBars: card ? card.bars.length : null,
    cardLoss: card ? +card.lossRate.toFixed(6) : null,
    cardType: card ? card.type : null,
    single: single,
    allDP: allDP,
  };
}

function deepEqualSummary(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const cases = [];
for (const profile of ['uniform', 'realistic', 'stressful', 'manyShort']) {
  for (let k = 3; k <= maxK; k++) {
    for (const n of [30, 80, 150]) {
      cases.push(generateCase({ k, n, profile, seed: 9000 + k * 100 + n }));
    }
  }
}

console.log('# verifyCompat: k <= ' + maxK + '  cases=' + cases.length);
let mismatch = 0;
let ok = 0;

for (const c of cases) {
  const r1 = runOnce(c, 'v1');
  const r2 = runOnce(c, 'v2');

  // 完全一致を検証（yieldCard1 と single と allDP の summary）
  const a = { cardBars: r1.cardBars, cardLoss: r1.cardLoss, cardType: r1.cardType, single: r1.single, allDP: r1.allDP };
  const b = { cardBars: r2.cardBars, cardLoss: r2.cardLoss, cardType: r2.cardType, single: r2.single, allDP: r2.allDP };
  const same = deepEqualSummary(a, b);
  if (!same) {
    mismatch++;
    console.log('NG  profile=' + c.meta.profile + ' k=' + c.meta.k + ' n=' + c.meta.n + ' uniqueLens=' + c.meta.uniqueLens);
    console.log('   v1: ' + JSON.stringify(a));
    console.log('   v2: ' + JSON.stringify(b));
  } else {
    ok++;
  }
}

console.log('# ok=' + ok + ' mismatch=' + mismatch);
if (mismatch === 0) {
  console.log('# ✓ k <= ' + maxK + ' ですべて v1 と v2 の結果が完全一致');
} else {
  console.log('# ✗ 不一致あり：v2 の境界処理を再確認してください');
}

process.exit(mismatch === 0 ? 0 : 1);
