function getInventoryValidationApi() {
  return window.Toriai && window.Toriai.utils && window.Toriai.utils.validation
    ? window.Toriai.utils.validation
    : null;
}

function getInventoryUiApi() {
  return window.Toriai && window.Toriai.ui ? window.Toriai.ui.inventory : null;
}

function appendInventoryOption(selectEl, value, label) {
  var option = document.createElement('option');
  option.value = value;
  option.textContent = label == null ? value : label;
  selectEl.appendChild(option);
}

function buildInvFilterKind() {
  var sel = document.getElementById('invFilterKind');
  if (!sel) return;
  var kinds = getAppSteelKinds();
  sel.innerHTML = '';
  appendInventoryOption(sel, '', 'すべて');
  kinds.forEach(function(k){ appendInventoryOption(sel, k, k); });
  buildInvFilterSpec();
}

function buildInvFilterSpec() {
  var kindSel = document.getElementById('invFilterKind');
  var specSel = document.getElementById('invFilterSpec');
  if (!specSel) return;
  var kind = kindSel ? kindSel.value : '';
  var specs = kind ? getAppSteelRows(kind).map(function(s){return s[0];}) : [];
  // 在庫にある規格も追加
  var inv = getInventory();
  inv.forEach(function(x){ if(x.spec && specs.indexOf(x.spec)<0) specs.push(x.spec); });
  specSel.innerHTML = '';
  appendInventoryOption(specSel, '', 'すべて');
  specs.forEach(function(s){ appendInventoryOption(specSel, s, s); });
  renderInventoryPage();
}

// ── 在庫ページ描画（フィルタ付き） ──

// ============================================================
// 在庫管理UI
// ============================================================
function buildInvAddKind() {
  var sel = document.getElementById('invAddKind');
  if (!sel) return;
  sel.innerHTML = '';
  getAppSteelKinds().forEach(function(k) {
    var o = document.createElement('option');
    o.value = k; o.textContent = k;
    if (k === curKind) o.selected = true;
    sel.appendChild(o);
  });
  buildInvAddSpec();
}

function buildInvAddSpec() {
  var kindSel = document.getElementById('invAddKind');
  var specSel = document.getElementById('invAddSpec');
  if (!kindSel || !specSel) return;
  var k = kindSel.value;
  specSel.innerHTML = '';
  getAppSteelRows(k).forEach(function(row) {
    var o = document.createElement('option');
    o.value = o.textContent = row[0]; specSel.appendChild(o);
  });
}

function manualAddInventory() {
  var validation = getInventoryValidationApi();
  var kind    = (document.getElementById('invAddKind')||{}).value||'';
  var spec    = (document.getElementById('invAddSpec')||{}).value||'';
  var lenValue = (document.getElementById('invAddLen')||{}).value;
  var qtyValue = (document.getElementById('invAddQty')||{}).value;
  var len = validation ? validation.parseIntegerInRange(lenValue, 1, 1000000, 0) : (parseInt(lenValue, 10) || 0);
  var qty = validation ? validation.parseIntegerInRange(qtyValue, 1, 999, 1) : (parseInt(qtyValue, 10) || 1);
  var companyValue = (document.getElementById('invAddCompany')||{}).value||'';
  var noteValue = (document.getElementById('invAddNote')||{}).value||'';
  var company = validation ? validation.sanitizeFreeText(companyValue, 120) : companyValue;
  var note = validation ? validation.sanitizeFreeText(noteValue, 500) : noteValue;
  if (!len || len <= 0) { alert('長さを入力してください'); return; }
  var inv = getInventory();
  for (var i=0; i<qty; i++) {
    inv.push({ id:Date.now()+i+Math.random(), len:len, spec:spec, kind:kind,
      company:company, note:note, addedDate:new Date().toLocaleDateString('ja-JP') });
  }
  saveInventory(inv);
  renderInventoryPage();
  var inventoryUi = getInventoryUiApi();
  if (inventoryUi && typeof inventoryUi.syncInventoryToRemnants === 'function') inventoryUi.syncInventoryToRemnants();
  updateInvDropdown();
  document.getElementById('invAddLen').value = '';
  document.getElementById('invAddQty').value = 1;
  if(document.getElementById('invAddCompany')) document.getElementById('invAddCompany').value='';
  if(document.getElementById('invAddNote')) document.getElementById('invAddNote').value='';
}

// 在庫→残材へボタン

// ── 規格選択時に在庫ドロップダウン更新 ──
function updateInvDropdown() {
  var inventoryUi = getInventoryUiApi();
  if (inventoryUi && typeof inventoryUi.buildInventoryDropdown === 'function') inventoryUi.buildInventoryDropdown();
}
