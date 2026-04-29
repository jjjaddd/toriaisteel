/**
 * benchmark/loadToriai.js
 *
 * v1 (+ v2) のソースをそのまま読み込んで、Nodeのglobal上に Toriai 名前空間を構築する。
 * 既存ファイルは一切書き換えない。IIFE が globalThis を見るので Node でそのまま動く。
 *
 * 戻り値:
 *   {
 *     Y: Toriai.calculation.yield,
 *     setMode: (mode: 'v1'|'v2') => void   // pack / enumAllPatterns を切り替える
 *   }
 *
 * 使い方:
 *   const { Y, setMode } = require('./loadToriai');
 *   setMode('v1');
 *   const result = Y.calcCore({ ... });
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

// algorithmV2.js は calcCore.js の **後** にロード。
// （v2.2 で calcCore と bnbSolve も wrapper で上書きするため、
//   それらが先に Y に登録されている必要がある）
const FILES = [
  path.join(SRC, 'core', 'toriai-namespace.js'),
  path.join(SRC, 'data', 'steel', 'stockHelpers.js'),
  path.join(SRC, 'calculation', 'yield', 'barMetrics.js'),
  path.join(SRC, 'calculation', 'yield', 'patternPacking.js'),
  path.join(SRC, 'calculation', 'yield', 'repeatPlans.js'),
  path.join(SRC, 'calculation', 'yield', 'bundlePlan.js'),
  path.join(SRC, 'calculation', 'yield', 'calcCore.js'),
  path.join(SRC, 'calculation', 'yield', 'algorithmV2.js'),
];

// IIFE は (globalThis !== undefined ? globalThis : (self !== undefined ? self : window)) を使う。
// Node ではそのまま globalThis === global なので、そのまま eval すれば良い。
for (const file of FILES) {
  if (!fs.existsSync(file)) {
    throw new Error('Source file missing: ' + file);
  }
  const code = fs.readFileSync(file, 'utf8');
  // 間接evalで「グローバルスコープ」で実行
  (0, eval)(code);
}

const T = global.Toriai;
if (!T || !T.calculation || !T.calculation.yield) {
  throw new Error('Toriai namespace not built correctly.');
}
const Y = T.calculation.yield;

// 健全性チェック：v1 と v2 両方の関数が見えていること
const required = ['pack', 'packV1', 'packV2', 'enumAllPatterns', 'enumAllPatternsV1', 'enumAllPatternsV2', 'calcCore', 'dpBestPat', 'resetDpCache'];
for (const k of required) {
  if (typeof Y[k] !== 'function') {
    throw new Error('Y.' + k + ' is not a function. Load order broken?');
  }
}

function setMode(mode) {
  if (mode === 'v1') {
    Y.pack = Y.packV1;
    Y.enumAllPatterns = Y.enumAllPatternsV1;
  } else if (mode === 'v2') {
    Y.pack = Y.packV2;
    Y.enumAllPatterns = Y.enumAllPatternsV2;
  } else {
    throw new Error('Unknown mode: ' + mode);
  }
  if (typeof Y.resetDpCache === 'function') Y.resetDpCache();
}

module.exports = { T, Y, setMode };
