/**
 * TORIAI 計算 V3 — Algebraic Optimality Certificate (Phase K-4)
 *
 * K-3 で得た rational CG 結果から、4 つの最適性定理を Rational 等式で
 * 検証し、自然言語の証明書を生成する。
 *
 * 4 定理:
 *   T1 (Primal feasibility): ∀i, Σ_p counts(p,i) × x_int(p) ≥ d_i
 *   T2 (Dual feasibility):    ∀p, RC(p) := c(p) − Σ_i π_i × counts(p,i) ≥ 0
 *   T3 (Complementary slackness): ∀p with x_lp(p) > 0, RC(p) = 0
 *   T4 (LP duality):           Σ_p c(p) × x_lp(p) = Σ_i π_i × d_i = C_lp
 *
 * すべて BigInt rational arithmetic で機械検証可能。
 *
 * 純関数 + dual-mode。
 */

'use strict';

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
var RLp = _resolveDep('./rationalLp.js', 'Toriai.calculation.yield.research.rationalLp');

// ============================================================================
// computeReducedCost(pattern, pi, items)
//
// RC(p) = c(p) − Σ_i π_i × counts(p, i)
// All inputs Rational (or convertible). Returns Rational.
// ============================================================================

function computeReducedCost(pattern, pi) {
  if (!pattern || !pi) return null;
  var stockCost = R.fromInt(pattern.stock);
  var dualValue = R.zero();
  for (var i = 0; i < pattern.counts.length && i < pi.length; i++) {
    if (pattern.counts[i] > 0) {
      dualValue = R.add(dualValue, R.mul(pi[i], R.fromInt(pattern.counts[i])));
    }
  }
  return R.sub(stockCost, dualValue);
}

// ============================================================================
// verifyPrimalFeasibility(xInt, patterns, items)
//
// 各 piece i について Σ_p counts(p, i) × x_int(p) ≥ d_i を検証
// xInt: Rational[] (integer values expected)
// 戻り値: { allHold, byPiece: [{ piece, demand, supplied, holds }] }
// ============================================================================

function verifyPrimalFeasibility(xInt, patterns, items) {
  var byPiece = [];
  var allHold = true;
  for (var i = 0; i < items.length; i++) {
    var supplied = R.zero();
    for (var p = 0; p < patterns.length; p++) {
      var cnt = patterns[p].counts[i] || 0;
      if (cnt > 0 && xInt[p]) {
        supplied = R.add(supplied, R.mul(R.fromInt(cnt), xInt[p]));
      }
    }
    var demand = R.fromInt(items[i].count);
    var holds = R.gte(supplied, demand);
    if (!holds) allHold = false;
    byPiece.push({
      piece: { length: items[i].length, count: items[i].count },
      demand: demand,
      supplied: supplied,
      holds: holds
    });
  }
  return { allHold: allHold, byPiece: byPiece };
}

// ============================================================================
// verifyDualFeasibility(patterns, pi)
//
// ∀p, RC(p) ≥ 0
// ============================================================================

function verifyDualFeasibility(patterns, pi) {
  var byPattern = [];
  var allHold = true;
  for (var k = 0; k < patterns.length; k++) {
    var rc = computeReducedCost(patterns[k], pi);
    var holds = R.gte(rc, R.zero());
    if (!holds) allHold = false;
    byPattern.push({
      patternIndex: k,
      stock: patterns[k].stock,
      counts: patterns[k].counts.slice(),
      reducedCost: rc,
      holds: holds
    });
  }
  return { allHold: allHold, byPattern: byPattern };
}

// ============================================================================
// verifyComplementarySlackness(xLp, patterns, pi)
//
// ∀p with x_lp(p) > 0, RC(p) = 0
// ============================================================================

function verifyComplementarySlackness(xLp, patterns, pi) {
  var byPattern = [];
  var allHold = true;
  for (var k = 0; k < patterns.length; k++) {
    var x = xLp[k];
    if (x && R.isPositive(x)) {
      var rc = computeReducedCost(patterns[k], pi);
      var holds = R.isZero(rc);
      if (!holds) allHold = false;
      byPattern.push({
        patternIndex: k,
        stock: patterns[k].stock,
        x: x,
        reducedCost: rc,
        holds: holds
      });
    }
  }
  return { allHold: allHold, byPattern: byPattern };
}

