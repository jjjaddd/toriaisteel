(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.services = ns.services || {};

  var fallbackConfig = {
    supabaseUrl: 'https://pryogyuclybetietopjm.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByeW9neXVjbHliZXRpZXRvcGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODMyNDQsImV4cCI6MjA5MTY1OTI0NH0.t6duDOgfIKzKlBnz1W4u6OZ8NFRygjYZwIShKuBVX1M'
  };

  function getPublicConfig() {
    var runtime = global.__TORIAI_PUBLIC_CONFIG__ || {};
    return {
      supabaseUrl: runtime.supabaseUrl || fallbackConfig.supabaseUrl,
      supabaseAnonKey: runtime.supabaseAnonKey || fallbackConfig.supabaseAnonKey
    };
  }

  ns.services.config = {
    getPublicConfig: getPublicConfig
  };
})(window);
