/**
 * TORIAI 計算 V3 — Solution Explanation via LP Duality
 *
 * 設計 (RESEARCH_EXPLAIN.md):
 *   CG が出力した解と LP 双対変数 π_i から、
 *   - 各 used pattern の正当性 (reduced cost ≈ 0)
 *   - 各 unused pattern の premium (reduced cost > 0)
 *   - 各 piece type の marginal cost (π_i)
 *   - 自然言語の説明
 *   を生成する。
 *
 * 純関数。Node + Browser dual-mode。
 */

'use strict';

// ============================================================================
// computeReducedCost(pattern, dualPi) — pattern の reduced cost
//
// RC(p) = stock(p) − Σ π_i × counts(p, i)
// ============================================================================

function computeReducedCost(pattern, dualPi) {
  if (!pattern || !pattern.counts || !dualPi) return NaN;
  var marginalValue = 0;
  for (var i = 0; i < pattern.counts.length && i < dualPi.length; i++) {
    marginalValue += (pattern.counts[i] || 0) * (dualPi[i] || 0);
  }
  return pattern.stock - marginalValue;
}

// ============================================================================
// classifyPattern — used / unused-near-margin / unused-with-premium
// ============================================================================

function classifyPattern(rc, x, eps) {
  eps = eps != null ? eps : 1.0;  // 1mm 以下は LP-tight とみなす
  if (x > 0.5) {
    return Math.abs(rc) <= eps ? 'used_at_margin' : 'used_with_drift';
  }
  if (Math.abs(rc) <= eps) return 'unused_at_margin';
  return rc > 0 ? 'unused_with_premium' : 'unused_negative_rc_anomaly';
}

// ============================================================================
// explainPatterns — 各 pattern について justification を生成
//
// solveColumnGenInspect の結果から作る:
//   patterns: pattern[]
//   xInt: integer solution (per pattern multiplicity)
//   dualPi: π_i (per piece type)
//   items: { length, count }[]
// ============================================================================

function explainPatterns(patterns, xInt, dualPi, items) {
  if (!patterns || !dualPi || !items) return [];
  var explanations = [];
  for (var k = 0; k < patterns.length; k++) {
    var p = patterns[k];
    var x = xInt && xInt[k] != null ? xInt[k] : 0;
    var rc = computeReducedCost(p, dualPi);
    var verdict = classifyPattern(rc, x);

    // pattern の piece breakdown を可読化
    var pieceList = [];
    var marginalValue = 0;
    for (var i = 0; i < p.counts.length; i++) {
      if (p.counts[i] > 0) {
        pieceList.push({
          length: items[i].length,
          count: p.counts[i],
          dualPi: dualPi[i],
          contribution: p.counts[i] * dualPi[i]
        });
        marginalValue += p.counts[i] * dualPi[i];
      }
    }

    explanations.push({
      patternIndex: k,
      stock: p.stock,
      counts: p.counts.slice(),
      x: x,
      pieceList: pieceList,
      stockCost: p.stock,
      marginalValue: Math.round(marginalValue * 100) / 100,
      reducedCost: Math.round(rc * 100) / 100,
      verdict: verdict
    });
  }
  return explanations;
}

// ============================================================================
// explainMarginalCosts — 各 piece type の shadow price 解釈
// ============================================================================

function explainMarginalCosts(items, dualPi) {
  if (!items || !dualPi) return [];
  return items.map(function(it, i) {
    var pi = dualPi[i] || 0;
    return {
      pieceLength: it.length,
      demand: it.count,
      shadowPrice: Math.round(pi * 100) / 100,
      // π_i = "demand を 1 増やしたら最適値が π_i mm 増える"
      // π_i / it.length = "1mm の piece あたりのコスト"
      perMmCost: it.length > 0 ? Math.round((pi / it.length) * 1000) / 1000 : 0
    };
  });
}

// ============================================================================
// generateNaturalLanguageJa — 日本語の説明文を組み立てる
// ============================================================================

