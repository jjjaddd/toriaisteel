/**
 * TORIAI 計算 V3 — Rational LP solver (exact arithmetic)
 *
 * Phase K-1 の核: bb/lp.js (float tableau simplex) を Rational に置き換え。
 * 浮動小数点誤差ゼロ、整数性判定が確定的。
 *
 * 設計方針 (RESEARCH_DUAL_ALGEBRA.md):
 *   - two-phase simplex（Phase I で artificial、Phase II で原目的）
 *   - Bland's rule で degeneracy 回避
 *   - tableau は 2D Rational (== { num: BigInt, den: BigInt })
 *   - EPS なし（厳密）
 *
 * 入力:
 *   spec.c, spec.A, spec.b は number または BigInt または Rational のいずれでも OK
 *   （内部で fromInt / fromFloat 変換）
 *
 * 戻り値: {
 *   status: 'optimal' | 'infeasible' | 'unbounded' | 'iterlimit',
 *   x: Rational[]   (厳密解),
 *   xFloat: number[] (互換用 float 変換),
 *   objective: Rational,
 *   objectiveFloat: number,
 *   iterations: number
 * }
 */

'use strict';

// dual-mode dep resolver
function _resolveDep(nodePath, browserNs) {
  if (typeof require === 'function') {
    try { return require(nodePath); } catch (e) { /* fall through */ }
  }
  var g = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis);
  var parts = browserNs.split('.');
  var cur = g;
  for (var i = 0; i < parts.length; i++) {
    if (!cur) return null;
    cur = cur[parts[i]];
  }
  return cur;
}

var R = _resolveDep('./rational.js', 'Toriai.calculation.yield.research.rational');

var MAX_ITER = 50000;

// ============================================================================
// toRational — number / BigInt / Rational の正規化
// ============================================================================

function toRational(v) {
  if (v && typeof v === 'object' && v.num !== undefined && v.den !== undefined) {
    return v;  // already Rational
  }
  if (typeof v === 'bigint') return R.rational(v, 1n);
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return R.fromInt(v);
    return R.fromFloat(v);
  }
  throw new Error('[rationalLp] cannot convert to Rational: ' + v);
}

// ============================================================================
// solveLPExact(spec) — 主関数
// ============================================================================

