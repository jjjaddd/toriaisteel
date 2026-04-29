(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.services = ns.services || {};
  ns.services.supabase = ns.services.supabase || {};

  var cachedClient = null;

  function getConfig() {
    return ns.services.config && ns.services.config.getPublicConfig
      ? ns.services.config.getPublicConfig()
      : null;
  }

  function isConfigured() {
    var config = getConfig();
    return !!(config && config.supabaseUrl && config.supabaseAnonKey);
  }

  function createClient() {
    if (!global.supabase || typeof global.supabase.createClient !== 'function') return null;

    var config = getConfig();

    if (!config || !config.supabaseUrl || !config.supabaseAnonKey) return null;
    return global.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  function getClient() {
    if (!cachedClient) cachedClient = createClient();
    return cachedClient;
  }

  ns.services.supabase.getConfig = getConfig;
  ns.services.supabase.isConfigured = isConfigured;
  ns.services.supabase.createClient = createClient;
  ns.services.supabase.getClient = getClient;
})(window);
