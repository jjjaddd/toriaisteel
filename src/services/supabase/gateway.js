(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.services = ns.services || {};

  function createClient() {
    if (!global.supabase || typeof global.supabase.createClient !== 'function') return null;

    var config = ns.services.config && ns.services.config.getPublicConfig
      ? ns.services.config.getPublicConfig()
      : null;

    if (!config || !config.supabaseUrl || !config.supabaseAnonKey) return null;
    return global.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  ns.services.supabase = {
    createClient: createClient
  };
})(window);
