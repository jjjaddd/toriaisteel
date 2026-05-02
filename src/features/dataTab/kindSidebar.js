
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

function dtSbEscapeHtml(value) {
  if (typeof escapeHtml === 'function') return escapeHtml(value == null ? '' : String(value));
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dtSbEscapeAttr(value) {
  return dtSbEscapeHtml(value).replace(/\n/g, '&#10;');
}

var _dtSbTooltipTimer = null;

function ensureDataSidebarTooltip() {
  var tip = document.getElementById('dtSbTooltip');
  if (tip) return tip;
  tip = document.createElement('div');
  tip.id = 'dtSbTooltip';
  tip.className = 'dt-sb-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.appendChild(tip);
  tip.onmouseenter = function() {
    if (_dtSbTooltipTimer) clearTimeout(_dtSbTooltipTimer);
    _dtSbTooltipTimer = null;
  };
  tip.onmouseleave = scheduleDataSidebarTooltipHide;
  return tip;
}

function scheduleDataSidebarTooltipHide() {
  if (_dtSbTooltipTimer) clearTimeout(_dtSbTooltipTimer);
  _dtSbTooltipTimer = setTimeout(hideDataSidebarTooltip, 120);
}

function hideDataSidebarTooltip() {
  if (_dtSbTooltipTimer) clearTimeout(_dtSbTooltipTimer);
  _dtSbTooltipTimer = null;
  var tip = document.getElementById('dtSbTooltip');
  if (!tip) return;
  tip.hidden = true;
  tip.classList.remove('show');
  tip.innerHTML = '';
}

function showDataSidebarTooltip(btn) {
  if (_dtSbTooltipTimer) clearTimeout(_dtSbTooltipTimer);
  _dtSbTooltipTimer = null;
  var tips = btn ? (btn.getAttribute('data-tips') || '') : '';
  if (!tips) return;
  var names = tips.split('\n').filter(Boolean);
  if (!names.length) return;

  var tip = ensureDataSidebarTooltip();
  var kind = btn.getAttribute('data-kind') || '';
  var more = parseInt(btn.getAttribute('data-tip-more') || '0', 10);
  var html = '<div class="dt-sb-tooltip-title">一致した規格</div>' +
    '<div class="dt-sb-tooltip-list">' +
      names.map(function(name, i) {
        var idx = btn.getAttribute('data-tip-index-' + i);
        return '<button type="button" class="dt-sb-tooltip-row" data-kind="' + dtSbEscapeAttr(kind) + '" data-index="' + dtSbEscapeAttr(idx) + '">' +
          dtSbEscapeHtml(name) +
        '</button>';
      }).join('') +
    '</div>';
  if (more > 0) html += '<div class="dt-sb-tooltip-more">他 ' + more + ' 件</div>';
  tip.innerHTML = html;
  Array.prototype.forEach.call(tip.querySelectorAll('.dt-sb-tooltip-row[data-kind][data-index]'), function(row) {
    row.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      var k = this.getAttribute('data-kind');
      var idx = parseInt(this.getAttribute('data-index'), 10);
      if (!k || isNaN(idx)) return;
      _dataKind = k;
      _dataSpecIdx = idx;
      _dtSpecQuery = '';
      _dtStdBulkMode = false;
      var bulkCb = document.getElementById('dtStdBulkCb');
      if (bulkCb) bulkCb.checked = false;
      renderDataKindTabs();
      renderDataSpecPicker();
      renderDataSpec();
      hideDataSidebarTooltip();
    };
  });
  tip.hidden = false;
  tip.classList.add('show');

  var rect = btn.getBoundingClientRect();
  var gap = 10;
  var left = rect.right + gap;
  var top = rect.top;
  var maxLeft = window.innerWidth - tip.offsetWidth - 10;
  if (left > maxLeft) left = Math.max(10, rect.left - tip.offsetWidth - gap);
  var maxTop = window.innerHeight - tip.offsetHeight - 10;
  if (top > maxTop) top = Math.max(10, maxTop);
  tip.style.left = Math.max(10, left) + 'px';
  tip.style.top = Math.max(10, top) + 'px';
}

/* 左サイドバー: 鋼材カテゴリ一覧を描画 */
function renderKindSidebar() {
  var list = document.getElementById('dtKindList');
  if (!list) return;

  var kinds = getDataKindOrder();
  var query = normalizeDataSpecText(window._dtSidebarQuery || '');
  var tipLimit = 12;

  var htmlParts = [];
  kinds.forEach(function(k) {
    var data = SECTION_DATA[k];
    if (!data) return;
    var label = data.label || k;
    var count = Array.isArray(data.specs) ? data.specs.length : 0;

    var matchedSpecs = [];
    if (query) {
      // カテゴリ名 or 鋼種キー or 配下のspec名のいずれかにヒットすれば表示
      var hay = [
        normalizeDataSpecText(label),
        normalizeDataSpecText(k),
        normalizeDataSpecText(data.jis || ''),
        normalizeDataSpecText(data.jisSub || '')
      ].join('|');
      var hit = hay.indexOf(query) >= 0;
      if (Array.isArray(data.specs)) {
        data.specs.forEach(function(s, i) {
          if (normalizeDataSpecText(s.name || '').indexOf(query) >= 0) {
            matchedSpecs.push({ name: String(s.name || ''), index: i });
          }
        });
        if (!hit) hit = matchedSpecs.length > 0;
      }
      if (!hit) return;
    }

    var active = (k === _dataKind) ? ' on' : '';
    var visibleTips = matchedSpecs.slice(0, tipLimit);
    var moreCount = Math.max(0, matchedSpecs.length - visibleTips.length);
    var tipAttrs = '';
    if (visibleTips.length) {
      tipAttrs = ' data-tips="' + dtSbEscapeAttr(visibleTips.map(function(item) { return item.name; }).join('\n')) + '" data-tip-more="' + moreCount + '" aria-describedby="dtSbTooltip"';
      visibleTips.forEach(function(item, i) {
        tipAttrs += ' data-tip-index-' + i + '="' + item.index + '"';
      });
    }
    htmlParts.push(
      '<button type="button" class="data-sb-item' + active + '" data-kind="' + dtSbEscapeAttr(k) + '"' + tipAttrs + '>' +
        '<span>' + dtSbEscapeHtml(label) + '</span>' +
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
    btn.onmouseenter = function() { showDataSidebarTooltip(this); };
    btn.onmouseleave = scheduleDataSidebarTooltipHide;
    btn.onfocus = function() { showDataSidebarTooltip(this); };
    btn.onblur = scheduleDataSidebarTooltipHide;
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
      var first = document.querySelector('#dtKindList .data-sb-item[data-kind]');
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
  window.addEventListener('scroll', hideDataSidebarTooltip, true);
  window.addEventListener('resize', hideDataSidebarTooltip);
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
