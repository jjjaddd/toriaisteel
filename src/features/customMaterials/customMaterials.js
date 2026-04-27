// custom-materials.js
// ユーザー定義のカスタム鋼材を保存し、data 中心の取得口へ反映する。

var _customMaterials = [];
window._customMaterials = _customMaterials;

function cmEscapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function syncCustomMaterialsGlobal() {
  window._customMaterials = _customMaterials;
}

function rebuildCustomSteelView() {
  syncCustomMaterialsGlobal();
}

function loadCustomMaterials() {
  try {
    _customMaterials = JSON.parse(localStorage.getItem('toriai_custom_materials') || '[]');
    if (!Array.isArray(_customMaterials)) _customMaterials = [];
  } catch (e) {
    _customMaterials = [];
  }
  rebuildCustomSteelView();

  if (typeof sbReady === 'function' && sbReady()) {
    var deviceId = typeof getDeviceId === 'function' ? getDeviceId() : null;
    if (!deviceId) return;
    supabaseClient.from('custom_materials')
      .select('data')
      .eq('device_id', deviceId)
      .maybeSingle()
      .then(function(res) {
        if (res.data && Array.isArray(res.data.data)) {
          _customMaterials = res.data.data;
          try { localStorage.setItem('toriai_custom_materials', JSON.stringify(_customMaterials)); } catch (e) {}
          rebuildCustomSteelView();
          if (typeof updateCustomCount === 'function') updateCustomCount();
        }
      });
  }
}

function mergeCustomToSTEEL() {
  rebuildCustomSteelView();
}

function saveCustomMaterial(kind, spec, kgm) {
  var entry = {
    id: Date.now().toString(36),
    kind: kind,
    spec: spec,
    kgm: kgm,
    createdAt: new Date().toISOString()
  };
  _customMaterials.push(entry);
  syncCustomMaterialsGlobal();
  try { localStorage.setItem('toriai_custom_materials', JSON.stringify(_customMaterials)); } catch (e) {}
  if (typeof sbUpsert === 'function') sbUpsert('custom_materials', _customMaterials);
  rebuildCustomSteelView();
  return entry;
}

function deleteCustomMaterial(id) {
  _customMaterials = _customMaterials.filter(function(item) { return item.id !== id; });
  syncCustomMaterialsGlobal();
  try { localStorage.setItem('toriai_custom_materials', JSON.stringify(_customMaterials)); } catch (e) {}
  if (typeof sbUpsert === 'function') sbUpsert('custom_materials', _customMaterials);
  rebuildCustomSteelView();
}

function renderCustomMaterialsPanel() {
  var panel = document.getElementById('customMaterialsPanel');
  if (!panel) return;

  var steelApi = window.Toriai && window.Toriai.data && window.Toriai.data.steel;
  var kinds = steelApi && typeof steelApi.getAllKinds === 'function'
    ? steelApi.getAllKinds()
    : [];

  var kindOptions = kinds
    .map(function(kind) {
      return '<option value="' + cmEscapeHtml(kind) + '">' + cmEscapeHtml(kind) + '</option>';
    })
    .join('');

  var rows = _customMaterials.length
    ? _customMaterials.map(function(item) {
        return '<tr>' +
          '<td style="padding:6px 8px;font-size:12px">' + cmEscapeHtml(item.kind) + '</td>' +
          '<td style="padding:6px 8px;font-size:12px;font-weight:600">' + cmEscapeHtml(item.spec) + '</td>' +
          '<td style="padding:6px 8px;font-size:12px;text-align:right">' + cmEscapeHtml(item.kgm) + '</td>' +
          '<td style="padding:4px;text-align:center">' +
            '<button onclick="deleteCustomMaterial(\'' + cmEscapeHtml(item.id) + '\');renderCustomMaterialsPanel()" ' +
              'style="background:#fee2e2;color:#dc2626;border:none;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer">削除</button>' +
          '</td></tr>';
      }).join('')
    : '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:16px;font-size:12px">カスタム鋼材はまだありません</td></tr>';

  panel.innerHTML =
    '<div style="margin-bottom:12px">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 80px auto;gap:8px;align-items:end">' +
        '<div><label style="font-size:11px;color:#666;display:block;margin-bottom:3px">種類</label>' +
          '<select id="cmKind" style="width:100%;padding:7px 8px;border:1px solid #d4d4dc;border-radius:8px;font-size:12px;font-family:inherit">' +
            '<option value="">選択...</option>' + kindOptions +
            '<option value="__new__">新しい種類...</option>' +
          '</select></div>' +
        '<div><label style="font-size:11px;color:#666;display:block;margin-bottom:3px">規格名</label>' +
          '<input id="cmSpec" type="text" placeholder="例: FB-100×6" ' +
            'style="width:100%;padding:7px 8px;border:1px solid #d4d4dc;border-radius:8px;font-size:12px;box-sizing:border-box;font-family:inherit"></div>' +
        '<div><label style="font-size:11px;color:#666;display:block;margin-bottom:3px">kg/m</label>' +
          '<input id="cmKgm" type="number" step="0.01" min="0" placeholder="例: 7.07" ' +
            'style="width:100%;padding:7px 8px;border:1px solid #d4d4dc;border-radius:8px;font-size:12px;box-sizing:border-box;font-family:inherit"></div>' +
        '<button onclick="cmAdd()" ' +
          'style="padding:7px 14px;background:#333333;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap">追加</button>' +
      '</div>' +
      '<div id="cmNewKindWrap" style="display:none;margin-top:8px">' +
        '<label style="font-size:11px;color:#666;display:block;margin-bottom:3px">新しい種類名</label>' +
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

  var kindSel = document.getElementById('cmKind');
  if (kindSel) {
    kindSel.onchange = function() {
      var wrap = document.getElementById('cmNewKindWrap');
      if (wrap) wrap.style.display = this.value === '__new__' ? 'block' : 'none';
    };
  }
}

function cmAdd() {
  var kindSel = document.getElementById('cmKind');
  var specEl = document.getElementById('cmSpec');
  var kgmEl = document.getElementById('cmKgm');
  var newKindEl = document.getElementById('cmNewKind');
  if (!kindSel || !specEl || !kgmEl) return;

  var kind = kindSel.value === '__new__'
    ? (newKindEl ? newKindEl.value.trim() : '')
    : kindSel.value;
  var spec = specEl.value.trim();
  var kgm = parseFloat(kgmEl.value);

  if (!kind) { alert('種類を選択してください'); return; }
  if (!spec) { alert('規格名を入力してください'); return; }
  if (isNaN(kgm) || kgm <= 0) { alert('kg/m を正しく入力してください'); return; }

  saveCustomMaterial(kind, spec, kgm);
  specEl.value = '';
  kgmEl.value = '';
  if (newKindEl) newKindEl.value = '';
  renderCustomMaterialsPanel();
  if (typeof updateCustomCount === 'function') updateCustomCount();
  if (typeof showToast === 'function') showToast('＋ ' + kind + ' ' + spec + ' を追加しました');
}
