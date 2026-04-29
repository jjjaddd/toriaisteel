// ============================================================
// toriai-org-storage.js
// 事業所スコープでの保存レイヤー（在庫・端材・カスタム材）
// 既存 supabase-sync.js は "device_id + JSONブロブ" 方式だったが、
// こちらは "org_id + 行指向" で RLS に乗る
//
// window.Toriai.orgStorage として公開
//
// 使い方:
//   orgStorage.saveInventory(items)            -> 現在の事業所に保存
//   orgStorage.loadInventory()                 -> 現在の事業所から読む
//   orgStorage.saveRemnants(items)
//   orgStorage.loadRemnants()
//   orgStorage.saveCustomMaterials(items, {shared: true})
//   orgStorage.loadCustomMaterials()
//   orgStorage.saveCustomStockLengths(map)     // { '山形鋼:L-50x50x6': [3500,...] }
//   orgStorage.loadCustomStockLengths()
//
// スコープ: 常に Toriai.org.getActiveOrgId() を使う
// オフライン時は localStorage に書き、復帰後にリトライ
// ============================================================
(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};

  function _client() {
    if (ns.auth && typeof ns.auth._getClient === 'function') return ns.auth._getClient();
    return global.supabaseClient || null;
  }
  function _activeOrg() {
    return ns.org ? ns.org.getActiveOrgId() : null;
  }
  function _ready() { return !!_client() && !!_activeOrg(); }

  // ── オフラインキュー ─────────────────────────────────────
  var QUEUE_KEY = 'toriai_sync_queue_v1';
  function _loadQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch(e) { return []; }
  }
  function _saveQueue(q) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch(e) {}
  }
  function _enqueue(op) {
    var q = _loadQueue(); q.push(Object.assign({ at: Date.now() }, op)); _saveQueue(q);
  }
  function _drain() {
    if (!_ready()) return Promise.resolve();
    var q = _loadQueue(); if (!q.length) return Promise.resolve();
    var remaining = [];
    return q.reduce(function(p, op) {
      return p.then(function() {
        return _dispatch(op).catch(function() { remaining.push(op); });
      });
    }, Promise.resolve()).then(function() {
      _saveQueue(remaining);
    });
  }
  function _dispatch(op) {
    switch (op.kind) {
      case 'saveInventory':        return _saveInventory(op.orgId, op.items);
      case 'saveRemnants':         return _saveRemnants(op.orgId, op.items);
      case 'saveCustomMaterials':  return _saveCustomMaterials(op.orgId, op.items, op.opts);
      case 'saveCustomStockLengths': return _saveCustomStockLengths(op.orgId, op.map);
      default: return Promise.resolve();
    }
  }

  // 起動時 + online 復帰時に流す
  global.addEventListener('online', _drain);
  global.addEventListener('toriai:active-org-changed', _drain);

  // ── inventory ───────────────────────────────────────────
  // items = [{ id?, spec, kind, length_mm, qty, note, project_id? }, ...]
  function _saveInventory(orgId, items) {
    var c = _client();
    // 方式: org 全体で置き換える（シンプル。差分同期は Phase B 後半）
    return c.from('inventory').delete().eq('org_id', orgId).then(function() {
      if (!items || !items.length) return { data: [] };
      var rows = items.map(function(it) {
        return {
          org_id: orgId,
          spec: it.spec || null,
          kind: it.kind || null,
          length_mm: it.length_mm != null ? Number(it.length_mm) : null,
          qty: it.qty != null ? Number(it.qty) : 0,
          note: it.note || null,
          project_id: it.project_id || null
        };
      });
      return c.from('inventory').insert(rows);
    }).then(function(res) {
      if (res && res.error) throw res.error;
      return true;
    });
  }
  function saveInventory(items) {
    var orgId = _activeOrg();
    if (!orgId) return Promise.resolve(false);
    if (!_client()) { _enqueue({ kind: 'saveInventory', orgId: orgId, items: items }); return Promise.resolve(false); }
    return _saveInventory(orgId, items).catch(function(e) {
      _enqueue({ kind: 'saveInventory', orgId: orgId, items: items });
      console.warn('[orgStorage] inventory save failed, queued', e);
      return false;
    });
  }
  function loadInventory() {
    var orgId = _activeOrg(); var c = _client();
    if (!orgId || !c) return Promise.resolve([]);
    return c.from('inventory')
      .select('id, spec, kind, length_mm, qty, note, project_id, updated_at')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .then(function(res) {
        if (res.error) throw res.error;
        return res.data || [];
      });
  }

  // ── remnants ────────────────────────────────────────────
  function _saveRemnants(orgId, items) {
    var c = _client();
    return c.from('remnants').delete().eq('org_id', orgId).then(function() {
      if (!items || !items.length) return { data: [] };
      var rows = items.map(function(it) {
        return {
          org_id: orgId,
          spec: it.spec || null,
          kind: it.kind || null,
          length_mm: Number(it.length_mm || 0),
          qty: Number(it.qty || 1),
          source_project_id: it.source_project_id || null,
          note: it.note || null
        };
      });
      return c.from('remnants').insert(rows);
    }).then(function(res) {
      if (res && res.error) throw res.error;
      return true;
    });
  }
  function saveRemnants(items) {
    var orgId = _activeOrg();
    if (!orgId) return Promise.resolve(false);
    if (!_client()) { _enqueue({ kind: 'saveRemnants', orgId: orgId, items: items }); return Promise.resolve(false); }
    return _saveRemnants(orgId, items).catch(function(e) {
      _enqueue({ kind: 'saveRemnants', orgId: orgId, items: items });
      console.warn('[orgStorage] remnants save failed, queued', e);
      return false;
    });
  }
  function loadRemnants() {
    var orgId = _activeOrg(); var c = _client();
    if (!orgId || !c) return Promise.resolve([]);
    return c.from('remnants')
      .select('id, spec, kind, length_mm, qty, source_project_id, note, updated_at')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .then(function(res) {
        if (res.error) throw res.error;
        return res.data || [];
      });
  }

  // ── custom materials ───────────────────────────────────
  // items = [{ kind, spec, dims, weight_per_m, shared }]
  function _saveCustomMaterials(orgId, items, opts) {
    var c = _client();
    var shared = !!(opts && opts.shared);
    // owner_user_id は個人保管のときに使う
    return ns.auth.getUser().then(function(user) {
      return c.from('custom_materials').delete()
        .eq('org_id', orgId).eq('shared', shared)
        .match(shared ? {} : { owner_user_id: user ? user.id : null })
        .then(function() {
          if (!items || !items.length) return { data: [] };
          var rows = items.map(function(it) {
            return {
              org_id: orgId,
              owner_user_id: shared ? null : (user ? user.id : null),
              kind: it.kind || null,
              spec: it.spec || null,
              dims: it.dims || null,
              weight_per_m: it.weight_per_m != null ? Number(it.weight_per_m) : null,
              shared: shared
            };
          });
          return c.from('custom_materials').insert(rows);
        });
    }).then(function(res) {
      if (res && res.error) throw res.error;
      return true;
    });
  }
  function saveCustomMaterials(items, opts) {
    var orgId = _activeOrg();
    if (!orgId) return Promise.resolve(false);
    if (!_client()) { _enqueue({ kind: 'saveCustomMaterials', orgId: orgId, items: items, opts: opts }); return Promise.resolve(false); }
    return _saveCustomMaterials(orgId, items, opts).catch(function(e) {
      _enqueue({ kind: 'saveCustomMaterials', orgId: orgId, items: items, opts: opts });
      console.warn('[orgStorage] customMaterials save failed, queued', e);
      return false;
    });
  }
  function loadCustomMaterials() {
    var orgId = _activeOrg(); var c = _client();
    if (!orgId || !c) return Promise.resolve([]);
    return c.from('custom_materials')
      .select('id, kind, spec, dims, weight_per_m, shared, owner_user_id, updated_at')
      .eq('org_id', orgId)
      .then(function(res) {
        if (res.error) throw res.error;
        return res.data || [];
      });
  }

  // ── custom stock lengths ───────────────────────────────
  // map: { 'kind:spec': [3500,4000,...] }
  function _saveCustomStockLengths(orgId, map) {
    var c = _client();
    return c.from('custom_stock_lengths').delete().eq('org_id', orgId).then(function() {
      var rows = [];
      Object.keys(map || {}).forEach(function(key) {
        var parts = String(key).split(':');
        var kind = parts[0] || null;
        var spec = parts.slice(1).join(':') || null;
        rows.push({
          org_id: orgId, kind: kind, spec: spec,
          lengths: (map[key] || []).map(Number)
        });
      });
      if (!rows.length) return { data: [] };
      return c.from('custom_stock_lengths').insert(rows);
    }).then(function(res) {
      if (res && res.error) throw res.error;
      return true;
    });
  }
  function saveCustomStockLengths(map) {
    var orgId = _activeOrg();
    if (!orgId) return Promise.resolve(false);
    if (!_client()) { _enqueue({ kind: 'saveCustomStockLengths', orgId: orgId, map: map }); return Promise.resolve(false); }
    return _saveCustomStockLengths(orgId, map).catch(function(e) {
      _enqueue({ kind: 'saveCustomStockLengths', orgId: orgId, map: map });
      console.warn('[orgStorage] customStockLengths save failed, queued', e);
      return false;
    });
  }
  function loadCustomStockLengths() {
    var orgId = _activeOrg(); var c = _client();
    if (!orgId || !c) return Promise.resolve({});
    return c.from('custom_stock_lengths')
      .select('kind, spec, lengths')
      .eq('org_id', orgId)
      .then(function(res) {
        if (res.error) throw res.error;
        var map = {};
        (res.data || []).forEach(function(r) {
          map[(r.kind || '') + ':' + (r.spec || '')] = r.lengths || [];
        });
        return map;
      });
  }

  // ── device_id 時代のデータを現在の事業所へ取り込む ──────
  // supabase-sync.js の SB_TABLE_MAP と同じキーから読む
  function migrateFromLocalStorage(options) {
    options = options || {};
    var orgId = _activeOrg();
    if (!orgId) return Promise.reject(new Error('事業所が選択されていません'));

    var plan = {
      inventory: options.inventory !== false,
      remnants: options.remnants !== false,
      customMaterials: options.customMaterials !== false
    };
    var tasks = [];

    if (plan.inventory) {
      try {
        var inv = JSON.parse(localStorage.getItem('so_inventory_v2') || 'null');
        if (inv && inv.items && inv.items.length) tasks.push(saveInventory(inv.items));
      } catch(e) {}
    }
    if (plan.remnants) {
      try {
        var rem = JSON.parse(localStorage.getItem('so_remnants') || 'null');
        if (rem && rem.items && rem.items.length) tasks.push(saveRemnants(rem.items));
      } catch(e) {}
    }
    if (plan.customMaterials) {
      try {
        var cm = JSON.parse(localStorage.getItem('toriai_custom_materials') || 'null');
        if (cm && cm.length) tasks.push(saveCustomMaterials(cm, { shared: false }));
      } catch(e) {}
    }
    return Promise.all(tasks).then(function() { return true; });
  }

  // ── すべて一括読み込み（起動時に便利） ──────────────────
  function loadAll() {
    return Promise.all([
      loadInventory(),
      loadRemnants(),
      loadCustomMaterials(),
      loadCustomStockLengths()
    ]).then(function(results) {
      return {
        inventory: results[0],
        remnants: results[1],
        customMaterials: results[2],
        customStockLengths: results[3]
      };
    });
  }

  ns.orgStorage = {
    saveInventory: saveInventory,
    loadInventory: loadInventory,
    saveRemnants: saveRemnants,
    loadRemnants: loadRemnants,
    saveCustomMaterials: saveCustomMaterials,
    loadCustomMaterials: loadCustomMaterials,
    saveCustomStockLengths: saveCustomStockLengths,
    loadCustomStockLengths: loadCustomStockLengths,
    loadAll: loadAll,
    migrateFromLocalStorage: migrateFromLocalStorage,
    _drainQueue: _drain
  };
})(window);