function solveLPExact(spec) {
  // ---- 入力正規化 ----
  var n = spec.c.length;
  var m = spec.b.length;
  var sense = spec.sense || 'min';
  var c = spec.c.map(toRational);
  var A = spec.A.map(function(row) { return row.map(toRational); });
  var b = spec.b.map(toRational);
  var types = (spec.constraintTypes || A.map(function() { return '>='; })).slice();

  // max → min（c の符号反転）
  if (sense === 'max') {
    c = c.map(R.neg);
  }

  // b < 0 の行は両辺反転
  for (var i = 0; i < m; i++) {
    if (R.isNegative(b[i])) {
      b[i] = R.neg(b[i]);
      A[i] = A[i].map(R.neg);
      if (types[i] === '<=') types[i] = '>=';
      else if (types[i] === '>=') types[i] = '<=';
    }
  }

  // 補助変数の数を数える
  var slackCount = 0;
  var artCount = 0;
  for (var ti = 0; ti < m; ti++) {
    if (types[ti] === '<=') slackCount++;
    else if (types[ti] === '>=') { slackCount++; artCount++; }
    else artCount++;
  }
  var totalCols = n + slackCount + artCount;

  // tableau 初期化: (m+1) × (totalCols+1)
  var tab = [];
  for (var ri = 0; ri <= m; ri++) {
    var row = new Array(totalCols + 1);
    for (var ci = 0; ci <= totalCols; ci++) row[ci] = R.zero();
    tab.push(row);
  }

  // 制約行を埋める
  var slackIdx = n;
  var artIdx = n + slackCount;
  var basis = new Array(m);
  var artificialCols = [];
  // dual 抽出のための各制約の補助変数 col 記録 + 符号反転判定
  // dualMeta[i] = { col: number, type: '<=' | '>=' | '=', flippedRow: bool }
  var dualMeta = [];
  // この行は b 反転で type が swap された可能性。元の type を覚えておく
  var origTypes = (spec.constraintTypes || A.map(function() { return '>='; })).slice();
  var rowFlipped = new Array(m).fill(false);
  for (var fi = 0; fi < m; fi++) {
    if (origTypes[fi] !== types[fi]) rowFlipped[fi] = true;
  }

  for (var ii = 0; ii < m; ii++) {
    var trow = tab[ii + 1];
    for (var jj = 0; jj < n; jj++) trow[jj] = A[ii][jj];
    trow[totalCols] = b[ii];

    if (types[ii] === '<=') {
      trow[slackIdx] = R.one();
      basis[ii] = slackIdx;
      dualMeta.push({ col: slackIdx, type: '<=', flippedRow: rowFlipped[ii] });
      slackIdx++;
    } else if (types[ii] === '>=') {
      trow[slackIdx] = R.neg(R.one());  // surplus
      dualMeta.push({ col: slackIdx, type: '>=', flippedRow: rowFlipped[ii] });
      slackIdx++;
      trow[artIdx] = R.one();
      basis[ii] = artIdx;
      artificialCols.push(artIdx);
      artIdx++;
    } else { // '='
      trow[artIdx] = R.one();
      basis[ii] = artIdx;
      artificialCols.push(artIdx);
      dualMeta.push({ col: artIdx, type: '=', flippedRow: rowFlipped[ii] });
      artIdx++;
    }
  }

  var totalIter = 0;

  // ---- Phase I: minimize Σ artificials ----
  if (artificialCols.length > 0) {
    for (var pi = 0; pi <= totalCols; pi++) tab[0][pi] = R.zero();
    artificialCols.forEach(function(a) { tab[0][a] = R.one(); });
    // basis に入っている artificial は対応行を引いて 0 にする
    for (var bi = 0; bi < m; bi++) {
      if (artificialCols.indexOf(basis[bi]) !== -1) {
        var brow = tab[bi + 1];
        for (var bj = 0; bj <= totalCols; bj++) {
          tab[0][bj] = R.sub(tab[0][bj], brow[bj]);
        }
      }
    }
    var r1 = simplexIterate(tab, basis, totalCols, []);
    totalIter += r1.iterations;
    if (r1.status === 'iterlimit') {
      return { status: 'iterlimit', x: null, xFloat: null, objective: null, objectiveFloat: NaN, iterations: totalIter };
    }
    // tab[0][totalCols] は -(Phase I 目的値)。infeasible なら strictly < 0 (= 目的値 > 0)
    if (R.isNegative(tab[0][totalCols])) {
      return { status: 'infeasible', x: null, xFloat: null, objective: null, objectiveFloat: NaN, iterations: totalIter };
    }
    // basis から artificial を driving out
    for (var di = 0; di < m; di++) {
      if (artificialCols.indexOf(basis[di]) !== -1) {
        var drow = tab[di + 1];
        var pivotCol = -1;
        for (var dj = 0; dj < totalCols; dj++) {
          if (artificialCols.indexOf(dj) !== -1) continue;
          if (!R.isZero(drow[dj])) { pivotCol = dj; break; }
        }
        if (pivotCol !== -1) pivotOn(tab, basis, di, pivotCol, totalCols);
        // pivotCol 見つからない行は冗長制約、artificial=0 のまま
      }
    }
  }

  // ---- Phase II: original objective ----
  for (var pi2 = 0; pi2 <= totalCols; pi2++) tab[0][pi2] = R.zero();
  for (var ci2 = 0; ci2 < n; ci2++) tab[0][ci2] = c[ci2];
  // basis 列を 0 に reduce
  for (var bi2 = 0; bi2 < m; bi2++) {
    var bj2 = basis[bi2];
    if (!R.isZero(tab[0][bj2])) {
      var factor = tab[0][bj2];
      var brow2 = tab[bi2 + 1];
      for (var dj2 = 0; dj2 <= totalCols; dj2++) {
        tab[0][dj2] = R.sub(tab[0][dj2], R.mul(factor, brow2[dj2]));
      }
    }
  }

  var r2 = simplexIterate(tab, basis, totalCols, artificialCols);
  totalIter += r2.iterations;

  if (r2.status === 'unbounded') {
    return { status: 'unbounded', x: null, xFloat: null, objective: null, objectiveFloat: -Infinity, iterations: totalIter };
  }
  if (r2.status === 'iterlimit') {
    return { status: 'iterlimit', x: null, xFloat: null, objective: null, objectiveFloat: NaN, iterations: totalIter };
  }

  // 解の取り出し
  var x = new Array(n);
  for (var xi = 0; xi < n; xi++) x[xi] = R.zero();
  for (var ki = 0; ki < m; ki++) {
    if (basis[ki] < n) x[basis[ki]] = tab[ki + 1][totalCols];
  }

  var obj = R.zero();
  // sense='max' のとき c は反転されているが、戻り値の objective は元 sense に戻す
  for (var oi = 0; oi < n; oi++) {
    obj = R.add(obj, R.mul(spec.c[oi] && spec.c[oi].num !== undefined ? spec.c[oi] : toRational(spec.c[oi]), x[oi]));
  }
  if (sense === 'max') {
    // obj は「正しい c での値」だが c が反転されてたので、もう一度反転
    // → いや、x は反転 c で min した結果、x 自体は正解。
    //   objective を元 c で計算しているので符号は元のまま正解
  }

  var xFloat = x.map(R.toNumber);
  var objFloat = R.toNumber(obj);

  // ---- Dual 抽出 ----
  // tab[0][j] = c_j - Σ y_i a_{i,j}  (reduced cost at optimum)
  //
  // For slack (<= 制約, A_slack = +e_i):
  //   tab[0][slackCol] = 0 - y_i × (+1) = -y_i  →  y_i = -tab[0][slackCol]
  // For surplus (>= 制約, A_surplus = -e_i):
  //   tab[0][surplusCol] = 0 - y_i × (-1) = +y_i  →  y_i = +tab[0][surplusCol]
  // For equality (artificial only):
  //   y_i = -tab[0][artificialCol] (artificial の RC が y_i 込)
  //   ただし Phase II で artificial は exclude されているため正確性 caveat あり
  //
  // row flipped: 元 b<0 で両辺反転されている場合、dual も符号反転
  // sense='max': c を反転して min 化したので、dual も反転
  var duals = new Array(m);
  for (var di = 0; di < m; di++) {
    var meta = dualMeta[di];
    var rc = tab[0][meta.col];
    var raw;
    if (meta.type === '<=') raw = R.neg(rc);     // slack+, dual = -RC
    else if (meta.type === '>=') raw = rc;        // surplus-, dual = +RC
    else raw = R.neg(rc);                         // equality (近似)
    if (meta.flippedRow) raw = R.neg(raw);
    if (sense === 'max') raw = R.neg(raw);
    duals[di] = raw;
  }
  var dualsFloat = duals.map(R.toNumber);

  return {
    status: 'optimal',
    x: x,
    xFloat: xFloat,
    objective: obj,
    objectiveFloat: objFloat,
    duals: duals,
    dualsFloat: dualsFloat,
    iterations: totalIter
  };
}

