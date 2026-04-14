// ============================================================
// custom-materials.js
// ユーザーが独自の鋼材サイズを追加できる機能
// Supabase + localStorage 同期
// ============================================================

var _customMaterials = [];

// ── 読み込み ─────────────────────────────────────────────────
function loadCustomMaterials() {
  // localStorageから即時ロード
  try {
    _customMaterials = JSON.parse(localStorage.getItem('toriai_custom_materials') || '[]');
  } catch(e) { _customMaterials = []; }

  // Supabaseから最新を取得
  if (typeof sbReady === 'function' && sbReady()) {
    var deviceId = typeof getDeviceId === 'function' ? getDeviceId() : null;
    if (!deviceId) return;
    supabaseClient.from('custom_materials')
      .select('data')
      .eq('device_id', deviceId)
      .maybeSingle()
      .then(function(res) {
        if (res.data && res.data.data) {
          _customMaterials = res.data.data;
          try { localStorage.setItem('toriai_custom_materials', JSON.stringify(_customMaterials)); } catch(e) {}
          mergeCustomToSTEEL();
        }
      });
  }
  mergeCustomToSTEEL();
}

// ── STEELに統合 ──────────────────────────────────────────────
function mergeCustomToSTEEL() {
  if (!window.STEEL || !_customMaterials.length) return;
  _customMaterials.forEach(function(m) {
    if (!m.kind || !m.spec || !m.kgm) return;
    if (!STEEL[m.kind]) STEEL[m.kind] = [];
    // 既存と重複しない場合のみ追加
    var exists = STEEL[m.kind].some(function(row) { return row[0] === m.spec; });
    if (!exists) STEEL[m.kind].push([m.spec, m.kgm, true]); // 3番目はカスタムフラグ
  });
}

// ── 保存 ─────────────────────────────────────────────────────
function saveCustomMaterial(kind, spec, kgm) {
  var entry = {
    id: Date.now().toString(36),
    kind: kind,
    spec: spec,
    kgm: kgm,
    createdAt: new Date().toISOString()
  };
  _customMaterials.push(entry);
  try { localStorage.setItem('toriai_custom_materials', JSON.stringify(_customMaterials)); } catch(e) {}
  if (typeof sbUpsert === 'function') sbUpsert('custom_materials', _customMaterials);
  mergeCustomToSTEEL();
  return entry;
}

// ── 削除 ─────────────────────────────────────────────────────
function deleteCustomMaterial(id) {
  _customMaterials = _customMaterials.filter(function(m) { return m.id !== id; });
  // STEELからも削除
  if (window.STEEL) {
    Object.keys(STEEL).forEach(function(kind) {
      STEEL[kind] = STEEL[kind].filter(function(row) {
        // カスタムフラグ(row[2])がtrueで、削除対象と一致するものを除外
        if (!row[2]) return true;
        var m = _customMaterials.find(function(c) { return c.spec === row[0] && c.kind === kind; });
        return !!m;
      });
      if (STEEL[kind].length === 0) delete STEEL[kind];
    });
  }
  try { localStorage.setItem('toriai_custom_materials', JSON.stringify(_customMaterials)); } catch(e) {}
  if (typeof sbUpsert === 'function') sbUpsert('custom_materials', _customMaterials);
}

