// 計算設定（刃幅 / 端材ロス / 規格 / 案件情報 / 母材選択）の保存・読込

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
      stocks:      [],
      stockLengths: [],
      stocksByLength: {}
    };
    STD.forEach(function(sl, i) {
      var state = {
        checked: document.getElementById('sc'+i).checked,
        max:     document.getElementById('sm'+i).value
      };
      obj.stocks.push(state);
      obj.stockLengths.push(sl);
      obj.stocksByLength[String(sl)] = state;
    });
    if (_localStore && typeof _localStore.writeJson === 'function') _localStore.writeJson(LS_SETTINGS, obj);
    else localStorage.setItem(LS_SETTINGS, JSON.stringify(obj));
  } catch(e) {}
}

function loadSettings() {
  try {
    var obj = _localStore && typeof _localStore.readJson === 'function'
      ? _localStore.readJson(LS_SETTINGS, null)
      : (function() {
          var raw = localStorage.getItem(LS_SETTINGS);
          return raw ? JSON.parse(raw) : null;
        })();
    if (!obj) return;
    if (obj.blade)         document.getElementById('blade').value = obj.blade;
    if (obj.endloss)       document.getElementById('endloss').value = obj.endloss;
    if (obj.minRemnantLen) document.getElementById('minRemnantLen').value = obj.minRemnantLen;
    if (obj.jobClient) { var el=document.getElementById('jobClient'); if(el)el.value=obj.jobClient; }
    if (obj.jobName)   { var el=document.getElementById('jobName');   if(el)el.value=obj.jobName; }
    if (obj.jobDeadline){var el=document.getElementById('jobDeadline');if(el)el.value=obj.jobDeadline;}
    if (obj.jobWorker) { var el=document.getElementById('jobWorker'); if(el)el.value=obj.jobWorker; }
    var steelApi = window.Toriai && window.Toriai.data && window.Toriai.data.steel;
    var availableKinds = steelApi && typeof steelApi.getAllKinds === 'function'
      ? steelApi.getAllKinds()
      : [];
    if (obj.kind && availableKinds.indexOf(obj.kind) >= 0) {
      curKind = obj.kind;
      document.querySelectorAll('.tbtn').forEach(function(b) {
        b.classList.toggle('on', b.querySelector('span') && b.querySelector('span').textContent === obj.kind);
      });
      if (typeof buildSpec === 'function') buildSpec();
    }
    if (obj.stocksByLength) {
      STD.forEach(function(sl, i) {
        var state = obj.stocksByLength[String(sl)];
        if (!state) return;
        var cb = document.getElementById('sc'+i);
        var mx = document.getElementById('sm'+i);
        if (cb) cb.checked = state.checked;
        if (mx) mx.value = state.max;
        if (cb) togStk(i);
      });
    } else if (obj.stocks) {
      obj.stocks.forEach(function(s, i) {
        var cb = document.getElementById('sc'+i);
        var mx = document.getElementById('sm'+i);
        if (cb) cb.checked = s.checked;
        if (mx) mx.value = s.max;
        if (cb) togStk(i);
      });
    }
  } catch(e) {}
}
