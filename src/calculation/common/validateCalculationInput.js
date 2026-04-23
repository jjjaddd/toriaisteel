(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.calculation = ns.calculation || {};
  ns.calculation.common = ns.calculation.common || {};

  function validateCalculationInput(input) {
    var errors = [];
    if (!input || !Array.isArray(input.pieces) || !input.pieces.length) {
      errors.push('部材が入力されていません。');
    }
    if (!input || !Array.isArray(input.stocks) || !input.stocks.length) {
      errors.push('定尺が選択されていません。');
    }
    if (input && input.blade != null && (!Number.isFinite(Number(input.blade)) || Number(input.blade) < 0)) {
      errors.push('刃厚の値が不正です。');
    }
    return {
      ok: errors.length === 0,
      errors: errors
    };
  }

  ns.calculation.common.validateCalculationInput = validateCalculationInput;
})(window);