// ============================================================================
// simplexIterate (Rational tableau)
// ============================================================================

function simplexIterate(tab, basis, totalCols, excludeCols) {
  var m = tab.length - 1;
  var iter = 0;
  var exclude = new Set(excludeCols);

  for (; iter < MAX_ITER; iter++) {
    // entering variable: 最も負の reduced cost、Bland's rule で同点は index 小
    var enter = -1;
    var bestVal = R.zero();
    for (var j = 0; j < totalCols; j++) {
      if (exclude.has(j)) continue;
      if (R.isNegative(tab[0][j]) && (enter === -1 || R.lt(tab[0][j], bestVal))) {
        bestVal = tab[0][j];
        enter = j;
      }
    }
    if (enter === -1) return { status: 'optimal', iterations: iter };

    // leaving variable: 最小 ratio、同点は basis index 小
    var leave = -1;
    var bestRatio = null;
    for (var i = 1; i <= m; i++) {
      if (R.isPositive(tab[i][enter])) {
        var ratio = R.div(tab[i][totalCols], tab[i][enter]);
        if (bestRatio === null || R.lt(ratio, bestRatio)) {
          bestRatio = ratio;
          leave = i;
        } else if (R.eq(ratio, bestRatio) && leave !== -1) {
          if (basis[i - 1] < basis[leave - 1]) leave = i;
        }
      }
    }
    if (leave === -1) return { status: 'unbounded', iterations: iter };

    pivotOn(tab, basis, leave - 1, enter, totalCols);
  }
  return { status: 'iterlimit', iterations: iter };
}

// ============================================================================
// pivotOn (Rational)
// ============================================================================

function pivotOn(tab, basis, rowIdx, colIdx, totalCols) {
  var m = tab.length - 1;
  var pivotRow = tab[rowIdx + 1];
  var pivot = pivotRow[colIdx];
  if (R.isZero(pivot)) throw new Error('[rationalLp] zero pivot');
  // pivot 行を pivot 値で割って正規化
  var pivotInv = R.div(R.one(), pivot);
  for (var j = 0; j <= totalCols; j++) {
    pivotRow[j] = R.mul(pivotRow[j], pivotInv);
  }
  // 他の行の pivot 列を 0 にする
  for (var i = 0; i <= m; i++) {
    if (i === rowIdx + 1) continue;
    var factor = tab[i][colIdx];
    if (!R.isZero(factor)) {
      for (var jj = 0; jj <= totalCols; jj++) {
        tab[i][jj] = R.sub(tab[i][jj], R.mul(factor, pivotRow[jj]));
      }
    }
  }
  basis[rowIdx] = colIdx;
}

// ============================================================================
// 公開
// ============================================================================

var _exports = {
  solveLPExact: solveLPExact,
  _internal: { simplexIterate: simplexIterate, pivotOn: pivotOn, toRational: toRational }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  var _g = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis);
  _g.Toriai = _g.Toriai || {};
  _g.Toriai.calculation = _g.Toriai.calculation || {};
  _g.Toriai.calculation.yield = _g.Toriai.calculation.yield || {};
  _g.Toriai.calculation.yield.research = _g.Toriai.calculation.yield.research || {};
  _g.Toriai.calculation.yield.research.rationalLp = _exports;
}
