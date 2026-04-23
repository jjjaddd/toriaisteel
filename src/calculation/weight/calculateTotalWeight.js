(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.calculation = ns.calculation || {};
  ns.calculation.weight = ns.calculation.weight || {};

  function calculateTotalWeight(rows) {
    var calculateWeight = ns.calculation.weight.calculateWeight;
    return (rows || []).reduce(function(total, row) {
      return total + calculateWeight(row);
    }, 0);
  }

  ns.calculation.weight.calculateTotalWeight = calculateTotalWeight;
})(window);