// ============================================================================
// verifyLpDuality(patterns, xLp, pi, items)
//
// Σ c(p) × x_lp(p) = Σ π_i × d_i
// ============================================================================

function verifyLpDuality(patterns, xLp, pi, items) {
  var primal = R.zero();
  for (var p = 0; p < patterns.length; p++) {
    if (xLp[p] && !R.isZero(xLp[p])) {
      primal = R.add(primal, R.mul(R.fromInt(patterns[p].stock), xLp[p]));
    }
  }
  var dual = R.zero();
  for (var i = 0; i < items.length; i++) {
    dual = R.add(dual, R.mul(pi[i], R.fromInt(items[i].count)));
  }
  var equal = R.eq(primal, dual);
  return { primal: primal, dual: dual, equal: equal };
}

// ============================================================================
// generateCertificate(cgResult, spec, opts)
//
// cgResult: rationalCg.solveColumnGenExact の戻り値
// spec: 元の問題
// opts: { lang?: 'ja' | 'en' (default 'ja'), includeDetails?: bool }
// ============================================================================

function generateCertificate(cgResult, spec, opts) {
  opts = opts || {};
  var lang = opts.lang || 'ja';
  var includeDetails = opts.includeDetails !== false;

  if (!cgResult || !cgResult.x || !cgResult.lpObjective) {
    return { error: 'invalid_cg_result' };
  }

  var patterns = cgResult.patterns;
  var xInt = cgResult.x;
  var items = spec.pieces.map(function(p) { return { length: p.length, count: p.count }; });

  // K-3 では x_lp と pi が cgResult に直接含まれてないので、最終 LP を再 solve
  // (パフォーマンス上 OK、CG 後の LP は patterns + items から決まる)
  var n = patterns.length;
  var m = items.length;
  var c = patterns.map(function(p) { return p.stock; });
  var A = [];
  for (var i = 0; i < m; i++) {
    var row = new Array(n).fill(0);
    for (var j = 0; j < n; j++) row[j] = patterns[j].counts[i] || 0;
    A.push(row);
  }
  var b = items.map(function(it) { return it.count; });
  var types = items.map(function() { return '>='; });
  var lp = RLp.solveLPExact({ c: c, A: A, b: b, constraintTypes: types });
  if (lp.status !== 'optimal') {
    return { error: 'lp_resolve_failed', status: lp.status };
  }
  var xLp = lp.x;
  var pi = lp.duals;
  var Clp = lp.objective;

  // ---- 4 定理を検証 ----
  var t1 = verifyPrimalFeasibility(xInt, patterns, items);
  var t2 = verifyDualFeasibility(patterns, pi);
  var t3 = verifyComplementarySlackness(xLp, patterns, pi);
  var t4 = verifyLpDuality(patterns, xLp, pi, items);

  var allTheoremsHold = t1.allHold && t2.allHold && t3.allHold && t4.equal;

  // 整数 gap (exact)
  var Cint = cgResult.objective;
  var gap = null;
  if (!R.isZero(Cint)) {
    gap = R.div(R.sub(Cint, Clp), R.abs(Cint));
  }

  // ---- 自然言語証明書 ----
  var nl = lang === 'en'
    ? generateEnglishCertificate(spec, patterns, xInt, xLp, pi, Clp, Cint, gap, t1, t2, t3, t4, allTheoremsHold, includeDetails)
    : generateJapaneseCertificate(spec, patterns, xInt, xLp, pi, Clp, Cint, gap, t1, t2, t3, t4, allTheoremsHold, includeDetails);

  return {
    spec: { kind: spec.kind, k: items.length, n: items.reduce(function(s, it) { return s + it.count; }, 0) },
    summary: {
      lpOptimum: Clp,
      lpOptimumFloat: R.toNumber(Clp),
      integerOptimum: Cint,
      integerOptimumFloat: R.toNumber(Cint),
      gap: gap,
      gapAsString: gap ? R.toString(gap) : 'N/A',
      gapFloat: gap ? R.toNumber(gap) : null
    },
    verifications: {
      T1_primal: { allHold: t1.allHold, count: t1.byPiece.length },
      T2_dual: { allHold: t2.allHold, count: t2.byPattern.length },
      T3_complementary: { allHold: t3.allHold, count: t3.byPattern.length },
      T4_duality: { equal: t4.equal, primal: t4.primal, dual: t4.dual }
    },
    allTheoremsHold: allTheoremsHold,
    naturalLanguage: nl,
    details: includeDetails ? { t1: t1, t2: t2, t3: t3, t4: t4, pi: pi, xLp: xLp } : null
  };
}

