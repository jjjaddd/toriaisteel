/**
 * storage.js  —  LocalStorage 永続化ロジック
 *
 * キー定数、設定保存/読込、切断履歴、残材在庫 DB をここに集約。
 * calc.js / main.js はこのファイルに依存する。
 */

// ── ストレージキー ───────────────────────────────────────
var LS_SETTINGS  = 'so_settings';
var LS_REMNANTS  = 'so_remnants';
var LS_HISTORY   = 'so_history';
var LS_MAX_HIST  = 10;

// ============================================================
// 残材在庫DB  key: so_inv_{種類}_{規格}  value: [{len,qty,date,label}]
// ============================================================



function setInventory(kind, spec, items) {
  try { localStorage.setItem(invKey(kind, spec), JSON.stringify(items)); } catch(e) {}
}

// 残材を在庫に追加
function addToInventory(kind, spec, len, qty, label) {
  var items = getInventory(kind, spec);
  var date  = new Date().toLocaleDateString('ja-JP');
  // 同じ長さ・同じ日付があればqtyをまとめる
  var found = items.find(function(it){ return it.len===len && it.date===date && it.label===(label||''); });
  if (found) { found.qty += qty; }
  else { items.push({len:len, qty:qty, date:date, label:label||'', id: Date.now()+Math.random()}); }
  items.sort(function(a,b){ return b.len-a.len; });
  setInventory(kind, spec, items);
}

// 在庫から消費（残材優先消費後の消し込み）
function consumeInventory(kind, spec, lenArr) {
  var items = getInventory(kind, spec);
  lenArr.forEach(function(len) {
    for (var i=0; i<items.length; i++) {
      if (items[i].len===len && items[i].qty>0) {
        items[i].qty--;
        if (items[i].qty<=0) items.splice(i,1);
        return;
      }
    }
  });
  setInventory(kind, spec, items);
}

// 在庫一覧（全規格）をflat配列で返す
function getAllInventory() {
  var result = [];
  try {
    for (var i=0; i<localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(LS_INV_PREFIX)!==0) continue;
      var items = JSON.parse(localStorage.getItem(k)||'[]');
      items.forEach(function(it){ result.push(Object.assign({},it,{_key:k})); });
    }
  } catch(e) {}
  return result;
}

// 切断履歴を保存

// 規格選択時：在庫を残材入力欄に反映するドロップダウン用データ
function legacyGetInventoryForCurrentSpec_v1() {
  var spec = document.getElementById('spec') ? document.getElementById('spec').value : '';
  var kind = curKind;
  var inv = getInventory();
  // 同じspec・kindのものをまとめて返す
  var filtered = inv.filter(function(x){ return x.spec===spec || x.kind===kind; });
  // len別に集計
  var grouped = {};
  filtered.forEach(function(x){
    var key = x.len + ':' + x.spec;
    if (!grouped[key]) grouped[key] = {len:x.len, spec:x.spec, kind:x.kind, qty:0, date:x.addedDate||'', label:x.note||''};
    grouped[key].qty++;
  });
  return Object.values(grouped).sort(function(a,b){return b.len-a.len;});
}

function saveSettings() {
  try {
    var obj = {
      blade:       document.getElementById('blade').value,
      endloss:     document.getElementById('endloss').value,
      minRemnantLen: document.getElementById('minRemnantLen').value,
      kind:        curKind,
      jobClient:   (document.getElementById('jobClient')||{}).value||'',
      jobName:     (document.getElementById('jobName')||{}).value||'',
      jobDeadline: (document.getElementById('jobDeadline')||{}).value||'',
      jobWorker:   (document.getElementById('jobWorker')||{}).value||'',
      stocks:      []
    };
    STD.forEach(function(sl, i) {
      obj.stocks.push({
        checked: document.getElementById('sc'+i).checked,
        max:     document.getElementById('sm'+i).value
      });
    });
    localStorage.setItem(LS_SETTINGS, JSON.stringify(obj));
  } catch(e) {}
}

function loadSettings() {
  try {
    var raw = localStorage.getItem(LS_SETTINGS);
    if (!raw) return;
    var obj = JSON.parse(raw);
    if (obj.blade)         document.getElementById('blade').value = obj.blade;
    if (obj.endloss)       document.getElementById('endloss').value = obj.endloss;
    if (obj.minRemnantLen) document.getElementById('minRemnantLen').value = obj.minRemnantLen;
    if (obj.stocks) {
      obj.stocks.forEach(function(s, i) {
        var cb = document.getElementById('sc'+i);
        var mx = document.getElementById('sm'+i);
        if (cb) cb.checked = s.checked;
        if (mx) mx.value = s.max;
        if (cb) togStk(i);
      });
    }
    if (obj.jobClient) { var el=document.getElementById('jobClient'); if(el)el.value=obj.jobClient; }
    if (obj.jobName)   { var el=document.getElementById('jobName');   if(el)el.value=obj.jobName; }
    if (obj.jobDeadline){var el=document.getElementById('jobDeadline');if(el)el.value=obj.jobDeadline;}
    if (obj.jobWorker) { var el=document.getElementById('jobWorker'); if(el)el.value=obj.jobWorker; }
    if (obj.kind && STEEL[obj.kind]) {
      curKind = obj.kind;
      document.querySelectorAll('.tbtn').forEach(function(b) {
        b.classList.toggle('on', b.querySelector('span') && b.querySelector('span').textContent === obj.kind);
      });
      buildSpec();
    }
  } catch(e) {}
}

