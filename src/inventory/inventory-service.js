(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.inventory = ns.inventory || {};

  function buildInventoryKey(kind, spec) {
    return ['inventory', kind || '', spec || ''].join(':');
  }

  ns.inventory.service = {
    buildInventoryKey: buildInventoryKey
  };
})(window);
