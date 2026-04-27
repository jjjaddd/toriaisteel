var _publicConfig = window.Toriai &&
  window.Toriai.services &&
  window.Toriai.services.config &&
  typeof window.Toriai.services.config.getPublicConfig === 'function'
  ? window.Toriai.services.config.getPublicConfig()
  : {};

var SUPABASE_URL = _publicConfig.supabaseUrl || '';
var SUPABASE_KEY = _publicConfig.supabaseAnonKey || '';

// window.supabase はCDNのライブラリ本体。クライアントは別名で作成
var supabaseClient = window.Toriai &&
  window.Toriai.services &&
  window.Toriai.services.supabase &&
  typeof window.Toriai.services.supabase.createClient === 'function'
  ? window.Toriai.services.supabase.createClient()
  : null;
