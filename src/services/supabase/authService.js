// ============================================================
// toriai-auth-service.js
// Supabase Auth の薄いラッパ
// - email + password のみ
// - 画面側はこのファイルの関数だけ叩けば済むようにする
// - window.Toriai.auth として公開
// ============================================================
(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};

  function getClient() {
    // supabase-client.js で作られる既存グローバルをそのまま使う
    if (global.supabaseClient && typeof global.supabaseClient.auth === 'object') {
      return global.supabaseClient;
    }
    // fallback: services.supabase.createClient() を使う
    if (ns.services && ns.services.supabase && typeof ns.services.supabase.createClient === 'function') {
      var c = ns.services.supabase.createClient();
      if (c) global.supabaseClient = c;
      return c;
    }
    return null;
  }

  function _ready() {
    var c = getClient();
    return !!(c && c.auth);
  }

  // ── サインアップ ─────────────────────────────────────────
  function signUp(email, password, displayName) {
    if (!_ready()) return Promise.reject(new Error('Supabase 未初期化'));
    return getClient().auth.signUp({
      email: email,
      password: password,
      options: {
        data: { display_name: displayName || '' }
      }
    }).then(function(res) {
      if (res.error) throw res.error;
      return res.data;
    });
  }

  // ── ログイン ─────────────────────────────────────────────
  function signIn(email, password) {
    if (!_ready()) return Promise.reject(new Error('Supabase 未初期化'));
    return getClient().auth.signInWithPassword({
      email: email,
      password: password
    }).then(function(res) {
      if (res.error) throw res.error;
      return res.data;
    });
  }

  // ── ログアウト ───────────────────────────────────────────
  function signOut() {
    if (!_ready()) return Promise.resolve();
    return getClient().auth.signOut().then(function(res) {
      if (res && res.error) throw res.error;
      return true;
    });
  }

  // ── パスワード再設定メール ───────────────────────────────
  function resetPassword(email, redirectTo) {
    if (!_ready()) return Promise.reject(new Error('Supabase 未初期化'));
    return getClient().auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || global.location.origin
    }).then(function(res) {
      if (res.error) throw res.error;
      return true;
    });
  }

  // ── パスワード更新（再設定メールから戻ってきた時） ───────
  function updatePassword(newPassword) {
    if (!_ready()) return Promise.reject(new Error('Supabase 未初期化'));
    return getClient().auth.updateUser({ password: newPassword })
      .then(function(res) {
        if (res.error) throw res.error;
        return res.data;
      });
  }

  // ── 現在ユーザー取得 ─────────────────────────────────────
  function getUser() {
    if (!_ready()) return Promise.resolve(null);
    return getClient().auth.getUser().then(function(res) {
      if (res.error) return null;
      return res.data ? res.data.user : null;
    });
  }

  function getSession() {
    if (!_ready()) return Promise.resolve(null);
    return getClient().auth.getSession().then(function(res) {
      if (res.error) return null;
      return res.data ? res.data.session : null;
    });
  }

  // ── 認証状態の変化を購読 ─────────────────────────────────
  // cb(event, session) event = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY'
  function onAuthStateChange(cb) {
    if (!_ready()) return { unsubscribe: function() {} };
    var sub = getClient().auth.onAuthStateChange(function(event, session) {
      try { cb(event, session); } catch(e) { console.warn('[auth] listener error', e); }
    });
    return {
      unsubscribe: function() {
        if (sub && sub.data && sub.data.subscription && sub.data.subscription.unsubscribe) {
          sub.data.subscription.unsubscribe();
        }
      }
    };
  }

  // ── プロフィール取得（profiles テーブル） ────────────────
  function getProfile() {
    if (!_ready()) return Promise.resolve(null);
    return getUser().then(function(user) {
      if (!user) return null;
      return getClient().from('profiles')
        .select('id, display_name, email, created_at')
        .eq('id', user.id)
        .maybeSingle()
        .then(function(res) {
          if (res.error) return null;
          return res.data;
        });
    });
  }

  function updateProfile(patch) {
    if (!_ready()) return Promise.reject(new Error('Supabase 未初期化'));
    return getUser().then(function(user) {
      if (!user) throw new Error('未ログイン');
      var payload = {};
      if (typeof patch.display_name === 'string') payload.display_name = patch.display_name;
      return getClient().from('profiles')
        .update(payload)
        .eq('id', user.id)
        .select()
        .maybeSingle()
        .then(function(res) {
          if (res.error) throw res.error;
          return res.data;
        });
    });
  }

  ns.auth = ns.auth || {};
  ns.auth.signUp = signUp;
  ns.auth.signIn = signIn;
  ns.auth.signOut = signOut;
  ns.auth.resetPassword = resetPassword;
  ns.auth.updatePassword = updatePassword;
  ns.auth.getUser = getUser;
  ns.auth.getSession = getSession;
  ns.auth.onAuthStateChange = onAuthStateChange;
  ns.auth.getProfile = getProfile;
  ns.auth.updateProfile = updateProfile;
  ns.auth._getClient = getClient;
})(window);
