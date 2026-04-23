(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.calculation = ns.calculation || {};
  ns.calculation.weight = ns.calculation.weight || {};

  function calculateWeight(input) {
    var lengthMm = Number(input && input.lengthMm);
    var kgPerMeter = Number(input && input.kgPerMeter);
    var qty = Number(input && input.qty);
    if (!Number.isFinite(lengthMm) || !Number.isFinite(kgPerMeter) || !Number.isFinite(qty)) return 0;
    return (lengthMm / 1000) * kgPerMeter * qty;
  }

  ns.calculation.weight.calculateWeight = calculateWeight;
})(window);
