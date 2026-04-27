
/* 鋼種タブ描画
 * Phase 1: 旧 <select id="dataKindSelect"> → 新 左サイドバー .dt-kind-list に置換
 * 後方互換: 旧セレクタが存在する場合も念のため更新する
 */
function renderDataKindTabs() {
  renderKindSidebar();

  // 旧 select を使っていた箇所の後方互換（存在しなければno-op）
  var legacySel = document.getElementById('dataKindSelect');
  if (legacySel) {
    var allKindsLegacy = getDataKindOrder();
    legacySel.innerHTML = allKindsLegacy.map(function(k) {
      var label = (SECTION_DATA[k] && SECTION_DATA[k].label) ? SECTION_DATA[k].label : k;
      return '<option value="' + k + '"' + (k === _dataKind ? ' selected' : '') + '>' + label + '</option>';
    }).join('');
  }
}

/* 左サイドバー: 鋼材カテゴリ一覧を描画 */
function renderKindSidebar() {
  var list = document.getElementById('dtKindList');
  if (!list) return;

  var kinds = getDataKindOrder();
  var query = normalizeDataSpecText(window._dtSidebarQuery || '');

  var htmlParts = [];
  kinds.forEach(function(k) {
    var data = SECTION_DATA[k];
    if (!data) return;
    var label = data.label || k;
    var count = Array.isArray(data.specs) ? data.specs.length : 0;

    if (query) {
      // カテゴリ名 or 鋼種キー or 配下のspec名のいずれかにヒットすれば表示
      var hay = [
        normalizeDataSpecText(label),
        normalizeDataSpecText(k),
        normalizeDataSpecText(data.jis || ''),
        normalizeDataSpecText(data.jisSub || '')
      ].join('|');
      var hit = hay.indexOf(query) >= 0;
      if (!hit && Array.isArray(data.specs)) {
        hit = data.specs.some(function(s) {
          return normalizeDataSpecText(s.name || '').indexOf(query) >= 0;
        });
      }
      if (!hit) return;
    }

    var active = (k === _dataKind) ? ' on' : '';
    htmlParts.push(
      '<button type="button" class="data-sb-item' + active + '" data-kind="' + k + '">' +
        '<span>' + label + '</span>' +
        '<span class="cnt">' + count + '</span>' +
      '</button>'
    );
  });

  if (!htmlParts.length) {
    list.innerHTML = '<div class="dt-kind-empty">該当なし</div>';
  } else {
    list.innerHTML = htmlParts.join('');
  }

  // クリックで選択
  Array.prototype.forEach.call(list.querySelectorAll('.data-sb-item[data-kind]'), function(btn) {
    btn.onclick = function() {
      var k = this.getAttribute('data-kind');
      if (k) dataSelectKind(k);
    };
  });

  // カスタム規格件数更新
  updateCustomCount();
}

/* 左サイドバー: 検索ボックスをマウント（初期化時に一度だけ） */
function mountSidebarSearch() {
  var slot = document.getElementById('dtSbSearch');
  if (!slot || slot.dataset.mounted === '1') return;
  slot.dataset.mounted = '1';

  slot.innerHTML =
    '<div class="dt-sb-search">' +
      '<span class="dt-sb-search-ico" aria-hidden="true">' +
        '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="7" cy="7" r="5"/><path d="M14 14l-3.5-3.5"/>' +
        '</svg>' +
      '</span>' +
      '<input id="dtSbSearchInput" type="text" autocomplete="off" ' +
        'placeholder="カテゴリを検索" aria-label="鋼材カテゴリを検索">' +
      '<button type="button" class="dt-sb-search-clear" id="dtSbSearchClear" aria-label="クリア" hidden>×</button>' +
    '</div>';

  var input = document.getElementById('dtSbSearchInput');
  var clear = document.getElementById('dtSbSearchClear');
  if (!input) return;

  input.oninput = function() {
    window._dtSidebarQuery = this.value || '';
    if (clear) clear.hidden = !this.value;
    renderKindSidebar();
  };
  input.onkeydown = function(e) {
    if (e.key === 'Escape') {
      this.value = '';
      window._dtSidebarQuery = '';
      if (clear) clear.hidden = true;
      renderKindSidebar();
      this.blur();
    } else if (e.key === 'Enter') {
      // 先頭の候補があれば選択
      var first = document.querySelector('#dtKindList .dt-kind-item');
      if (first) {
        var k = first.getAttribute('data-kind');
        if (k) dataSelectKind(k);
      }
    }
  };
  if (clear) {
    clear.onclick = function() {
      input.value = '';
      window._dtSidebarQuery = '';
      this.hidden = true;
      renderKindSidebar();
      input.focus();
    };
  }
}

function updateCustomCount() {
  var el = document.getElementById('dtCustomCount');
  if (!el) return;
  var n = 0;
  try {
    if (typeof getCustomSteelList === 'function') {
      var arr = getCustomSteelList();
      if (Array.isArray(arr)) n = arr.length;
    } else {
      // fallback: localStorage スキャン
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('custom_steel_') === 0) n++;
      }
    }
  } catch(e) {}
  el.textContent = n;
}

/* 鋼種選択 */
function dataSelectKind(kind) {
  _dataKind = kind;
  _dataSpecIdx = 0;
  _dtSpecQuery = '';   // カテゴリを変えたら 規格を選択 の検索をリセット
  _dtStdBulkMode = false; // 鋼種切替で一括モードは解除
  var bulkCb = document.getElementById('dtStdBulkCb');
  if (bulkCb) bulkCb.checked = false;
  renderDataKindTabs();
  renderDataSpecPicker();
  renderDataSpec();
}