function legacySaveRemnants_v1() {
  try {
    var list = [];
    for (var i = 0; i < remnantCount; i++) {
      var lEl = document.getElementById('remLen'+i);
      var qEl = document.getElementById('remQty'+i);
      if (!lEl) continue;
      var l = parseInt(lEl.value), q = parseInt(qEl.value)||1;
      if (l > 0) list.push({l:l, q:q});
    }
    localStorage.setItem(LS_REMNANTS, JSON.stringify(list));
  } catch(e) {}
}

function loadRemnants() {
  try {
    var raw = localStorage.getItem(LS_REMNANTS);
    if (!raw) return;
    var list = JSON.parse(raw);
    if (!list.length) return;
    // 既存の空行を削除してロード
    document.getElementById('remnantList').innerHTML = '';
    remnantCount = 0;
    list.forEach(function(item) {
      addRemnant();
      var i = remnantCount - 1;
      document.getElementById('remLen'+i).value = item.l;
      document.getElementById('remQty'+i).value = item.q;
    });
  } catch(e) {}
}

function savePiecesHistory() {
  try {
    var pieces = [];
    for (var i = 0; i < totalRows; i++) {
      var lEl = document.getElementById('pl'+i);
      var qEl = document.getElementById('pq'+i);
      if (!lEl) continue;
      var l = parseInt(lEl.value), q = parseInt(qEl.value);
      if (l > 0 && q > 0) pieces.push({l:l, q:q});
    }
    if (!pieces.length) return;
    var hist = getPiecesHistory();
    // 重複チェック
    var key = pieces.map(function(p){return p.l+':'+p.q;}).join(',');
    hist = hist.filter(function(h){
      return h.pieces.map(function(p){return p.l+':'+p.q;}).join(',') !== key;
    });
    hist.unshift({pieces:pieces, date:new Date().toLocaleDateString('ja-JP'), key:key});
    hist = hist.slice(0, LS_MAX_HIST);
    localStorage.setItem(LS_HISTORY, JSON.stringify(hist));
  } catch(e) {}
}