// ── 管理UI描画 ─────────────────────────────────────────────
function renderCustomMaterialsPanel() {
  var panel = document.getElementById('customMaterialsPanel');
  if (!panel) return;

  var kindOptions = Object.keys(window.STEEL || {})
    .map(function(k) { return '<option value="' + k + '">' + k + '</option>'; }).join('');

  var rows = _customMaterials.length
    ? _customMaterials.map(function(m) {
        return '<tr>' +
          '<td style="padding:6px 8px;font-size:12px">' + m.kind + '</td>' +
          '<td style="padding:6px 8px;font-size:12px;font-weight:600">' + m.spec + '</td>' +
          '<td style="padding:6px 8px;font-size:12px;text-align:right">' + m.kgm + '</td>' +
          '<td style="padding:4px;text-align:center">' +
            '<button onclick="deleteCustomMaterial(\'' + m.id + '\');renderCustomMaterialsPanel()" ' +
              'style="background:#fee2e2;color:#dc2626;border:none;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer">削除</button>' +
          '</td></tr>';
      }).join('')
    : '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:16px;font-size:12px">カスタム鋼材なし</td></tr>';

  panel.innerHTML =
    '<div style="margin-bottom:12px">' +
      '<div style="font-size:13px;font-weight:700;margin-bottom:10px">＋ カスタム鋼材を追加</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 80px auto;gap:8px;align-items:end">' +
        '<div><label style="font-size:11px;color:#666;display:block;margin-bottom:3px">種類</label>' +
          '<select id="cmKind" style="width:100%;padding:7px 8px;border:1px solid #d4d4dc;border-radius:8px;font-size:12px;font-family:inherit">' +
            '<option value="">選択...</option>' + kindOptions +
            '<option value="__new__">新規種類...</option>' +
          '</select></div>' +
        '<div><label style="font-size:11px;color:#666;display:block;margin-bottom:3px">規格名</label>' +
          '<input id="cmSpec" type="text" placeholder="例: FB-100×9" ' +
            'style="width:100%;padding:7px 8px;border:1px solid #d4d4dc;border-radius:8px;font-size:12px;box-sizing:border-box;font-family:inherit"></div>' +
        '<div><label style="font-size:11px;color:#666;display:block;margin-bottom:3px">kg/m</label>' +
          '<input id="cmKgm" type="number" step="0.01" min="0" placeholder="例: 7.07" ' +
            'style="width:100%;padding:7px 8px;border:1px solid #d4d4dc;border-radius:8px;font-size:12px;box-sizing:border-box;font-family:inherit"></div>' +
        '<button onclick="cmAdd()" ' +
          'style="padding:7px 14px;background:#7c5ccc;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap">追加</button>' +
      '</div>' +
      '<div id="cmNewKindWrap" style="display:none;margin-top:8px">' +
        '<label style="font-size:11px;color:#666;display:block;margin-bottom:3px">新規種類名</label>' +
        '<input id="cmNewKind" type="text" placeholder="例: 特注角パイプ" ' +
          'style="width:100%;max-width:200px;padding:7px 8px;border:1px solid #d4d4dc;border-radius:8px;font-size:12px;box-sizing:border-box;font-family:inherit">' +
      '</div>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
      '<thead><tr style="border-bottom:2px solid #e0e0ea">' +
        '<th style="padding:6px 8px;text-align:left;font-size:11px;color:#888">種類</th>' +
        '<th style="padding:6px 8px;text-align:left;font-size:11px;color:#888">規格</th>' +
        '<th style="padding:6px 8px;text-align:right;font-size:11px;color:#888">kg/m</th>' +
        '<th></th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';

  // 新規種類入力の表示切替
  var kindSel = document.getElementById('cmKind');
  if (kindSel) {
    kindSel.onchange = function() {
      var wrap = document.getElementById('cmNewKindWrap');
      if (wrap) wrap.style.display = this.value === '__new__' ? 'block' : 'none';
    };
  }
}

function cmAdd() {
  var kindSel  = document.getElementById('cmKind');
  var specEl   = document.getElementById('cmSpec');
  var kgmEl    = document.getElementById('cmKgm');
  var newKindEl = document.getElementById('cmNewKind');
  if (!kindSel || !specEl || !kgmEl) return;

  var kind = kindSel.value === '__new__'
    ? (newKindEl ? newKindEl.value.trim() : '')
    : kindSel.value;
  var spec = specEl.value.trim();
  var kgm  = parseFloat(kgmEl.value);

  if (!kind)         { alert('種類を選択してください'); return; }
  if (!spec)         { alert('規格名を入力してください'); return; }
  if (isNaN(kgm) || kgm <= 0) { alert('kg/mを正しく入力してください'); return; }

  saveCustomMaterial(kind, spec, kgm);
  specEl.value = '';
  kgmEl.value  = '';
  renderCustomMaterialsPanel();
  if (typeof showToast === 'function') showToast('✅ ' + kind + ' ' + spec + ' を追加しました');
}