function generateNaturalLanguageJa(patternExp, marginalCosts, totalCost, lpObj) {
  var lines = [];

  // ヘッダ
  lines.push('【 解の説明 — LP 双対性に基づく 】');
  lines.push('');
  lines.push('総コスト (整数解): ' + Math.round(totalCost) + ' mm');
  if (lpObj != null) {
    lines.push('LP 緩和の最適値: ' + Math.round(lpObj) + ' mm');
    var gap = lpObj > 0 ? ((totalCost - lpObj) / lpObj * 100) : 0;
    lines.push('整数 gap: ' + gap.toFixed(2) + '% (LP-tight に近いほど CSP の構造が単純)');
  }
  lines.push('');

  // 使われた pattern の justification
  var usedExplained = patternExp.filter(function(e) { return e.x > 0; });
  if (usedExplained.length > 0) {
    lines.push('■ 使われた pattern とその根拠');
    usedExplained.forEach(function(e) {
      var pieceStr = e.pieceList.map(function(pl) {
        return pl.count + '×' + pl.length + 'mm';
      }).join(' + ');
      lines.push('  • Stock ' + e.stock + 'mm の bar を ' + e.x + ' 本使う [' + pieceStr + ']');
      lines.push('    → コスト ' + e.stockCost + 'mm、ピース合計の双対価値 '
        + e.marginalValue + 'mm、差 ' + e.reducedCost + 'mm');
      if (e.verdict === 'used_at_margin') {
        lines.push('    判定: LP 最適性条件を満たす margin 解（reduced cost ≈ 0）');
      } else {
        lines.push('    判定: 整数解として LP からドリフト（reduced cost = '
          + e.reducedCost + 'mm）');
      }
    });
    lines.push('');
  }

  // 未使用 pattern のうち premium が小さい "near miss" を抜粋
  var unusedSorted = patternExp.filter(function(e) { return e.x === 0; })
    .sort(function(a, b) { return a.reducedCost - b.reducedCost; });
  if (unusedSorted.length > 0) {
    lines.push('■ 検討されたが採用されなかった代替 pattern (premium 小さい順)');
    unusedSorted.slice(0, 5).forEach(function(e) {
      var pieceStr = e.pieceList.map(function(pl) {
        return pl.count + '×' + pl.length + 'mm';
      }).join(' + ');
      lines.push('  • Stock ' + e.stock + 'mm [' + pieceStr + ']');
      if (e.reducedCost > 0) {
        lines.push('    → 使うと LP 最適から ' + e.reducedCost + 'mm の余分なコスト');
      } else if (e.reducedCost < 0) {
        lines.push('    → 異常 (negative RC、整数解と LP duals の整合性が緩い)');
      } else {
        lines.push('    → reduced cost ≈ 0 (代替の margin 解、使っても同コスト)');
      }
    });
    lines.push('');
  }

  // 限界コスト
  if (marginalCosts && marginalCosts.length > 0) {
    lines.push('■ 各 piece type の限界コスト (shadow price π_i)');
    lines.push('  「demand を 1 増やしたら最適値が π_i mm 増える」の意味');
    var significant = marginalCosts.filter(function(mc) { return Math.abs(mc.shadowPrice) > 0.01; });
    significant.forEach(function(mc) {
      lines.push('  • ' + mc.pieceLength + 'mm × ' + mc.demand + ' 本 → π = '
        + mc.shadowPrice + 'mm/本 (1mm あたり ' + mc.perMmCost + 'mm)');
    });
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================================
// explainSolution(result, patterns, dualPi, items, opts) — 全体の主関数
//
// 戻り値:
//   {
//     patternExplanations: [...],
//     marginalCosts: [...],
//     summary: { totalCost, lpObj, gap },
//     naturalLanguageJa: "..."
//   }
// ============================================================================

function explainSolution(result, patterns, dualPi, items, opts) {
  opts = opts || {};
  if (!result || !patterns || !dualPi || !items) {
    return { error: 'missing_inputs' };
  }
  // result.bars から x[] を逆算（patterns 順に対応）
  var xInt = patterns.map(function(p) {
    var count = 0;
    if (result.bars) {
      result.bars.forEach(function(b) {
        if (b.stock !== p.stock) return;
        // pattern の piece set と bar の pieces を比較
        var patPieces = [];
        p.counts.forEach(function(c, i) {
          for (var j = 0; j < c; j++) patPieces.push(items[i].length);
        });
        patPieces.sort(function(a, b) { return b - a; });
        var barPieces = b.pattern.slice().sort(function(a, b) { return b - a; });
        if (patPieces.length === barPieces.length &&
            patPieces.every(function(v, i) { return v === barPieces[i]; })) {
          count = b.count;
        }
      });
    }
    return count;
  });

  var patternExp = explainPatterns(patterns, xInt, dualPi, items);
  var marginalCosts = explainMarginalCosts(items, dualPi);
  var totalCost = result.stockTotal || 0;
  var lpObj = result._cgMeta && result._cgMeta.lpObjective ? result._cgMeta.lpObjective : null;

  var nlJa = generateNaturalLanguageJa(patternExp, marginalCosts, totalCost, lpObj);

  return {
    patternExplanations: patternExp,
    marginalCosts: marginalCosts,
    summary: {
      totalCost: totalCost,
      lpObjective: lpObj,
      gapPct: lpObj > 0 ? ((totalCost - lpObj) / lpObj * 100) : null
    },
    naturalLanguageJa: nlJa
  };
}

// ============================================================================
// 公開
// ============================================================================

var _exports = {
  computeReducedCost: computeReducedCost,
  classifyPattern: classifyPattern,
  explainPatterns: explainPatterns,
  explainMarginalCosts: explainMarginalCosts,
  generateNaturalLanguageJa: generateNaturalLanguageJa,
  explainSolution: explainSolution
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
} else {
  var _g = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis);
  _g.Toriai = _g.Toriai || {};
  _g.Toriai.calculation = _g.Toriai.calculation || {};
  _g.Toriai.calculation.yield = _g.Toriai.calculation.yield || {};
  _g.Toriai.calculation.yield.research = _g.Toriai.calculation.yield.research || {};
  _g.Toriai.calculation.yield.research.explain = _exports;
}
