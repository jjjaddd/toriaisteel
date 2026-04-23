(function(global) {
  'use strict';

  if (global.Toriai) return;

  var Toriai = {
    version: 'v1.0.4',
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
})(window);
