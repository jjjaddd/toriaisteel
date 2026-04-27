(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns) return;

  ns.calculation.yield = ns.calculation.yield || {};

  function groupBars(bars) {
    var grouped = [];
    bars.forEach(function(bar) {
      var key = bar.pat.join(',') + ':' + bar.loss;
      var found = grouped.find(function(item) {
        return item.key === key;
      });
      if (found) {
        found.cnt += 1;
      } else {
        grouped.push({ key: key, pat: bar.pat, loss: bar.loss, cnt: 1 });
      }
    });
    return grouped;
  }

  function calcMetrics(bars, sl, endLoss, kgm, minValidLen) {
    minValidLen = minValidLen || 500;

    var switchCount = 0;
    var validRemnants = 0;
    var invalidRemnants = 0;
    var patternMap = {};
    var prevLen = null;
    var totalLoss = 0;
    var totalUsable = 0;

    bars.forEach(function(bar) {
      totalUsable += (bar.sl || sl);
      totalLoss += bar.loss;

      bar.pat.forEach(function(len) {
        if (prevLen !== null && len !== prevLen) switchCount++;
        prevLen = len;
      });

      if (bar.loss >= minValidLen) validRemnants++;
      else if (bar.loss > 0) invalidRemnants++;

      var key = bar.pat.slice().sort(function(a, b) { return b - a; }).join(',');
      patternMap[key] = (patternMap[key] || 0) + 1;
    });

    var totalCuts = Object.keys(patternMap).reduce(function(acc, key) {
      var patLen = key ? key.split(',').length : 0;
      return acc + 1 + patLen;
    }, 0);

    var samePatternCount = Object.keys(patternMap).reduce(function(mx, key) {
      return Math.max(mx, patternMap[key]);
    }, 0);

    var totalPieceLen = 0;
    bars.forEach(function(bar) {
      bar.pat.forEach(function(piece) {
        totalPieceLen += piece;
      });
    });

    var yieldPct = totalUsable > 0 ? (totalPieceLen / totalUsable) * 100 : 0;
    var lossKg = (totalLoss / 1000) * kgm;
    var barKg = bars.reduce(function(acc, bar) {
      return acc + (((bar.sl || sl) / 1000) * kgm);
    }, 0);
    var lossRate = 100 - yieldPct;
    var balanceScore = yieldPct * 0.5
      - totalCuts * 0.2
      - invalidRemnants * 0.2
      - switchCount * 0.1;

    return {
      totalCuts: totalCuts,
      switchCount: switchCount,
      validRemnants: validRemnants,
      invalidRemnants: invalidRemnants,
      samePatternCount: samePatternCount,
      yieldPct: yieldPct,
      lossRate: lossRate,
      lossKg: lossKg,
      barKg: barKg,
      totalLoss: totalLoss,
      balanceScore: balanceScore,
      barCount: bars.length,
      patternMap: patternMap
    };
  }

  ns.calculation.yield.groupBars = groupBars;
  ns.calculation.yield.calcMetrics = calcMetrics;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
