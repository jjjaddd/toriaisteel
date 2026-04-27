(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns) return;

  ns.data.steel = ns.data.steel || {};

  var BASE_STOCK_LENGTHS = [5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000];
  var STOCK_EXCLUDE_BY_KIND = {
    'H形鋼': [5500]
  };

  function getAvailableSTD(kind, specName) {
    var steelRegistry = ns.data.steel;
    if (steelRegistry && typeof steelRegistry.getStockLengthsByType === 'function') {
      var registryLengths = steelRegistry.getStockLengthsByType(kind, specName || '');
      if (Array.isArray(registryLengths) && registryLengths.length) {
        return registryLengths.slice();
      }
    }

    if (typeof global.getDefaultStockLengths === 'function') {
      return global.getDefaultStockLengths(kind, specName || '');
    }

    var exclude = STOCK_EXCLUDE_BY_KIND[kind] || [];
    return BASE_STOCK_LENGTHS.filter(function(length) {
      return exclude.indexOf(length) === -1;
    });
  }

  function getDynamicStdLengths(kind, spec) {
    if (typeof global.getKindSTD === 'function') {
      return global.getKindSTD(kind, spec);
    }
    return getAvailableSTD(kind, spec);
  }

  function buildUnlimitedStockPool(kind, spec) {
    return getDynamicStdLengths(kind, spec).map(function(length) {
      return { sl: length, max: Infinity };
    });
  }

  ns.data.steel.BASE_STOCK_LENGTHS = BASE_STOCK_LENGTHS.slice();
  ns.data.steel.getAvailableSTD = getAvailableSTD;
  ns.data.steel.getDynamicStdLengths = getDynamicStdLengths;
  ns.data.steel.buildUnlimitedStockPool = buildUnlimitedStockPool;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
