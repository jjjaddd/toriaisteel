(function(global) {
  'use strict';

  if (global.Toriai) return;

  var Toriai = {
    version: 'v1.0.5',
    ui: {},
    calculation: {},
    data: {
      steel: {}
    },
    storage: {},
    auth: {},
    inventory: {},
    services: {},
    utils: {}
  };

  global.Toriai = Toriai;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