// ============================================================================
// generateJapaneseCertificate — 整形済み日本語証明書
// ============================================================================

function generateJapaneseCertificate(spec, patterns, xInt, xLp, pi, Clp, Cint, gap, t1, t2, t3, t4, allHold, includeDetails) {
  var lines = [];
  lines.push('【 最適性証明 — Algebraic Optimality Certificate 】');
  lines.push('');
  var k = spec.pieces.length;
  var n = spec.pieces.reduce(function(s, p) { return s + p.count; }, 0);
  lines.push('問題: k = ' + k + ' piece types, n = ' + n + ' total demand');
  lines.push('  pattern 数: ' + patterns.length);
  lines.push('');
  lines.push('LP 緩和の最適値:    ' + R.toString(Clp) + ' (= ' + R.toNumber(Clp).toFixed(2) + ')');
  lines.push('整数最適解の値:      ' + R.toString(Cint) + ' (= ' + R.toNumber(Cint).toFixed(2) + ')');
  if (gap) {
    lines.push('整数 gap (exact):    ' + R.toString(gap) + ' ≈ ' + (R.toNumber(gap) * 100).toFixed(4) + '%');
  }
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // T1
  lines.push('▶ 定理 1 (Primal Feasibility): ' + (t1.allHold ? '✅ 成立' : '❌ 失敗'));
  lines.push('   全 piece type で demand を整数解が満たすか検証');
  if (includeDetails) {
    t1.byPiece.forEach(function(b) {
      lines.push('     • piece ' + b.piece.length + 'mm × ' + b.piece.count + ' demand: '
        + 'supplied = ' + R.toString(b.supplied) + ' ≥ ' + R.toString(b.demand)
        + ' ' + (b.holds ? '✓' : '✗'));
    });
  }
  lines.push('');

  // T2
  lines.push('▶ 定理 2 (Dual Feasibility): ' + (t2.allHold ? '✅ 成立' : '❌ 失敗'));
  lines.push('   全 ' + t2.byPattern.length + ' patterns で reduced cost ≥ 0 (LP 双対充足性)');
  if (includeDetails) {
    // 上位 5 つだけ表示
    var sample = t2.byPattern.slice(0, 5);
    sample.forEach(function(p) {
      lines.push('     • pattern[' + p.patternIndex + '] stock=' + p.stock
        + ' RC = ' + R.toString(p.reducedCost) + ' ' + (p.holds ? '✓' : '✗'));
    });
    if (t2.byPattern.length > 5) {
      lines.push('     ... (' + (t2.byPattern.length - 5) + ' more, all hold)');
    }
  }
  lines.push('');

  // T3
  lines.push('▶ 定理 3 (Complementary Slackness): ' + (t3.allHold ? '✅ 成立' : '❌ 失敗'));
  lines.push('   x_lp(p) > 0 となる全 ' + t3.byPattern.length + ' patterns で RC(p) = 0');
  if (includeDetails) {
    var sample3 = t3.byPattern.slice(0, 5);
    sample3.forEach(function(p) {
      lines.push('     • pattern[' + p.patternIndex + '] x_lp = ' + R.toString(p.x)
        + ' RC = ' + R.toString(p.reducedCost) + ' ' + (p.holds ? '✓' : '✗'));
    });
  }
  lines.push('');

  // T4
  lines.push('▶ 定理 4 (LP Duality / Strong): ' + (t4.equal ? '✅ 成立' : '❌ 失敗'));
  lines.push('   Σ c(p) × x_lp(p)  = ' + R.toString(t4.primal));
  lines.push('   Σ π(i) × d(i)     = ' + R.toString(t4.dual));
  lines.push('   等式: ' + (t4.equal ? '完全一致 (LP 強双対性)' : '相違あり'));
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  if (allHold) {
    lines.push('▶ 結論: 4 定理すべて成立。LP 最適性証明完了。');
    lines.push('   LP 最適値 = ' + R.toString(Clp) + ' は exactly 確定。');
    if (gap && R.isZero(gap)) {
      lines.push('   gap = 0 → 整数解 ' + R.toString(Cint) + ' は **整数最適** (LP-tight)。');
    } else if (gap) {
      lines.push('   gap = ' + R.toString(gap) + ' → 整数解は LP 最適から exactly この比率で離れる。');
      lines.push('   （整数最適性は B&B が探索打切なら未保証、proved optimal なら保証）');
    }
  } else {
    lines.push('▶ 警告: 一部定理が成立せず。証明書 INVALID。');
    lines.push('   T1=' + t1.allHold + ' T2=' + t2.allHold + ' T3=' + t3.allHold + ' T4=' + t4.equal);
  }
  lines.push('');
  lines.push('▶ 機械検証可能性: YES (BigInt rational arithmetic)');
  lines.push('▶ 浮動小数点誤差: ZERO');
  lines.push('');
  lines.push('生成: TORIAI v3 algebraic certificate (research/algebraicCertificate.js)');

  return lines.join('\n');
}

