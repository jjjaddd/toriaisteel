(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.calculation = ns.calculation || {};
  ns.calculation.common = ns.calculation.common || {};

  function normalizePieceInputs(rows) {
    return (rows || [])
      .map(function(row) {
        return {
          length: Number(row && row.length),
          qty: Number(row && row.qty),
          zone: row && row.zone ? String(row.zone).trim() : ''
        };
      })
      .filter(function(row) {
        return Number.isFinite(row.length) && row.length > 0 && Number.isFinite(row.qty) && row.qty > 0;
      });
  }

  ns.calculation.common.normalizePieceInputs = normalizePieceInputs;
})(window);
