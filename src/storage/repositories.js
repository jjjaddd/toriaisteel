(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  var keys = (ns.storage && ns.storage.keys) || {};
  var localStore = (ns.storage && ns.storage.localStore) || {};

  function makeJsonRepository(key, fallbackFactory) {
    return {
      load: function() {
        return localStore.readJson(key, fallbackFactory());
      },
      save: function(value) {
        return localStore.writeJson(key, value);
      },
      clear: function() {
        return localStore.remove(key);
      }
    };
  }

  ns.storage.repositories = {
    settings: makeJsonRepository(keys.settings, function() { return {}; }),
    remnants: makeJsonRepository(keys.remnants, function() { return []; }),
    cutHistory: makeJsonRepository(keys.cutHistory, function() { return []; }),
    inventory: makeJsonRepository(keys.inventory, function() { return []; }),
    cart: makeJsonRepository(keys.cart, function() { return []; }),
    weightSavedCalcs: makeJsonRepository(keys.weightSavedCalcs, function() { return []; }),
    customMaterials: makeJsonRepository(keys.customMaterials, function() { return []; })
  };
})(window);
