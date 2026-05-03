importScripts(
  '/src/core/toriai-namespace.js?v=phase3',
  '/src/data/steel/stockHelpers.js?v=phase3',
  '/src/calculation/yield/barMetrics.js?v=phase3',
  '/src/calculation/yield/patternPacking.js?v=phase3',
  '/src/calculation/yield/repeatPlans.js?v=phase3',
  '/src/calculation/yield/bundlePlan.js?v=phase3',
  '/src/calculation/yield/calcCore.js?v=phase3',
  '/src/calculation/yield/algorithmV2.js?v=phase3',
  '/src/calculation/yield/algorithmV3.js?v=phase3v3ls'
);

(function(global) {
  'use strict';

  var ns = global.Toriai && global.Toriai.calculation && global.Toriai.calculation.yield;
  if (!ns) {
    self.onmessage = function(e) {
      var mode = e && e.data ? e.data.mode : '';
      self.postMessage({ ok: false, error: 'Worker namespace unavailable', mode: mode });
    };
    return;
  }

  function calcYield(blade, endLoss, kgm, stocks, pieces, remnants, minValidLen, mode) {
    var coreResult = ns.calcCore({
      blade: blade,
      endLoss: endLoss,
      kgm: kgm,
      stocks: stocks,
      pieces: pieces,
      remnants: remnants,
      minValidLen: minValidLen,
      mode: mode  // Phase 2-1: 'normal' | 'deep'
    }) || {};

    return {
      single: coreResult.single || [],
      chgPlans: coreResult.chgPlans || [],
      allDP: coreResult.allDP || [],
      remnantBars: coreResult.remnantBars || [],
      bundlePlan: coreResult.bundlePlan || null,
      yieldCard1: coreResult.yieldCard1 || null,
      calcPieces: coreResult.calcPieces || [],
      origPieces: coreResult.origPieces || (pieces || []).slice()
    };
  }

  self.onmessage = function(e) {
    var data = e.data || {};
    try {
      var result;
      if (data.mode === 'yield') {
        result = calcYield(data.blade, data.endLoss, data.kgm, data.stocks, data.pieces, data.remnants, data.minValidLen, data.calcMode);
      } else if (data.mode === 'patA') {
        if (typeof ns.resetDpCache === 'function') ns.resetDpCache();
        result = { patA: ns.calcPatternA(data.pieces, data.stocks, data.blade, data.endLoss, data.kgm) };
      } else if (data.mode === 'patB') {
        if (typeof ns.resetDpCache === 'function') ns.resetDpCache();
        result = { patB: ns.calcPatternB(data.pieces, data.stocks, data.blade, data.endLoss, data.kgm) };
      } else if (data.mode === 'patC') {
        result = { patC: ns.calcPatternC(data.pieces, data.stocks, data.blade, data.endLoss, data.kgm) };
      } else {
        result = ns.calcCore({
          blade: data.blade,
          endLoss: data.endLoss,
          kgm: data.kgm,
          stocks: data.stocks,
          pieces: data.pieces,
          remnants: data.remnants,
          minValidLen: data.minValidLen,
          mode: data.calcMode  // Phase 2-1
        });
      }
      self.postMessage({ ok: true, result: result, mode: data.mode });
    } catch (error) {
      self.postMessage({ ok: false, error: error.message, mode: data.mode });
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
