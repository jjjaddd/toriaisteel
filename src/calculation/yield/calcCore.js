(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns) return;

  ns.calculation.yield = ns.calculation.yield || {};

  function getYieldNs() {
    return ns.calculation.yield || {};
  }

  function calcCore(options) {
    options = options || {};

    var blade = options.blade || 0;
    var endLoss = options.endLoss || 0;
    var kgm = options.kgm || 0;
    var stocks = (options.stocks || []).slice();
    var pieces = (options.pieces || []).slice().sort(function(a, b) { return b - a; });
    var remnants = (options.remnants || []).slice();
    var minValidLen = options.minValidLen || 500;
    var kind = options.kind || '';
    var spec = options.spec || '';

    var yieldNs = getYieldNs();
    var pack = yieldNs.pack || function() { return []; };
    var packWithRemnants = yieldNs.packWithRemnants || function(inputPieces) {
      return { remaining: inputPieces.slice(), remnantBars: [] };
    };
    var calcChargeMin = yieldNs.calcChargeMin || function() { return []; };
    var enumAllPatterns = yieldNs.enumAllPatterns || function() { return []; };
    var bnbSolve = yieldNs.bnbSolve || function() { return { sol: null, bars: Infinity, piece: 0 }; };
    var packDP = yieldNs.packDP || function() { return []; };
    var calcBundlePlan = yieldNs.calcBundlePlan || function() { return null; };
    var calcPatternA = yieldNs.calcPatternA || function() { return null; };
    var calcPatternB = yieldNs.calcPatternB || function() { return null; };
    var calcPatternC = yieldNs.calcPatternC || function() { return null; };
    var calcMetrics = yieldNs.calcMetrics || function() { return {}; };
    var resetDpCache = yieldNs.resetDpCache || function() {};

    var remnantResult = { remaining: pieces, remnantBars: [] };
    if (remnants.length > 0) {
      remnantResult = packWithRemnants(pieces, remnants, stocks, blade, endLoss);
    }

    var calcPieces = remnantResult.remaining || [];
    var calcStocks = (remnants.length > 0 && calcPieces.length > 0 && ns.data && ns.data.steel && typeof ns.data.steel.buildUnlimitedStockPool === 'function')
      ? ns.data.steel.buildUnlimitedStockPool(kind, spec)
      : stocks;

    if (!calcPieces.length) {
      return {
        single: [],
        chgPlans: [],
        allDP: [],
        remnantBars: remnantResult.remnantBars || [],
        bundlePlan: null,
        patA: null,
        patB: null,
        patC: null,
        yieldCard1: null,
        calcPieces: [],
        origPieces: pieces
      };
    }

    var single = [];
    calcStocks.forEach(function(stock) {
      var eff = stock.sl - endLoss;
      if (eff <= 0) return;
      var bars = pack(calcPieces, eff, blade);
      if (bars.length > stock.max) return;

      bars.forEach(function(bar) { bar.sl = stock.sl; });

      var loss = bars.reduce(function(acc, bar) { return acc + bar.loss; }, 0);
      var usable = stock.sl * bars.length;
      var gMap = {};
      bars.forEach(function(bar) {
        var key = bar.pat.join(',');
        if (!gMap[key]) gMap[key] = bar.pat;
      });
      var chg = Object.values(gMap).reduce(function(acc, pat) { return acc + 1 + pat.length; }, 0);

      single.push({
        sl: stock.sl,
        bars: bars,
        loss: loss,
        max: stock.max,
        yld: usable > 0 ? (1 - loss / usable) * 100 : 0,
        lossRate: usable > 0 ? (loss / usable) * 100 : 100,
        barKg: (stock.sl / 1000) * kgm * bars.length,
        lossKg: (loss / 1000) * kgm,
        chg: chg
      });
    });
    single.sort(function(a, b) { return a.lossRate - b.lossRate; });

    var chgPlans = calcChargeMin(calcPieces, calcStocks, blade, endLoss, kgm);

    var allDP = [];
    (function buildDpCandidates() {
      var cnt = {};
      calcPieces.forEach(function(piece) { cnt[piece] = (cnt[piece] || 0) + 1; });
      var bnbItems = Object.keys(cnt).map(Number).sort(function(a, b) { return b - a; });
      var bnbDem = bnbItems.map(function(len) { return cnt[len]; });
      var bnbPats = enumAllPatterns(calcStocks, bnbItems, bnbDem, blade, endLoss);
      var best = bnbSolve(bnbDem, bnbItems, bnbPats, 3000);

      if (best.sol) {
        var bars = best.sol.map(function(candidate) {
          return { pat: candidate.pat.slice(), loss: candidate.loss, sl: candidate.sl };
        });
        var slCnt = {};
        bars.forEach(function(bar) { slCnt[bar.sl] = (slCnt[bar.sl] || 0) + 1; });
        var desc = Object.keys(slCnt).map(Number).sort(function(a, b) { return b - a; }).map(function(sl) {
          return sl.toLocaleString() + 'mm × ' + slCnt[sl] + '本';
        }).join(' + ');
        var totalUse = bars.reduce(function(sum, bar) { return sum + bar.sl; }, 0);
        var totalPieces = bars.reduce(function(sum, bar) {
          return sum + bar.pat.reduce(function(acc, piece) { return acc + piece; }, 0);
        }, 0);
        var lossKg = bars.reduce(function(sum, bar) { return sum + bar.loss; }, 0) / 1000 * kgm;
        var barKg = totalUse / 1000 * kgm;
        var lossRate = totalUse > 0 ? (1 - totalPieces / totalUse) * 100 : 100;
        allDP.push({
          desc: desc,
          lossRate: lossRate,
          lossKg: lossKg,
          barKg: barKg,
          bars: bars,
          slA: bars[0] ? bars[0].sl : calcStocks[0].sl,
          slB: null,
          bA: bars,
          bB: [],
          chg: 0,
          type: 'bnb'
        });
      }

      resetDpCache();
      calcStocks.forEach(function(stock) {
        var eff = stock.sl - endLoss;
        if (eff <= 0) return;
        var bars = packDP(calcPieces.slice(), eff, blade);
        if (bars.length > stock.max) return;
        bars.forEach(function(bar) { bar.sl = stock.sl; });
        var loss = bars.reduce(function(sum, bar) { return sum + bar.loss; }, 0);
        var totalLen = stock.sl * bars.length;
        var pieceLen = bars.reduce(function(sum, bar) {
          return sum + bar.pat.reduce(function(acc, piece) { return acc + piece; }, 0);
        }, 0);
        var gMap = {};
        bars.forEach(function(bar) {
          var key = bar.pat.join(',');
          if (!gMap[key]) gMap[key] = bar.pat;
        });
        var chg = Object.values(gMap).reduce(function(acc, pat) { return acc + 1 + pat.length; }, 0);
        allDP.push({
          desc: stock.sl.toLocaleString() + 'mm × ' + bars.length + '本',
          lossRate: totalLen > 0 ? (1 - pieceLen / totalLen) * 100 : 100,
          lossKg: loss / 1000 * kgm,
          barKg: totalLen / 1000 * kgm,
          bars: bars,
          slA: stock.sl,
          slB: null,
          bA: bars,
          bB: [],
          chg: chg,
          type: 'single'
        });
      });
      allDP.sort(function(a, b) { return a.lossRate - b.lossRate; });
    })();

    var yieldCard1 = allDP.length ? allDP[0] : null;
    var bundlePlan = calcBundlePlan(calcPieces, calcStocks, blade, endLoss, kgm);
    var isHeavy = calcPieces.length > 30;
    var patA = calcPatternA(calcPieces, calcStocks, blade, endLoss, kgm);
    var patB = isHeavy ? null : calcPatternB(calcPieces, calcStocks, blade, endLoss, kgm);
    var patC = calcPatternC(calcPieces, calcStocks, blade, endLoss, kgm);
    var remBars = remnantResult.remnantBars || [];

    if (remBars.length) {
      function mergeRemnants(plan) {
        if (!plan || !plan.bars) return plan;
        var merged = remBars.concat(plan.bars);
        var sl = plan.sl || (merged[0] && merged[0].sl) || (calcStocks[0] && calcStocks[0].sl) || 0;
        var metrics = calcMetrics(merged, sl, endLoss, kgm, minValidLen);
        return Object.assign({}, plan, { bars: merged, metrics: metrics });
      }
      if (patA) patA = mergeRemnants(patA);
      if (patB) {
        if (patB.plan90) patB.plan90 = mergeRemnants(patB.plan90);
        if (patB.plan80) patB.plan80 = mergeRemnants(patB.plan80);
      }
      if (patC) patC = mergeRemnants(patC);
    }

    return {
      single: single,
      chgPlans: chgPlans,
      allDP: allDP,
      remnantBars: remBars,
      bundlePlan: bundlePlan,
      patA: patA,
      patB: patB,
      patC: patC,
      yieldCard1: yieldCard1,
      calcPieces: calcPieces,
      origPieces: pieces
    };
  }

  ns.calculation.yield.calcCore = calcCore;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
