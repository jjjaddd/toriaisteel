var _lastRegisteredRemnantSignature = '';



function autoSyncResultRemnants(resultData) {
  if (!resultData || typeof extractRemnants !== 'function') return;
  var remnants = extractRemnants(resultData).filter(function(item) { return item && item.len; });
  if (!remnants.length) return;
  var signature = JSON.stringify(remnants.map(function(item) { return [item.kind, item.spec, item.len]; }).sort());
  if (_lastRegisteredRemnantSignature === signature) return;
  _lastRegisteredRemnantSignature = signature;
  registerRemnants(remnants);
}

function confirmCutDone() {
  var modal = document.getElementById('cutDoneModal');
  var kind = modal._kind;
  var spec = modal._spec;
  var items = modal._items || [];
  var endMats = modal._endMats || {};
  var label = (document.getElementById('cdLabel') ? document.getElementById('cdLabel').value.trim() : '');
  items.forEach(function(len) {
    var cb = document.getElementById('cd_' + len);
    if (cb && cb.checked) addToInventory(kind, spec, len, endMats[len], label);
  });
  modal.style.display = 'none';
  buildInventoryDropdown();
  renderInventoryPage();
  syncInventoryToRemnants();
  alert('在庫に登録しました。');
}

function isStdStockLength(length) {
  return Array.isArray(STD) && STD.indexOf(length) >= 0;
}

function buildCutSourceLabel(slLen) {
  return isStdStockLength(slLen) ? slLen.toLocaleString() + 'mm' : '残材（L=' + slLen.toLocaleString() + 'mm）より切断';
}

function formatMaterialTotalWeightKg(value) {
  var num = Number(value);
  if (!isFinite(num) || num <= 0) return '—';
  return (Math.round(num * 10) / 10).toLocaleString() + ' kg';
}




document.addEventListener('DOMContentLoaded', function() {
  init();
  // カスタム鋼材ロード
  if (typeof loadCustomMaterials === 'function') loadCustomMaterials();
  if (typeof renderCustomMaterialsPanel === 'function') renderCustomMaterialsPanel();
  // Supabase → localStorage 起動時同期
  if (typeof sbInitSync === 'function') {
    sbInitSync().then(function() {
      if (typeof renderHistory === 'function') renderHistory();
      if (typeof renderInventoryPage === 'function') renderInventoryPage();
      if (typeof loadCustomMaterials === 'function') loadCustomMaterials();
      if (typeof renderCustomMaterialsPanel === 'function') renderCustomMaterialsPanel();
    });
  }

  // 履歴・在庫タブ内のinput/selectでEnterキーを押したら次の要素へ
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter') return;
    var el = e.target;
    var tag = el.tagName;
    if (tag !== 'INPUT' && tag !== 'SELECT') return;
    // 部材リストはptEnterで処理するので除外
    if (el.id && (el.id.indexOf('pl') === 0 || el.id.indexOf('pq') === 0)) return;
    // textarea除外
    if (el.type === 'textarea') return;

    e.preventDefault();
    // フォーカス可能な要素を順に取得して次へ
    var focusable = Array.from(document.querySelectorAll(
      'input:not([disabled]):not([readonly]):not([type=hidden]), select:not([disabled]), button:not([disabled])'
    )).filter(function(x) {
      return x.offsetParent !== null; // 表示されているもののみ
    });
    var idx = focusable.indexOf(el);
    if (idx >= 0 && idx < focusable.length - 1) {
      focusable[idx + 1].focus();
    }
  });
});
document.addEventListener('input', function(e) {
  if (e.target.id === 'kgm') updKg();
});

var MANUAL_REMNANTS_KEY = 'toriai_manual_remnants_v2';
var INVENTORY_REMNANT_USAGE_KEY = 'toriai_inventory_remnant_usage_v2';