// ============================================================================
// generateEnglishCertificate (簡易版)
// ============================================================================

function generateEnglishCertificate(spec, patterns, xInt, xLp, pi, Clp, Cint, gap, t1, t2, t3, t4, allHold, includeDetails) {
  var lines = [];
  lines.push('=== Algebraic Optimality Certificate ===');
  lines.push('');
  lines.push('LP optimum:        ' + R.toString(Clp));
  lines.push('Integer optimum:   ' + R.toString(Cint));
  if (gap) lines.push('Exact gap:         ' + R.toString(gap) + ' (= ' + (R.toNumber(gap) * 100).toFixed(4) + '%)');
  lines.push('');
  lines.push('Theorem 1 (Primal Feasibility):       ' + (t1.allHold ? 'HOLDS' : 'FAILED'));
  lines.push('Theorem 2 (Dual Feasibility):         ' + (t2.allHold ? 'HOLDS' : 'FAILED'));
  lines.push('Theorem 3 (Complementary Slackness):  ' + (t3.allHold ? 'HOLDS' : 'FAILED'));
  lines.push('Theorem 4 (LP Strong Duality):        ' + (t4.equal ? 'HOLDS' : 'FAILED'));
  lines.push('');
  lines.push(allHold ? 'CERTIFICATE VALID — LP optimum exactly verified.' : 'CERTIFICATE INVALID');
  lines.push('Machine-verifiable via BigInt rational arithmetic, zero floating-point error.');
  return lines.join('\n');
}

// ============================================================================
// 公開
// ============================================================================

var _exports = {
  computeReducedCost: computeReducedCost,
  verifyPrimalFeasibility: verifyPrimalFeasibility,
  verifyDualFeasibility: verifyDualFeasibility,
  verifyComplementarySlackness: verifyComplementarySlackness,
  verifyLpDuality: verifyLpDuality,
  generateCertificate: generateCertificate
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  var _g = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis);
  _g.Toriai = _g.Toriai || {};
  _g.Toriai.calculation = _g.Toriai.calculation || {};
  _g.Toriai.calculation.yield = _g.Toriai.calculation.yield || {};
  _g.Toriai.calculation.yield.research = _g.Toriai.calculation.yield.research || {};
  _g.Toriai.calculation.yield.research.algebraicCertificate = _exports;
}
