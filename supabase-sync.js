// ============================================================
// supabase-sync.js
// localStorage ↔ Supabase 同期レイヤー
// 認証なし・device_id でデータを識別
// ============================================================

// ── デバイスID（ブラウザ固有の識別子） ──────────────────────────
var _sbDeviceId = null;
function getDeviceId() {
  if (_sbDeviceId) return _sbDeviceId;
  var key = 'toriai_device_id';
  var id = localStorage.getItem(key);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(key, id);
  }
  _sbDeviceId = id;
  return id;
}

// ── Supabase が使えるか確認 ──────────────────────────────────
function sbReady() {
  return typeof window !== 'undefined' && window.supabase && typeof window.supabase.from === 'function';
}

// ── テーブル→localStorageキー マッピング ──────────────────────
var SB_TABLE_MAP = {
  cut_history:    'so_cut_hist_v2',
  inventory:      'so_inventory_v2',
  remnants:       'so_remnants',
  weight_history: 'so_history',
  weight_calcs:   'wSavedCalcs'
};

// ── Supabaseへ書き込み（非同期・fire-and-forget） ─────────────
function sbUpsert(table, data) {
  if (!sbReady()) return;
  var deviceId = getDeviceId();
  window.supabase
    .from(table)
    .upsert({ device_id: deviceId, data: data, updated_at: new Date().toISOString() },
            { onConflict: 'device_id' })
    .then(function(res) {
      if (res.error) console.warn('[Supabase] upsert error:', table, res.error.message);
    });
}

// ── Supabaseから読み込み ─────────────────────────────────────
function sbLoad(table) {
  if (!sbReady()) return Promise.resolve(null);
  var deviceId = getDeviceId();
  return window.supabase
    .from(table)
    .select('data, updated_at')
    .eq('device_id', deviceId)
    .maybeSingle()
    .then(function(res) {
      if (res.error || !res.data) return null;
      return res.data.data;
    })
    .catch(function() { return null; });
}

// ── 起動時同期: Supabase → localStorage ─────────────────────
// Supabaseに新しいデータがあればlocalStorageを上書き
function sbInitSync() {
  if (!sbReady()) return Promise.resolve();
  var tables = Object.keys(SB_TABLE_MAP);
  return Promise.all(tables.map(function(table) {
    return sbLoad(table).then(function(sbData) {
      if (sbData === null) return;
      var lsKey = SB_TABLE_MAP[table];
      try {
        localStorage.setItem(lsKey, JSON.stringify(sbData));
      } catch(e) {}
    });
  })).then(function() {
    console.log('[Supabase] 同期完了 device_id=' + getDeviceId());
  });
}
