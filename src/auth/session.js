(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.auth = ns.auth || {};

  function getAnonymousSession() {
    return {
      userId: null,
      officeId: null,
      role: 'anonymous'
    };
  }

  ns.auth.session = {
    getCurrentSession: getAnonymousSession
  };
})(window);
