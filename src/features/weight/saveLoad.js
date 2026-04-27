// ── CSV出力（現在の明細リストをCSV保存） ─────────────────────
function wExportCsv() {
  if (_wRows.length === 0) { alert('リストが空です。'); return; }
  var CO2_FACTOR = 2.1;
  var cols = ['#','部材名','種類','規格','長さ(mm)','本数','1本重量(kg)','合計重量(kg)'];
  if (_wOpts.co2)   cols.push('CO2排出(kg-CO2)');
  if (_wOpts.m2)    cols.push('塗装面積(m2)');
  if (_wOpts.price) cols.push('単価(円/kg)','金額(円)');
  if (_wOpts.paint) cols.push('塗装単価(円/m2)','塗装金額(円)');
  var lines = ['\uFEFF' + cols.join(',')];
  _wRows.forEach(function(r, i) {
    var row = [
      String(i+1).padStart(2,'0'),
      '"' + (r.memo || '').replace(/"/g, '""') + '"',
      '"' + r.kind + '"',
      '"' + r.spec + '"',
      r.len,
      r.qty,
      r.kg1.toFixed(2),
      r.kgTotal.toFixed(2)
    ];
    if (_wOpts.co2)   row.push((r.kgTotal * CO2_FACTOR).toFixed(1));
    if (_wOpts.m2)    row.push(r.m2Total.toFixed(2));
    if (_wOpts.price) row.push(r.price || '', r.amount !== null ? r.amount : '');
    if (_wOpts.paint) row.push(r.paintPrice || '', r.paintAmount !== null ? r.paintAmount : '');
    lines.push(row.join(','));
  });
  var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  var d = new Date();
  a.download = '重量計算_' + d.getFullYear() + ('0'+(d.getMonth()+1)).slice(-2) + ('0'+d.getDate()).slice(-2) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── 印刷 ──────────────────────────────────────────────────────
function wSaveCalc() {
  if (_wRows.length === 0) { alert('リストが空です。'); return; }
  var defaultName = (function() {
    var specs = [];
    _wRows.forEach(function(r) { if (specs.indexOf(r.spec) < 0) specs.push(r.spec); });
    var d = new Date();
    return specs.slice(0, 2).join('/') + ' ' + (d.getMonth() + 1) + '/' + d.getDate();
  })();
  var name = prompt('保存名を入力してください', defaultName);
  if (!name) return;
  var rec = {
    id: 'wc_' + Date.now(),
    name: name,
    savedAt: new Date().toISOString(),
    rows: JSON.parse(JSON.stringify(_wRows)),
    opts: JSON.parse(JSON.stringify(_wOpts)),
    jobName: _wJobName,
    jobClient: _wJobClient,
    docTitle: _wDocTitle
  };
  _wSavedCalcs.unshift(rec);
  if (_wSavedCalcs.length > 20) _wSavedCalcs.pop();
  if (_wStore && typeof _wStore.saveSavedCalcs === 'function') {
    _wStore.saveSavedCalcs(_wSavedCalcs);
  } else {
    try { localStorage.setItem('wSavedCalcs', JSON.stringify(_wSavedCalcs)); } catch (e) {}
  }
  if (typeof sbUpsert === 'function') sbUpsert('weight_calcs', _wSavedCalcs);
  renderWSavedList();
  alert('「' + name + '」を保存しました。');
}

// ── 作業情報（重量タブ独立） ──────────────────────────
function wSaveJobInfo() {
  var clientEl = document.getElementById('wJobClient');
  var nameEl   = document.getElementById('wJobNameInput');
  _wJobClient = clientEl ? clientEl.value : _wJobClient;
  _wJobName   = nameEl   ? nameEl.value   : _wJobName;
  if (_wStore && typeof _wStore.saveMeta === 'function') {
    _wStore.saveMeta({ jobName: _wJobName, jobClient: _wJobClient, docTitle: _wDocTitle });
  } else {
    try {
      localStorage.setItem('wJobClient', _wJobClient);
      localStorage.setItem('wJobName',   _wJobName);
    } catch (e) {}
  }
}

function wGetJobForHistory() {
  return {
    client: _wJobClient || '',
    name:   _wJobName   || '',
    docTitle: _wDocTitle || ''
  };
}

function wLoadCalc(id) {
  var rec = _wSavedCalcs.find(function(r) { return r.id === id; });
  if (!rec) return;
  if (!confirm('「' + rec.name + '」を読み込みます。現在のリストは置き換えられます。')) return;
  _wRows = JSON.parse(JSON.stringify(rec.rows));
  _wJobName = (rec.jobName || '').trim();
  _wJobClient = (rec.jobClient || '').trim();
  _wDocTitle = (rec.docTitle || '').trim();
  if (_wStore && typeof _wStore.saveMeta === 'function') {
    _wStore.saveMeta({ jobName: _wJobName, jobClient: _wJobClient, docTitle: _wDocTitle });
  } else {
    try {
      localStorage.setItem('wJobName',   _wJobName);
      localStorage.setItem('wJobClient', _wJobClient);
      localStorage.setItem('wDocTitle', _wDocTitle);
    } catch (e) {}
  }
  Object.keys(rec.opts || {}).forEach(function(key) {
    if (_wOpts[key] !== rec.opts[key]) wToggleOpt(key);
  });
  _wCartAdded = false;
  var wci = document.getElementById('wJobClient');
  if (wci) wci.value = _wJobClient;
  var wni = document.getElementById('wJobNameInput');
  if (wni) wni.value = _wJobName;
  var wdt = document.getElementById('wDocTitle');
  if (wdt) wdt.value = _wDocTitle;
  wRenderRows();
}

function wRecallFromHistory(rows, opts, job) {
  if (!rows || !rows.length) return;
  _wRows = JSON.parse(JSON.stringify(rows));
  var defaultOpts = { price: false, name: false, rev: false, paint: false, m2: false, co2: false };
  opts = opts || {};
  Object.keys(defaultOpts).forEach(function(key) {
    if (_wOpts[key] !== !!opts[key]) wToggleOpt(key);
  });
  if (job && job.client) {
    _wJobClient = job.client;
  }
  if (job && job.name) {
    _wJobName = job.name;
  }
  if (job && job.docTitle) {
    _wDocTitle = job.docTitle;
  }
  if (_wStore && typeof _wStore.saveMeta === 'function') {
    _wStore.saveMeta({ jobName: _wJobName, jobClient: _wJobClient, docTitle: _wDocTitle });
  } else {
    if (job && job.client) {
      try { localStorage.setItem('wJobClient', _wJobClient); } catch (e) {}
    }
    if (job && job.name) {
      try { localStorage.setItem('wJobName', _wJobName); } catch (e) {}
    }
    if (job && job.docTitle) {
      try { localStorage.setItem('wDocTitle', _wDocTitle); } catch (e) {}
    }
  }
  _wCartAdded = false;
  var wdt = document.getElementById('wDocTitle');
  if (wdt) wdt.value = _wDocTitle;
  wRenderRows();
}

function wDeleteSavedCalc(id) {
  _wSavedCalcs = _wSavedCalcs.filter(function(r) { return r.id !== id; });
  if (_wStore && typeof _wStore.saveSavedCalcs === 'function') {
    _wStore.saveSavedCalcs(_wSavedCalcs);
  } else {
    try { localStorage.setItem('wSavedCalcs', JSON.stringify(_wSavedCalcs)); } catch (e) {}
  }
  if (typeof sbUpsert === 'function') sbUpsert('weight_calcs', _wSavedCalcs);
  renderWSavedList();
}

function renderWSavedList() {
  var cont = document.getElementById('wSavedList');
  if (!cont) return;
  if (_wSavedCalcs.length === 0) {
    cont.innerHTML = '<div style="font-size:11px;color:var(--ink3);padding:4px 0">保存済みなし</div>';
    return;
  }
  cont.innerHTML = _wSavedCalcs.map(function(rec) {
    var d = new Date(rec.savedAt);
    var dateStr = (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
                  ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    return '<div class="w-saved-item">' +
      '<div class="w-saved-info" onclick="wLoadCalc(\'' + rec.id + '\')" title="クリックで読み込み">' +
        '<div class="w-saved-name">' + _esc(rec.name) + '</div>' +
        '<div class="w-saved-date">' + dateStr + '　' + rec.rows.length + '行</div>' +
      '</div>' +
      '<button class="w-saved-del" onclick="wDeleteSavedCalc(\'' + rec.id + '\')" title="削除">✕</button>' +
    '</div>';
  }).join('');
}
