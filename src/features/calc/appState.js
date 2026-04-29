(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.features = ns.features || {};
  ns.features.calc = ns.features.calc || {};

  global.ROWS = global.ROWS || 13;
  global.curKind = global.curKind || 'H形鋼';
  global._selectedRows = global._selectedRows || [];

  function getInventoryUi() {
    return ns.ui ? ns.ui.inventory : null;
  }

  ns.features.calc.state = {
    get rows() { return global.ROWS; },
    set rows(value) { global.ROWS = value; },
    get curKind() { return global.curKind; },
    set curKind(value) { global.curKind = value; },
    get selectedRows() { return global._selectedRows; },
    set selectedRows(value) { global._selectedRows = Array.isArray(value) ? value : []; },
    getInventoryUi: getInventoryUi
  };

  global.getInventoryUi = getInventoryUi;
})(window);
