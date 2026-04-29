#!/usr/bin/env node
/**
 * benchmark/verifyPatternC.js
 *
 * Pattern C の正しい挙動を検証する:
 *   ケース1: patA または patB が出る入力 → patC は null
 *   ケース2: patA も patB も null になる入力 → patC が repeat>=2 で返る
 *   ケース3: 繰り返しすら出ない入力 → patC は null
 *
 * 終了コード:
 *   0 : すべて通過
 *   1 : 1件でも違反
 *
 * 使い方:
 *   node benchmark/verifyPatternC.js
 */

'use strict';

const { Y, setMode } = require('./loadToriai');

function run(c) {
  setMode('v2');
  if (Y.resetDpCache) Y.resetDpCache();
  return Y.calcCore({
    pieces: c.pieces, stocks: c.stocks, blade: 5, endLoss: 30,
    kgm: 9.3, remnants: [], minValidLen: 500,
  });
}

let pass = 0, fail = 0;

function check(label, condition, detail) {
  if (condition) {
    console.log('OK  ' + label + (detail ? ' ' + detail : ''));
    pass++;
  } else {
    console.log('NG  ' + label + (detail ? ' ' + detail : ''));
    fail++;
  }
}

// ケース1: 歩留まりほぼ100%（5460を5500に1本ずつ）→ patAが必ず出る
//   5460/5470 ≈ 99.82% で 90% 閾値を余裕で超え、6回繰り返し
{
  const r = run({
    pieces: [5460, 5460, 5460, 5460, 5460, 5460],
    stocks: [{ sl: 5500, max: 50 }],
  });
  check('case1 patA exists (high yield, repeating)', !!r.patA,
    '(patA=' + (r.patA ? 'EXISTS' : 'null') + ')');
  check('case1 patC is null when patA exists', r.patC === null,
    '(patC=' + (r.patC ? 'non-null' : 'null') + ')');
}

// ケース2: 歩留低め。3000mm を 5500 単定尺 → どのパターンも yld<80%
//   [3000] yld=3000/5470≈54.8%、[3000,2000] みたいな組合せもなし
//   パターン [3000] は単独で 8 回繰り返し可能 → patCに乗るはず
{
  const r = run({
    pieces: [3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000],
    stocks: [{ sl: 5500, max: 50 }],
  });
  if (!r.patA && !r.patB) {
    check('case2 neither A nor B (intended)', true);
    check('case2 patC exists with repeat>=2',
      !!r.patC && r.patC.repeat >= 2,
      r.patC ? '(repeat=' + r.patC.repeat + ', sl=' + r.patC.sl + ', label=' + r.patC.label + ')' : '(patC=null)');
  } else {
    console.log('WARN case2 unexpectedly produced A/B; test data needs tuning. patA=' + !!r.patA + ', patB=' + !!r.patB);
    check('case2 patC must be null when A/B exist', r.patC === null);
  }
}

// ケース3: 部品が定尺に入りきらない or 単発のみで repeat 不能
{
  const r = run({
    pieces: [4500, 5400],
    stocks: [{ sl: 5500, max: 50 }],
  });
  check('case3 patC null when no repeating pattern', r.patC === null,
    r.patC ? '(unexpected: repeat=' + r.patC.repeat + ')' : '');
}

console.log('\n# pass=' + pass + ' fail=' + fail);
process.exit(fail > 0 ? 1 : 0);
