(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns) return;

  ns.calculation.yield = ns.calculation.yield || {};

  function calcBundlePlan(pieces, stocks, blade, endLoss, kgm) {
    var sorted = pieces.slice().sort(function(a, b) { return b - a; });
    var needed = sorted.reduce(function(sum, piece, index) {
      return sum + piece + (index > 0 ? blade : 0);
    }, 0);
    var best = null;

    stocks.forEach(function(stock) {
      var eff = stock.sl - endLoss;
      if (eff < needed) return;

      var loss = eff - needed;
      if (!best || stock.sl < best.sl) {
        best = {
          sl: stock.sl,
          pat: sorted.slice(),
          loss: loss,
          lossPerBar: loss,
          cutCount: 1 + sorted.length,
          lossRate: stock.sl > 0 ? (loss / eff) * 100 : 100,
          barKg: (stock.sl / 1000) * kgm,
          lossKg: (loss / 1000) * kgm
        };
      }
    });

    return best;
  }

  ns.calculation.yield.calcBundlePlan = calcBundlePlan;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
