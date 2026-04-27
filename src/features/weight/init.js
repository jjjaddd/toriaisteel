// ── 初期化 ────────────────────────────────────────────────────
function wInit() {
  var kindEl = document.getElementById('wKind');
  if (!kindEl) return;
  var kinds = _wEnsureCatalogReady();

  if (!_wInited || !kindEl.options.length || kindEl.options.length !== kinds.length) {
    kindEl.innerHTML = '';
    kinds.forEach(function(kind) {
      var opt = document.createElement('option');
      opt.value = kind;
      opt.textContent = kind;
      kindEl.appendChild(opt);
    });
    _wInited = true;
    wSetupEnter();
  }

  wOnKind();
  wRenderRows();
  wCmdBuildAll();

  var cmdInput = document.getElementById('wCmdInput');
  if (cmdInput && !cmdInput.value && kinds.length > 0) {
    var firstKind = kinds[0];
    var firstRows = _wRowsByKind(firstKind);
    var firstSpec = firstRows.length > 0 ? firstRows[0] : null;
    if (firstSpec) {
      wCmdSelect({
        kind:  firstKind,
        spec:  _wSpecName(firstSpec),
        kgm:   _wSpecKgm(firstSpec),
        label: firstKind + ' ' + _wSpecName(firstSpec)
      });
      cmdInput.value = '';
      var cmdKgm = document.getElementById('wCmdKgm');
      if (cmdKgm) cmdKgm.textContent = '';
      cmdInput.placeholder = 'H100 / F9 / RB32';
    }
  }

  // タブを開いた時は鋼材検索欄にフォーカス
  setTimeout(function() {
    var el = document.getElementById('wCmdInput');
    if (el) el.focus();
  }, 80);

  // 作業情報入力欄に保存値を反映
  var wci = document.getElementById('wJobClient');
  if (wci) wci.value = _wJobClient;
  var wni = document.getElementById('wJobNameInput');
  if (wni) wni.value = _wJobName;
  var wdt = document.getElementById('wDocTitle');
  if (wdt) wdt.value = _wDocTitle;
}

// ── Enter フロー ──────────────────────────────────────────────
function wNextOptOrAdd(from) {
  var order    = ['price', 'name', 'title'];
  var fieldMap = { price: 'wPrice', name: 'wMemo', title: 'wDocTitle' };
  var startIdx = (from === 'qty') ? 0 : order.indexOf(from) + 1;
  for (var i = startIdx; i < order.length; i++) {
    var opt = order[i];
    if (_wOpts[opt]) {
      var el = document.getElementById(fieldMap[opt]);
      if (el) { el.focus(); el.select(); return; }
    }
  }
  wAddRow();
}

function wSetupEnter() {
  var lenEl = document.getElementById('wLen');
  var qtyEl = document.getElementById('wQty');

  // Shift+Enter: 計算結果をリストに追加してから検索欄へ戻る
  function shiftEnterToCmd(e) {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      // まず行を追加（計算結果をリストに表示）
      if (typeof wAddRow === 'function') wAddRow();
      // 鋼材規格検索欄へフォーカス
      var cmdInput = document.getElementById('wCmdInput');
      if (cmdInput) {
        cmdInput.focus();
        setTimeout(function() { cmdInput.select(); }, 50);
      }
    }
  }

  if (lenEl) {
    lenEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && e.shiftKey) { shiftEnterToCmd(e); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (qtyEl) { qtyEl.focus(); qtyEl.select(); }
      }
    });
    lenEl.addEventListener('input', wPreview);
    lenEl.addEventListener('focus', function() { this.select(); });
  }

  if (qtyEl) {
    qtyEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && e.shiftKey) { shiftEnterToCmd(e); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        wNextOptOrAdd('qty');
      }
    });
    qtyEl.addEventListener('input', wPreview);
    qtyEl.addEventListener('focus', function() { this.select(); });
  }

  [['wPrice','price'], ['wMemo','name']].forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    var optKey = pair[1];
    if (el) {
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.shiftKey) { shiftEnterToCmd(e); return; }
        if (e.key === 'Enter') { e.preventDefault(); wNextOptOrAdd(optKey); }
      });
    }
  });

  var revKgEl = document.getElementById('wRevKg');
  if (revKgEl) revKgEl.addEventListener('input', wCalcReverse);
}