function getPiecesHistory() {
  try {
    var raw = localStorage.getItem(LS_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function loadPiecesFromHistory(idx) {
  var hist = getPiecesHistory();
  if (!hist[idx]) return;
  var pieces = hist[idx].pieces;
  // 既存クリア
  for (var i = 0; i < totalRows; i++) {
    var lEl = document.getElementById('pl'+i);
    var qEl = document.getElementById('pq'+i);
    if (lEl) lEl.value = '';
    if (qEl) qEl.value = '';
  }
  pieces.forEach(function(p, i) {
    if (i >= totalRows) return;
    document.getElementById('pl'+i).value = p.l;
    document.getElementById('pq'+i).value = p.q;
  });
  updKg();
  document.getElementById('histModal').style.display = 'none';
}


// ============================================================
// 在庫管理UI
// ============================================================
function buildInvAddKind() {
  var sel = document.getElementById('invAddKind');
  if (!sel) return;
  sel.innerHTML = '';
  Object.keys(STEEL).forEach(function(k) {
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
  (STEEL[k]||[]).forEach(function(row) {
    var o = document.createElement('option');
    o.value = o.textContent = row[0]; specSel.appendChild(o);
  });
}

function manualAddInventory() {
  var kind    = (document.getElementById('invAddKind')||{}).value||'';
  var spec    = (document.getElementById('invAddSpec')||{}).value||'';
  var len     = parseInt((document.getElementById('invAddLen')||{}).value)||0;
  var qty     = parseInt((document.getElementById('invAddQty')||{}).value)||1;
  var company = (document.getElementById('invAddCompany')||{}).value||'';
  var note    = (document.getElementById('invAddNote')||{}).value||'';
  if (!len || len <= 0) { alert('長さを入力してください'); return; }
  var inv = getInventory();
  for (var i=0; i<qty; i++) {
    inv.push({ id:Date.now()+i+Math.random(), len:len, spec:spec, kind:kind,
      company:company, note:note, addedDate:new Date().toLocaleDateString('ja-JP') });
  }
  saveInventory(inv);
  renderInventoryPage();
  syncInventoryToRemnants();
  updateInvDropdown();
  document.getElementById('invAddLen').value = '';
  document.getElementById('invAddQty').value = 1;
  if(document.getElementById('invAddCompany')) document.getElementById('invAddCompany').value='';
  if(document.getElementById('invAddNote')) document.getElementById('invAddNote').value='';
}

function clearAllInventory() {
  if (!confirm('全ての残材在庫を削除しますか？')) return;
  var keys = [];
  for (var i=0; i<localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.indexOf(LS_INV_PREFIX)===0) keys.push(k);
  }
  keys.forEach(function(k){ localStorage.removeItem(k); });
  renderInventoryPage();
}


function showCutDoneModal(allDP, patA, patB, patC) {
  // 全計算結果から端材リストを収集
  var endMats = {};
  function collectEnds(bars) {
    if (!bars) return;
    bars.forEach(function(b) {
      if (b.loss && b.loss > 0) {
        endMats[b.loss] = (endMats[b.loss]||0) + 1;
      }
    });
  }
  if (allDP && allDP[0]) collectEnds(allDP[0].bA.concat(allDP[0].bB||[]));
  if (patA && patA.bars) collectEnds(patA.bars);

  var kind = curKind;
  var spec = document.getElementById('spec') ? document.getElementById('spec').value : '';
  var minVL = parseInt(document.getElementById('minRemnantLen') ?
    document.getElementById('minRemnantLen').value : '500') || 500;

  var items = Object.keys(endMats).map(Number).filter(function(l){return l>=minVL;})
    .sort(function(a,b){return b-a;});

  var modal = document.getElementById('cutDoneModal');
  var body  = modal.querySelector('.cutdone-body');

  if (!items.length) {
    body.innerHTML = '<div style="color:#5a5a78;padding:12px;text-align:center;font-size:12px">登録できる端材がありません<br><span style="font-size:10px;color:#8888a8">(最小有効長さ'+minVL+'mm未満)</span></div>';
  } else {
    body.innerHTML =
      '<div style="font-size:11px;color:#8888a8;margin-bottom:10px">以下の端材を在庫に登録します</div>' +
      '<div style="font-size:11px;color:#5a5a78;margin-bottom:8px">鋼材: <b style="color:#2a2a3e">' + kind + ' ' + spec + '</b></div>' +
      items.map(function(l) {
        var q = endMats[l];
        return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-top:1px solid #ebebf0">' +
          '<input type="checkbox" id="cd_'+l+'" checked style="accent-color:var(--br)">' +
          '<label for="cd_'+l+'" style="font-size:12px;color:#2a2a3e;cursor:pointer;flex:1">' +
            l.toLocaleString() + 'mm × ' + q + '本</label>' +
          '</div>';
      }).join('') +
      '<input type="text" id="cdLabel" placeholder="ラベル（任意）例：A現場端材" style="width:100%;margin-top:10px;background:#fff;border:1px solid #d4d4dc;color:#2a2a3e;border-radius:6px;padding:6px;font-size:11px;box-sizing:border-box">';
  }

  modal._kind = kind; modal._spec = spec; modal._items = items; modal._endMats = endMats;
  modal.style.display = 'flex';
}

function confirmCutDone() {
  var modal = document.getElementById('cutDoneModal');
  var kind  = modal._kind;
  var spec  = modal._spec;
  var items = modal._items || [];
  var endMats = modal._endMats || {};
  var label = (document.getElementById('cdLabel') ? document.getElementById('cdLabel').value.trim() : '');

  items.forEach(function(l) {
    var cb = document.getElementById('cd_'+l);
    if (cb && cb.checked) {
      addToInventory(kind, spec, l, endMats[l], label);
    }
  });

  // 切断履歴に保存
  var pieces = [];
  for (var i=0; i<totalRows; i++) {
    var lEl=document.getElementById('pl'+i), qEl=document.getElementById('pq'+i);
    if (lEl && parseInt(lEl.value)>0 && parseInt(qEl.value)>0)
      pieces.push({l:parseInt(lEl.value), q:parseInt(qEl.value)});
  }
  saveCutHistory(kind, spec, pieces, items.map(function(l){return {l:l,q:endMats[l]};}));

  modal.style.display = 'none';
  alert('在庫に登録しました！「在庫」タブで確認できます。');

  // 在庫ドロップダウンも更新
  buildInventoryDropdown();
}

function showHistModal() {
  var hist = getPiecesHistory();
  var modal = document.getElementById('histModal');
  if (!hist.length) {
    modal.querySelector('.hist-body').innerHTML =
      '<div style="color:#5a5a78;padding:16px;text-align:center">履歴がありません</div>';
  } else {
    modal.querySelector('.hist-body').innerHTML = hist.map(function(h, i) {
      var summary = h.pieces.slice(0,3).map(function(p){return p.l+'×'+p.q;}).join(', ') +
        (h.pieces.length > 3 ? '...' : '');
      return '<div class="hist-item" onclick="loadPiecesFromHistory('+i+')">' +
        '<div style="font-size:12px;font-weight:700;color:#2a2a3e">' + summary + '</div>' +
        '<div style="font-size:10px;color:#8888a8;margin-top:2px">' + h.date + ' (' + h.pieces.length + '種)</div>' +
        '</div>';
    }).join('');
  }
  modal.style.display = 'flex';
}


// ============================================================
// 切断履歴・残材在庫管理
// ============================================================
var LS_CUT_HIST = 'so_cut_hist_v2';
var _lastCalcResult = null;  // 最後の計算結果を保持（印刷時自動登録用）
var _lastAllDP = [], _lastPatA = null, _lastPatB = null;
var LS_INVENTORY = 'so_inventory_v2';
var LS_MAX_CUT = 500;


// ============================================================
// 残材在庫DB  key: so_inv_{種類}_{規格}  value: [{len,qty,date,label}]
// ============================================================



function setInventory(kind, spec, items) {
  try { localStorage.setItem(invKey(kind, spec), JSON.stringify(items)); } catch(e) {}
}

// 残材を在庫に追加
function addToInventory(kind, spec, len, qty, label) {
  var items = getInventory(kind, spec);
  var date  = new Date().toLocaleDateString('ja-JP');
  // 同じ長さ・同じ日付があればqtyをまとめる
  var found = items.find(function(it){ return it.len===len && it.date===date && it.label===(label||''); });
  if (found) { found.qty += qty; }
  else { items.push({len:len, qty:qty, date:date, label:label||'', id: Date.now()+Math.random()}); }
  items.sort(function(a,b){ return b.len-a.len; });
  setInventory(kind, spec, items);
}

// 在庫から消費（残材優先消費後の消し込み）
function consumeInventory(kind, spec, lenArr) {
  var items = getInventory(kind, spec);
  lenArr.forEach(function(len) {
    for (var i=0; i<items.length; i++) {
      if (items[i].len===len && items[i].qty>0) {
        items[i].qty--;
        if (items[i].qty<=0) items.splice(i,1);
        return;
      }
    }
  });
  setInventory(kind, spec, items);
}

// 在庫一覧（全規格）をflat配列で返す
function getAllInventory() {
  var result = [];
  try {
    for (var i=0; i<localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(LS_INV_PREFIX)!==0) continue;
      var items = JSON.parse(localStorage.getItem(k)||'[]');
      items.forEach(function(it){ result.push(Object.assign({},it,{_key:k})); });
    }
  } catch(e) {}
  return result;
}

// 規格選択時：在庫を残材入力欄に反映するドロップダウン用データ
function getInventoryForCurrentSpec() {
  var spec = document.getElementById('spec') ? document.getElementById('spec').value : '';
  var kind = curKind;
  var inv = getInventory();
  // 同じspec・kindのものをまとめて返す
  var filtered = inv.filter(function(x){ return x.spec===spec || x.kind===kind; });
  // len別に集計
  var grouped = {};
  filtered.forEach(function(x){
    var key = x.len + ':' + x.spec;
    if (!grouped[key]) grouped[key] = {len:x.len, spec:x.spec, kind:x.kind, qty:0, date:x.addedDate||'', label:x.note||''};
    grouped[key].qty++;
  });
  return Object.values(grouped).sort(function(a,b){return b.len-a.len;});
}

function saveSettings() {
  try {
    var obj = {
      blade:       document.getElementById('blade').value,
      endloss:     document.getElementById('endloss').value,
      minRemnantLen: document.getElementById('minRemnantLen').value,
      kind:        curKind,
      jobClient:   (document.getElementById('jobClient')||{}).value||'',
      jobName:     (document.getElementById('jobName')||{}).value||'',
      jobDeadline: (document.getElementById('jobDeadline')||{}).value||'',
      jobWorker:   (document.getElementById('jobWorker')||{}).value||'',
      stocks:      []
    };
    STD.forEach(function(sl, i) {
      obj.stocks.push({
        checked: document.getElementById('sc'+i).checked,
        max:     document.getElementById('sm'+i).value
      });
    });
    localStorage.setItem(LS_SETTINGS, JSON.stringify(obj));
  } catch(e) {}
}

function loadSettings() {
  try {
    var raw = localStorage.getItem(LS_SETTINGS);
    if (!raw) return;
    var obj = JSON.parse(raw);
    if (obj.blade)         document.getElementById('blade').value = obj.blade;
    if (obj.endloss)       document.getElementById('endloss').value = obj.endloss;
    if (obj.minRemnantLen) document.getElementById('minRemnantLen').value = obj.minRemnantLen;
    if (obj.stocks) {
      obj.stocks.forEach(function(s, i) {
        var cb = document.getElementById('sc'+i);
        var mx = document.getElementById('sm'+i);
        if (cb) cb.checked = s.checked;
        if (mx) mx.value = s.max;
        if (cb) togStk(i);
      });
    }
    if (obj.jobClient) { var el=document.getElementById('jobClient'); if(el)el.value=obj.jobClient; }
    if (obj.jobName)   { var el=document.getElementById('jobName');   if(el)el.value=obj.jobName; }
    if (obj.jobDeadline){var el=document.getElementById('jobDeadline');if(el)el.value=obj.jobDeadline;}
    if (obj.jobWorker) { var el=document.getElementById('jobWorker'); if(el)el.value=obj.jobWorker; }
    if (obj.kind && STEEL[obj.kind]) {
      curKind = obj.kind;
      document.querySelectorAll('.tbtn').forEach(function(b) {
        b.classList.toggle('on', b.querySelector('span') && b.querySelector('span').textContent === obj.kind);
      });
      buildSpec();
    }
  } catch(e) {}
}

function saveRemnants() {
  try {
    var list = [];
    for (var i = 0; i < remnantCount; i++) {
      var lEl = document.getElementById('remLen'+i);
      var qEl = document.getElementById('remQty'+i);
      if (!lEl) continue;
      var l = parseInt(lEl.value), q = parseInt(qEl.value)||1;
      if (l > 0) list.push({l:l, q:q});
    }
    localStorage.setItem(LS_REMNANTS, JSON.stringify(list));
  } catch(e) {}
}

function loadRemnants() {
  try {
    var raw = localStorage.getItem(LS_REMNANTS);
    if (!raw) return;
    var list = JSON.parse(raw);
    if (!list.length) return;
    // 既存の空行を削除してロード
    document.getElementById('remnantList').innerHTML = '';
    remnantCount = 0;
    list.forEach(function(item) {
      addRemnant();
      var i = remnantCount - 1;
      document.getElementById('remLen'+i).value = item.l;
      document.getElementById('remQty'+i).value = item.q;
    });
  } catch(e) {}
}

function savePiecesHistory() {
  try {
    var pieces = [];
    for (var i = 0; i < totalRows; i++) {
      var lEl = document.getElementById('pl'+i);
      var qEl = document.getElementById('pq'+i);
      if (!lEl) continue;
      var l = parseInt(lEl.value), q = parseInt(qEl.value);
      if (l > 0 && q > 0) pieces.push({l:l, q:q});
    }
    if (!pieces.length) return;
    var hist = getPiecesHistory();
    // 重複チェック
    var key = pieces.map(function(p){return p.l+':'+p.q;}).join(',');
    hist = hist.filter(function(h){
      return h.pieces.map(function(p){return p.l+':'+p.q;}).join(',') !== key;
    });
    hist.unshift({pieces:pieces, date:new Date().toLocaleDateString('ja-JP'), key:key});
    hist = hist.slice(0, LS_MAX_HIST);
    localStorage.setItem(LS_HISTORY, JSON.stringify(hist));
  } catch(e) {}
}

function getPiecesHistory() {
  try {
    var raw = localStorage.getItem(LS_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function loadPiecesFromHistory(idx) {
  var hist = getPiecesHistory();
  if (!hist[idx]) return;
  var pieces = hist[idx].pieces;
  // 既存クリア
  for (var i = 0; i < totalRows; i++) {
    var lEl = document.getElementById('pl'+i);
    var qEl = document.getElementById('pq'+i);
    if (lEl) lEl.value = '';
    if (qEl) qEl.value = '';
  }
  pieces.forEach(function(p, i) {
    if (i >= totalRows) return;
    document.getElementById('pl'+i).value = p.l;
    document.getElementById('pq'+i).value = p.q;
  });
  updKg();
  document.getElementById('histModal').style.display = 'none';
}

// ── ジョブ情報取得 ──
function getJobInfo() {
  return {
    client:   (document.getElementById('jobClient')  || {}).value || '',
    name:     (document.getElementById('jobName')    || {}).value || '',
    deadline: (document.getElementById('jobDeadline')|| {}).value || '',
    worker:   (document.getElementById('jobWorker')  || {}).value || '',
    memo:     (document.getElementById('jobWorker')  || {}).value || '',
    spec:     (document.getElementById('spec')       || {}).value || '',
    kind:     curKind || ''
  };
}

// ── 工区情報取得 ──
function getZoneInfo() {
  var zones = [];
  for (var i = 0; i < totalRows; i++) {
    var lEl = document.getElementById('pl'+i);
    var zEl = document.getElementById('pz'+i);
    if (!lEl || !parseInt(lEl.value)) continue;
    zones.push({ len: parseInt(lEl.value), zone: zEl ? (zEl.value||'') : '' });
  }
  return zones;
}

// ── 切断履歴に保存 ──
/**
 * 切断履歴を保存する
 * @param {Object} resultData - _lastCalcResult
 * @param {string} [cardId] - 印刷したカードID
 */
function legacySaveCutHistory(resultData, cardId) {
  var job = getJobInfo();
  var zones = getZoneInfo();
  var hist = getCutHistory();
  var resultMeta = buildResultMeta(resultData);
  var selectedBars = getSelectedBarsFromResultData(resultData, cardId);
  var entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    dateLabel: new Date().toLocaleDateString('ja-JP'),
    client: job.client,
    name: job.name,
    deadline: job.deadline,
    worker: job.worker,
    spec: job.spec,
    kind: job.kind,
    zones: zones,
    result: {
      allDP: resultData.allDP ? resultData.allDP.slice(0,5).map(function(d){
        return {desc:d.desc,lossRate:d.lossRate,lossKg:d.lossKg,barKg:d.barKg,
          slA:d.slA,slB:d.slB,type:d.type,chg:d.chg,
          bA:d.bA?d.bA.map(function(b){return{pat:b.pat,loss:b.loss};}):[] ,
          bB:d.bB?d.bB.map(function(b){return{pat:b.pat,loss:b.loss};}):[]};
      }) : [],
      patA: resultData.patA ? {
        label:resultData.patA.label, sl:resultData.patA.sl,
        bars:resultData.patA.bars?resultData.patA.bars.map(function(b){return{pat:b.pat,loss:b.loss,sl:b.sl};}):[]
      } : null,
      patB: resultData.patB ? {
        label: resultData.patB.label,
        plan90: resultData.patB.plan90 ? {
          label: resultData.patB.plan90.label,
          sl: resultData.patB.plan90.sl,
          bars: resultData.patB.plan90.bars ? resultData.patB.plan90.bars.map(function(b){return{pat:b.pat,loss:b.loss,sl:b.sl};}) : []
        } : null,
        plan80: resultData.patB.plan80 ? {
          label: resultData.patB.plan80.label,
          sl: resultData.patB.plan80.sl,
          bars: resultData.patB.plan80.bars ? resultData.patB.plan80.bars.map(function(b){return{pat:b.pat,loss:b.loss,sl:b.sl};}) : []
        } : null
      } : null,
      meta: resultMeta,
      selectedBars: selectedBars,
      remnants: buildRemnantsFromBars(selectedBars, resultMeta),
      blade: parseInt((document.getElementById('blade')||{}).value)||3,
      endLoss: parseInt((document.getElementById('endloss')||{}).value)||150
    }
  };
  hist.unshift(entry);
  // 無制限保存（容量超過時は古い半分を削除）
  var saved = false;
  while (!saved && hist.length > 0) {
    try {
      localStorage.setItem(LS_CUT_HIST, JSON.stringify(hist));
      saved = true;
    } catch(e) {
      hist = hist.slice(0, Math.floor(hist.length * 0.7));  // 古い30%を削除して再試行
    }
  }
  return entry;
}

function getCutHistory() {
  try { var r=localStorage.getItem(LS_CUT_HIST); return r?JSON.parse(r):[]; } catch(e){return [];}
}

function buildResultMeta(resultData) {
  var meta = resultData && resultData.meta ? Object.assign({}, resultData.meta) : {};
  if (!meta.spec) meta.spec = (document.getElementById('spec') || {}).value || '';
  if (!meta.kind) meta.kind = (typeof getCurrentKind === 'function' ? getCurrentKind() : (typeof curKind !== 'undefined' ? curKind : '')) || '';
  if (!meta.minRemnantLen) meta.minRemnantLen = parseInt((document.getElementById('minRemnantLen') || {}).value, 10) || 500;
  if (!meta.blade) meta.blade = parseInt((document.getElementById('blade') || {}).value, 10) || 3;
  if (!meta.endLoss) meta.endLoss = parseInt((document.getElementById('endloss') || {}).value, 10) || 150;
  if (!meta.job && typeof getJobInfo === 'function') meta.job = getJobInfo();
  return meta;
}

function cloneBarsForCard(bars, fallbackSl) {
  return (bars || []).map(function(bar) {
    return {
      pat: (bar.pat || []).slice(),
      loss: bar.loss || 0,
      sl: bar.sl || fallbackSl || 0
    };
  });
}

function getSelectedBarsFromResultData(resultData, cardId) {
  var result = resultData && resultData.result ? resultData.result : (resultData || {});
  var id = String(cardId || result.printedCardId || '');
  var printedCardId = String(result.printedCardId || '');
  var canUseStoredSelection = !id || (printedCardId && printedCardId === id);
  if (result.selectedBars && result.selectedBars.length && canUseStoredSelection) {
    return cloneBarsForCard(result.selectedBars, 0);
  }

  if (id.indexOf('card_remonly_') === 0) {
    return cloneBarsForCard(((result.meta || {}).remnantBars) || [], 0);
  }

  var yieldMatch = id.match(/^card_yield_(\d+)/);
  if (yieldMatch && result.allDP && result.allDP[parseInt(yieldMatch[1], 10)]) {
    var yieldCard = result.allDP[parseInt(yieldMatch[1], 10)];
    if (yieldCard && yieldCard.bars && yieldCard.bars.length) {
      var baseBars = cloneBarsForCard(yieldCard.bars || [], yieldCard.slA);
      var remnantBars = cloneBarsForCard(((result.meta || {}).remnantBars) || [], 0);
      var hasRemnantBars = baseBars.some(function(bar) {
        return bar && bar.sl && typeof isStdStockLength === 'function' && !isStdStockLength(bar.sl);
      });
      return hasRemnantBars ? baseBars : remnantBars.concat(baseBars);
    }
    return cloneBarsForCard(yieldCard.bA || [], yieldCard.slA).concat(cloneBarsForCard(yieldCard.bB || [], yieldCard.slB));
  }

  var patMatch = id.match(/^card_pat_([^_]+)/);
  var label = patMatch ? patMatch[1] : '';
  if (label === 'B90' && result.patB && result.patB.plan90) {
    return cloneBarsForCard(result.patB.plan90.bars || [], result.patB.plan90.sl);
  }
  if (label === 'B80' && result.patB && result.patB.plan80) {
    return cloneBarsForCard(result.patB.plan80.bars || [], result.patB.plan80.sl);
  }
  if (id.indexOf('card_pat') === 0 && result.patA) {
    return cloneBarsForCard(result.patA.bars || [], result.patA.sl);
  }
  if (result.allDP && result.allDP[0]) {
    if (result.allDP[0].bars && result.allDP[0].bars.length) {
      return cloneBarsForCard(result.allDP[0].bars || [], result.allDP[0].slA);
    }
    return cloneBarsForCard(result.allDP[0].bA || [], result.allDP[0].slA).concat(cloneBarsForCard(result.allDP[0].bB || [], result.allDP[0].slB));
  }
  return [];
}

function buildCardSelectionPayload(resultData, cardId) {
  var result = resultData && resultData.result ? resultData.result : (resultData || {});
  var meta = buildResultMeta(result);
  var selectedBars = getSelectedBarsFromResultData(result, cardId);
  return {
    cardId: String(cardId || result.printedCardId || ''),
    selectedBars: selectedBars,
    meta: meta,
    remnants: buildRemnantsFromBars(selectedBars, meta)
  };
}

function buildRemnantsFromBars(bars, meta) {
  var context = buildResultMeta({ meta: meta || {} });
  var minLen = parseInt(context.minRemnantLen, 10) || 500;
  var rems = [];
  (bars || []).forEach(function(bar) {
    if (!bar || bar.loss < minLen) return;
    rems.push({
      len: bar.loss,
      spec: context.spec || '',
      kind: context.kind || '',
      sl: bar.sl || 0,
      qty: 1
    });
  });
  return rems;
}

// ── 計算結果から端材リストを抽出 ──
function legacyExtractRemnants(resultData, cardId) {
  var result = resultData && resultData.result ? resultData.result : (resultData || {});
  return buildRemnantsFromBars(getSelectedBarsFromResultData(result, cardId), buildResultMeta(result));
}

// ── 残材在庫 ──
function getInventory() {
  try { var r=localStorage.getItem(LS_INVENTORY); return r?JSON.parse(r):[]; } catch(e){return [];}
}

function saveInventory(inv) {
  try { localStorage.setItem(LS_INVENTORY, JSON.stringify(inv)); } catch(e){}
}

// 残材を在庫に登録（計算後ボタン）
function registerRemnants(rems) {
  var inv = getInventory();
  var fallbackJob = typeof getJobInfo === 'function' ? getJobInfo() : {};
  rems.forEach(function(r) {
    var qty = Math.max(1, parseInt(r && r.qty, 10) || 1);
    var job = r && r.job ? r.job : fallbackJob;
    for (var i = 0; i < qty; i++) {
    inv.push({
      id: Date.now() + Math.random(),
      len: r.len,
      spec: r.spec,
      kind: r.kind,
      company: job.client,
      note: job.memo || '',
      addedDate: new Date().toLocaleDateString('ja-JP')
    });
    }
  });
  saveInventory(inv);
  syncInventoryToRemnants();
  if (typeof renderInventoryPage === 'function') renderInventoryPage();
  if (typeof updateInvDropdown === 'function') updateInvDropdown();
}

function consumeInventoryBars(bars, meta) {
  var context = buildResultMeta({ meta: meta || {} });
  var inv = getInventory().slice();
  var lengths = [];
  var selected = Array.isArray(context.selectedInventoryRemnants) ? context.selectedInventoryRemnants : [];
  var selectedByLen = {};

  (bars || []).forEach(function(bar) {
    var sl = parseInt(bar && bar.sl, 10) || 0;
    if (!sl) return;
    lengths.push(sl);
  });

  selected.forEach(function(sel) {
    var len = parseInt(sel && sel.len, 10) || 0;
    var qty = Math.max(0, parseInt(sel && sel.qty, 10) || 0);
    if (!len || !qty) return;
    selectedByLen[len] = (selectedByLen[len] || 0) + qty;
  });

  var filteredLengths = lengths.filter(function(len) {
    if (selectedByLen[len] > 0) {
      selectedByLen[len]--;
      return true;
    }
    if (typeof isStdStockLength === 'function' && isStdStockLength(len)) return false;
    return true;
  });

  if (!filteredLengths.length) return [];

  var consumed = [];
  var remainingByLen = {};
  filteredLengths.forEach(function(len) {
    remainingByLen[len] = (remainingByLen[len] || 0) + 1;
  });
  selected.forEach(function(sel) {
    var len = parseInt(sel && sel.len, 10) || 0;
    var need = Math.min(remainingByLen[len] || 0, Math.max(0, parseInt(sel && sel.qty, 10) || 0));
    if (!len || !need) return;
    var ids = (sel.ids || []).map(function(id) { return String(id); });
    for (var i = 0; i < ids.length && need > 0; i++) {
      var idx = inv.findIndex(function(item) {
        return String(item && item.id) === ids[i];
      });
      if (idx < 0) continue;
      consumed.push(inv[idx]);
      inv.splice(idx, 1);
      need--;
      remainingByLen[len] = Math.max(0, (remainingByLen[len] || 0) - 1);
    }
  });

  lengths.forEach(function(len) {
    if (!(remainingByLen[len] > 0)) return;
    var idx = inv.findIndex(function(item) {
      return Number(item && item.len) === len &&
        (!context.spec || item.spec === context.spec) &&
        (!context.kind || item.kind === context.kind);
    });
    if (idx < 0 && context.spec) {
      idx = inv.findIndex(function(item) {
        return Number(item && item.len) === len && item.spec === context.spec;
      });
    }
    if (idx < 0 && context.kind) {
      idx = inv.findIndex(function(item) {
        return Number(item && item.len) === len && item.kind === context.kind;
      });
    }
    if (idx < 0) {
      idx = inv.findIndex(function(item) {
        return Number(item && item.len) === len;
      });
    }
    if (idx < 0) return;
    consumed.push(inv[idx]);
    inv.splice(idx, 1);
    remainingByLen[len] = Math.max(0, (remainingByLen[len] || 0) - 1);
  });

  if (!consumed.length) return [];

  saveInventory(inv);
  if (typeof syncInventoryToRemnants === 'function') syncInventoryToRemnants();
  if (typeof renderInventoryPage === 'function') renderInventoryPage();
  if (typeof updateInvDropdown === 'function') updateInvDropdown();
  return consumed;
}

function consumeSelectedInventoryRemnants(selectedItems) {
  var items = Array.isArray(selectedItems) ? selectedItems : [];
  if (!items.length) return [];

  var inv = getInventory().slice();
  var consumed = [];

  items.forEach(function(sel) {
    var qty = Math.max(0, parseInt(sel && sel.qty, 10) || 0);
    if (!qty) return;

    var ids = Array.isArray(sel && sel.ids)
      ? sel.ids.map(function(id) { return String(id); })
      : [];
    var remaining = qty;

    ids.forEach(function(id) {
      if (remaining <= 0) return;
      var idx = inv.findIndex(function(item) {
        return String(item && item.id) === id;
      });
      if (idx < 0) return;
      consumed.push(inv[idx]);
      inv.splice(idx, 1);
      remaining--;
    });

    if (remaining <= 0) return;

    var len = parseInt(sel && sel.len, 10) || 0;
    var spec = sel && sel.spec ? sel.spec : '';
    var kind = sel && sel.kind ? sel.kind : '';

    while (remaining > 0) {
      var idx = inv.findIndex(function(item) {
        return (!len || Number(item && item.len) === len) &&
          (!spec || item.spec === spec) &&
          (!kind || item.kind === kind);
      });
      if (idx < 0 && len) {
        idx = inv.findIndex(function(item) {
          return Number(item && item.len) === len;
        });
      }
      if (idx < 0) break;
      consumed.push(inv[idx]);
      inv.splice(idx, 1);
      remaining--;
    }
  });

  if (!consumed.length) return [];

  saveInventory(inv);
  if (typeof syncInventoryToRemnants === 'function') syncInventoryToRemnants();
  if (typeof renderInventoryPage === 'function') renderInventoryPage();
  if (typeof updateInvDropdown === 'function') updateInvDropdown();
  return consumed;
}

function addInventoryItem() {
  var spec = prompt('規格（例：H-200×100）');
  if (!spec) return;
  var len = parseInt(prompt('長さ (mm)'));
  if (!len || len <= 0) return;
  var inv = getInventory();
  inv.push({ id: Date.now(), len: len, spec: spec, kind: '', addedDate: new Date().toLocaleDateString('ja-JP'), note: '' });
  saveInventory(inv);
  renderInventory();
}

function deleteInventoryItem(id) {
  if (!confirm('この在庫を削除しますか？')) return;
  var inv = getInventory().filter(function(x){ return x.id !== id; });
  saveInventory(inv);
  renderInventoryPage();
  syncInventoryToRemnants();
  updateInvDropdown();
}

function clearInventory() {
  if (!confirm('在庫を全削除しますか？')) return;
  saveInventory([]);
  renderInventory();
  syncInventoryToRemnants();
}

// ══════════════════════════════════════════════════════
// 🛒 カート機能  —  複数カードをまとめて印刷するための一時保存
// ══════════════════════════════════════════════════════
var LS_CART = 'so_print_cart';

/** カートを取得 */
function getCart() {
  try { var r = localStorage.getItem(LS_CART); return r ? JSON.parse(r) : []; }
  catch(e) { return []; }
}

/** カートを保存 */
function saveCart(items) {
  try { localStorage.setItem(LS_CART, JSON.stringify(items)); } catch(e) {}
}

/** カートにアイテムを追加
 * @param {string} cardId - カードのDOM ID
 * @param {Object} data   - { jobInfo, spec, kind, planHtml, diagramHtml, stats, cardType }
 * @returns {string} 追加したアイテムのID
 */
function addToCart(cardId, data) {
  var cart = getCart();
  var id = 'cart_' + Date.now();
  cart.push({ id: id, cardId: cardId, addedAt: new Date().toISOString(), data: data });
  saveCart(cart);
  return id;
}

/** カートからアイテムを削除 */
function removeFromCart(id) {
  saveCart(getCart().filter(function(x){ return x.id !== id; }));
}

/** カートを全クリア */
function clearCart() {
  saveCart([]);
}

function saveCutHistory(resultData, cardId) {
  resultData = resultData || _lastCalcResult || {};
  var job = getJobInfo();
  var zones = getZoneInfo();
  var hist = getCutHistory();
  var payload = buildCardSelectionPayload(resultData, cardId);
  var resultMeta = payload.meta;
  var selectedBars = payload.selectedBars;
  var entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    dateLabel: new Date().toLocaleDateString('ja-JP'),
    client: job.client,
    name: job.name,
    deadline: job.deadline,
    worker: job.worker,
    spec: job.spec,
    kind: job.kind,
    zones: zones,
    result: {
      allDP: resultData.allDP ? resultData.allDP.slice(0, 5).map(function(d) {
        return {
          desc: d.desc,
          lossRate: d.lossRate,
          lossKg: d.lossKg,
          barKg: d.barKg,
          slA: d.slA,
          slB: d.slB,
          type: d.type,
          chg: d.chg,
          bA: d.bA ? d.bA.map(function(b) { return { pat: b.pat, loss: b.loss, sl: b.sl }; }) : [],
          bB: d.bB ? d.bB.map(function(b) { return { pat: b.pat, loss: b.loss, sl: b.sl }; }) : []
        };
      }) : [],
      patA: resultData.patA ? {
        label: resultData.patA.label,
        sl: resultData.patA.sl,
        bars: resultData.patA.bars ? resultData.patA.bars.map(function(b) { return { pat: b.pat, loss: b.loss, sl: b.sl }; }) : []
      } : null,
      patB: resultData.patB ? {
        label: resultData.patB.label,
        plan90: resultData.patB.plan90 ? {
          label: resultData.patB.plan90.label,
          sl: resultData.patB.plan90.sl,
          bars: resultData.patB.plan90.bars ? resultData.patB.plan90.bars.map(function(b) { return { pat: b.pat, loss: b.loss, sl: b.sl }; }) : []
        } : null,
        plan80: resultData.patB.plan80 ? {
          label: resultData.patB.plan80.label,
          sl: resultData.patB.plan80.sl,
          bars: resultData.patB.plan80.bars ? resultData.patB.plan80.bars.map(function(b) { return { pat: b.pat, loss: b.loss, sl: b.sl }; }) : []
        } : null
      } : null,
      meta: resultMeta,
      selectedBars: selectedBars,
      remnants: payload.remnants,
      blade: parseInt((document.getElementById('blade') || {}).value, 10) || 3,
      endLoss: parseInt((document.getElementById('endloss') || {}).value, 10) || 150
    }
  };
  hist.unshift(entry);
  var saved = false;
  while (!saved && hist.length > 0) {
    try {
      localStorage.setItem(LS_CUT_HIST, JSON.stringify(hist));
      saved = true;
    } catch (e) {
      hist = hist.slice(0, Math.floor(hist.length * 0.7));
    }
  }
  return entry;
}

function extractRemnants(resultData, cardId) {
  resultData = resultData || _lastCalcResult || {};
  return buildCardSelectionPayload(resultData, cardId).remnants;
}
