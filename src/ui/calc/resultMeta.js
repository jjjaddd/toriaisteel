(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.ui = ns.ui || {};
  ns.ui.calc = ns.ui.calc || {};

  function cloneStocks(stocks) {
    return (stocks || []).map(function(stock) {
      return { sl: stock.sl, max: stock.max };
    });
  }

  function cloneBars(bars) {
    return (bars || []).map(function(bar) {
      return {
        pat: (bar.pat || []).slice(),
        loss: bar.loss || 0,
        sl: bar.sl || 0
      };
    });
  }

  function getCurrentCalcKind() {
    if (typeof global.getCurrentKind === 'function') return global.getCurrentKind() || '';
    if (typeof global.curKind !== 'undefined') return global.curKind || '';
    return '';
  }

  function buildCalcResultMeta(options) {
    options = options || {};
    return {
      calcId: options.calcId || ('calc_' + Date.now()),
      spec: options.spec != null ? options.spec : (((global.document.getElementById('spec') || {}).value) || ''),
      kind: options.kind != null ? options.kind : getCurrentCalcKind(),
      minRemnantLen: parseInt(options.minRemnantLen, 10) || 500,
      blade: parseInt(options.blade, 10) || 3,
      endLoss: parseInt(options.endLoss, 10) || 0,
      job: options.job || (typeof global.getJobInfo === 'function' ? global.getJobInfo() : {}),
      stocks: cloneStocks(options.stocks),
      origPieces: (options.origPieces || []).slice(),
      calcPieces: (options.calcPieces || []).slice(),
      selectedInventoryRemnants: options.selectedInventoryRemnants || (
        typeof global.getSelectedInventoryRemnantDetails === 'function'
          ? global.getSelectedInventoryRemnantDetails()
          : []
      ),
      remnantBars: cloneBars(options.remnantBars)
    };
  }

  ns.ui.calc.cloneStocks = cloneStocks;
  ns.ui.calc.cloneBars = cloneBars;
  ns.ui.calc.buildCalcResultMeta = buildCalcResultMeta;
})(window);
