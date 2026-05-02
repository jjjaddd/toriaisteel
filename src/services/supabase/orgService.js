// ============================================================
// toriai-org-service.js
// 事業所（organization）の CRUD ＋ 招待・移譲
// window.Toriai.org として公開
// ============================================================
(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};

  function _client() {
    if (ns.auth && typeof ns.auth._getClient === 'function') return ns.auth._getClient();
    return global.supabaseClient || null;
  }

  function _err(msg) { return new Error(msg); }

  // ── 現在選択中の事業所 ───────────────────────────────────
  var ACTIVE_ORG_KEY = 'toriai_active_org_id';
  function getActiveOrgId() {
    try { return localStorage.getItem(ACTIVE_ORG_KEY) || null; } catch(e) { return null; }
  }
  function setActiveOrgId(orgId) {
    try {
      if (orgId) localStorage.setItem(ACTIVE_ORG_KEY, orgId);
      else localStorage.removeItem(ACTIVE_ORG_KEY);
    } catch(e) {}
    try {
      global.dispatchEvent(new CustomEvent('toriai:active-org-changed', { detail: { orgId: orgId }}));
    } catch(e) {}
  }

  // ── 自分が所属する事業所一覧 ─────────────────────────────
  // returns: [{ org_id, name, short_id, role, plan, seat_limit, archived_at, joined_at }]
  function listMyOrgs() {
    var c = _client();
    if (!c) return Promise.reject(_err('Supabase 未初期化'));
    return c.from('org_members')
      .select('role, joined_at, organizations:org_id (id, name, short_id, plan, seat_limit, archived_at, created_at)')
      .order('joined_at', { ascending: true })
      .then(function(res) {
        if (res.error) throw res.error;
        return (res.data || []).map(function(row) {
          var o = row.organizations || {};
          return {
            org_id: o.id,
            name: o.name,
            short_id: o.short_id,
            role: row.role,
            plan: o.plan,
            seat_limit: o.seat_limit,
            archived_at: o.archived_at,
            created_at: o.created_at,
            joined_at: row.joined_at
          };
        }).filter(function(o) { return !!o.org_id; });
      });
  }

  // ── 事業所を新規作成（自分がオーナー） ───────────────────
  // trigger で作成者が Owner として org_members に入る
  function createOrg(name) {
    var c = _client();
    if (!c) return Promise.reject(_err('Supabase 未初期化'));
    if (!name || !name.trim()) return Promise.reject(_err('事業所名を入力してください'));
    return c.auth.getSession().then(function(sessionRes) {
      var session = sessionRes && sessionRes.data ? sessionRes.data.session : null;
      if (!session || !session.user) throw _err('ログイン状態を確認できません。再ログインしてください');
      return c.rpc('create_organization', { p_name: name.trim() });
    })
      .then(function(res) {
        if (res.error) throw res.error;
        return Array.isArray(res.data) ? res.data[0] : res.data;
      });
  }

  function renameOrg(orgId, name) {
    var c = _client();
    if (!c) return Promise.reject(_err('Supabase 未初期化'));
    return c.from('organizations')
      .update({ name: name })
      .eq('id', orgId)
      .select()
      .maybeSingle()
      .then(function(res) {
        if (res.error) throw res.error;
        return res.data;
      });
  }

  // ── メンバー一覧 ────────────────────────────────────────
  function listMembers(orgId) {
    var c = _client();
    if (!c) return Promise.reject(_err('Supabase 未初期化'));
    return c.from('org_members')
      .select('user_id, role, joined_at')
      .eq('org_id', orgId)
      .order('joined_at', { ascending: true })
      .then(function(res) {
        if (res.error) throw res.error;
        return (res.data || []).map(function(m) {
          return {
            user_id: m.user_id,
            role: m.role,
            joined_at: m.joined_at,
            display_name: m.role === 'owner' ? 'オーナー' : 'メンバー',
            email: ''
          };
        });
      });
  }

  function removeMember(orgId, userId) {
    var c = _client();
    if (!c) return Promise.reject(_err('Supabase 未初期化'));
    return c.from('org_members')
      .delete()
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .then(function(res) {
        if (res.error) throw res.error;
        return true;
      });
  }

  // ── 招待を発行 ──────────────────────────────────────────
  // email は任意。既存DBでも動くよう、6桁コードと期限はアプリ側でも入れる
  function createInvitation(orgId, email) {
    var c = _client();
    if (!c) return Promise.reject(_err('Supabase 未初期化'));
    var expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    var payload = {
      org_id: orgId,
      code: String(Math.floor(Math.random() * 1000000)).padStart(6, '0'),
      expires_at: expiresAt
    };
    if (email && email.trim()) payload.email = email.trim().toLowerCase();
    return c.from('invitations')
      .insert(payload)
      .select('id, code, email, expires_at, created_at')
      .single()
      .then(function(res) {
        if (res.error) throw res.error;
        return res.data;
      });
  }

  function listInvitations(orgId) {
    var c = _client();
    if (!c) return Promise.reject(_err('Supabase 未初期化'));
    return c.from('invitations')
      .select('id, code, email, expires_at, accepted_at, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .then(function(res) {
        if (res.error) throw res.error;
        return res.data || [];
      });
  }

  function revokeInvitation(invitationId) {
    var c = _client();
    if (!c) return Promise.reject(_err('Supabase 未初期化'));
    return c.from('invitations')
      .delete()
      .eq('id', invitationId)
      .then(function(res) {
        if (res.error) throw res.error;
        return true;
      });
  }

  // ── 招待コードを受け取る ────────────────────────────────
  // RPC accept_invitation(p_code text) を使う
  function acceptInvitation(code) {
    var c = _client();
    if (!c) return Promise.reject(_err('Supabase 未初期化'));
    if (!code) return Promise.reject(_err('コードを入力してください'));
    return c.rpc('accept_invitation', { p_code: String(code).trim() })
      .then(function(res) {
        if (res.error) throw res.error;
        return res.data; // 追加された org_id
      });
  }

  // ── オーナー移譲 ────────────────────────────────────────
  function transferOwnership(orgId, newOwnerUserId) {
    var c = _client();
    if (!c) return Promise.reject(_err('Supabase 未初期化'));
    return c.rpc('transfer_ownership', { p_org: orgId, p_new_owner: newOwnerUserId })
      .then(function(res) {
        if (res.error) throw res.error;
        return true;
      });
  }

  // ── 事業所アーカイブ（論理削除） ────────────────────────
  function archiveOrg(orgId) {
    var c = _client();
    if (!c) return Promise.reject(_err('Supabase 未初期化'));
    return c.from('organizations')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', orgId)
      .then(function(res) {
        if (res.error) throw res.error;
        return true;
      });
  }

  // ── 自分の現在のロール ──────────────────────────────────
  function getMyRole(orgId) {
    return listMyOrgs().then(function(orgs) {
      var hit = orgs.filter(function(o) { return o.org_id === orgId; })[0];
      return hit ? hit.role : null;
    });
  }

  ns.org = {
    getActiveOrgId: getActiveOrgId,
    setActiveOrgId: setActiveOrgId,
    listMyOrgs: listMyOrgs,
    createOrg: createOrg,
    renameOrg: renameOrg,
    listMembers: listMembers,
    removeMember: removeMember,
    createInvitation: createInvitation,
    listInvitations: listInvitations,
    revokeInvitation: revokeInvitation,
    acceptInvitation: acceptInvitation,
    transferOwnership: transferOwnership,
    archiveOrg: archiveOrg,
    getMyRole: getMyRole
  };
})(window);
