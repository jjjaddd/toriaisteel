// 切断ピース入力履歴 + 案件情報・工区情報の取得

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
