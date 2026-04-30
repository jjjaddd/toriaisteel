
/* Phase 4: 検索 + 1行横スクロール + ドラッグスワイプ + ホイール横スクロール */
var _dtSpecQuery = '';

function renderDataSpecPicker() {
  const wrap = document.getElementById('dataSpecPicker');
  const kindData = SECTION_DATA[_dataKind];
  if (!wrap || !kindData) return;

  // まだ wrap の中身が空 or 骨組みがなければ骨組みを作る（検索入力は値を保持したいので都度作らない）
  var shell = wrap.querySelector('.data-specs-wrap');
  if (!shell) {
    wrap.innerHTML =
      '<div class="data-specs-wrap">' +
        '<div class="data-specs-search">' +
          '<span class="ico" aria-hidden="true">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
              '<circle cx="7" cy="7" r="5"/><path d="M14 14l-3.5-3.5"/>' +
            '</svg>' +
          '</span>' +
          '<input id="dtSpecSearchInput" type="text" autocomplete="off" ' +
            'placeholder="規格を検索（部分一致）" aria-label="規格を検索">' +
          '<button type="button" class="clear" id="dtSpecSearchClear" aria-label="クリア" hidden>×</button>' +
        '</div>' +
        '<div class="data-specs-scroll">' +
          '<div class="data-specs-bar" id="dataSpecBar"></div>' +
        '</div>' +
      '</div>';
    _bindDataSpecSearch();
    _bindDataSpecDragScroll();
  }

  // 入力状態を維持しつつチップを描画
  var input = document.getElementById('dtSpecSearchInput');
  if (input && input.value !== _dtSpecQuery) input.value = _dtSpecQuery;
  var clear = document.getElementById('dtSpecSearchClear');
  if (clear) clear.hidden = !_dtSpecQuery;

  _renderDataSpecChips();
}

/* 検索クエリで絞り込んだチップ列を再描画 */
function _renderDataSpecChips() {
  var kindData = SECTION_DATA[_dataKind];
  var bar = document.getElementById('dataSpecBar');
  if (!bar || !kindData) return;

  var specs = Array.isArray(kindData.specs) ? kindData.specs : [];
  var q = (typeof normalizeDataSpecText === 'function')
    ? normalizeDataSpecText(_dtSpecQuery || '')
    : (_dtSpecQuery || '').toLowerCase();

  var kEsc = _dataKind.replace(/'/g, "\\'");
  var html = '';
  var hit = 0;
  specs.forEach(function(s, i) {
    if (q) {
      var matches = typeof steelSpecMatchesQuery === 'function'
        ? steelSpecMatchesQuery(_dtSpecQuery || '', { kind: _dataKind, spec: s.name || '', name: s.name || '', label: kindData.label || '' })
        : normalizeDataSpecText(s.name || '').indexOf(q) >= 0;
      if (!matches) return;
    }
    hit++;
    var active = (i === _dataSpecIdx) ? ' on' : '';
    var nameEsc = String(s.name).replace(/"/g, '&quot;');
    html += '<button type="button" class="data-spec-chip' + active + '" ' +
      'data-index="' + i + '" ' +
      'onclick="selectDataSpec(' + i + ",'" + kEsc + "'" + ')">' +
      nameEsc + '</button>';
  });
  if (!hit) {
    html = '<span class="data-specs-empty">該当なし</span>';
  }
  // + カスタム追加ボタン（常時末尾）
  html += '<button type="button" class="dt-spec-add" title="カスタム規格を追加" onclick="dtCustomOpen()">+</button>';
  bar.innerHTML = html;

  // 選択中チップを可視領域へ
  try {
    var onEl = bar.querySelector('.data-spec-chip.on');
    if (onEl) {
      var barRect = bar.getBoundingClientRect();
      var chipRect = onEl.getBoundingClientRect();
      if (chipRect.left < barRect.left || chipRect.right > barRect.right) {
        bar.scrollLeft += (chipRect.left - barRect.left) - (barRect.width - chipRect.width) / 2;
      }
    }
  } catch(e) {}
}

/* 検索ボックスのイベントを1回だけバインド */
function _bindDataSpecSearch() {
  var input = document.getElementById('dtSpecSearchInput');
  var clear = document.getElementById('dtSpecSearchClear');
  if (!input) return;
  input.oninput = function() {
    _dtSpecQuery = this.value || '';
    if (clear) clear.hidden = !this.value;
    _renderDataSpecChips();
  };
  input.onkeydown = function(e) {
    if (e.key === 'Escape') {
      this.value = '';
      _dtSpecQuery = '';
      if (clear) clear.hidden = true;
      _renderDataSpecChips();
      this.blur();
    } else if (e.key === 'Enter') {
      // 絞り込み結果の最初のチップを選択
      var bar = document.getElementById('dataSpecBar');
      var first = bar && bar.querySelector('.data-spec-chip');
      if (first) {
        var idx = parseInt(first.getAttribute('data-index'), 10);
        if (!isNaN(idx)) selectDataSpec(idx, _dataKind);
      }
    }
  };
  if (clear) {
    clear.onclick = function() {
      input.value = '';
      _dtSpecQuery = '';
      this.hidden = true;
      _renderDataSpecChips();
      input.focus();
    };
  }
}

/* マウスドラッグ / ホイール横スクロール をバインド */
function _bindDataSpecDragScroll() {
  var bar = document.getElementById('dataSpecBar');
  if (!bar) return;

  var down = false;
  var dragging = false;
  var startX = 0;
  var startScroll = 0;
  var moved = 0;
  var pid = null;
  var DRAG_THRESHOLD = 5;

  bar.addEventListener('pointerdown', function(e) {
    if (e.button !== 0) return;
    down = true;
    dragging = false;
    moved = 0;
    startX = e.clientX;
    startScroll = bar.scrollLeft;
    pid = e.pointerId;
    // ここでは capture しない — 実際にドラッグ開始した時だけ capture する
  });

  bar.addEventListener('pointermove', function(e) {
    if (!down) return;
    var dx = e.clientX - startX;
    var abs = Math.abs(dx);
    if (abs > moved) moved = abs;
    if (!dragging && moved > DRAG_THRESHOLD) {
      dragging = true;
      bar.classList.add('dragging');
      try { bar.setPointerCapture(pid); } catch(_){}
    }
    if (dragging) {
      bar.scrollLeft = startScroll - dx;
      e.preventDefault();
    }
  });

  var endDrag = function(e) {
    if (!down) return;
    down = false;
    try { if (pid != null) bar.releasePointerCapture(pid); } catch(_){}
    pid = null;
    if (dragging) {
      // 遅延で dragging を解除、直後の click を suppress できるようにする
      setTimeout(function() {
        bar.classList.remove('dragging');
        dragging = false;
      }, 0);
    }
  };
  bar.addEventListener('pointerup', endDrag);
  bar.addEventListener('pointercancel', endDrag);

  // ドラッグした時だけ直後の click を無効化（通常クリックは素通し）
  bar.addEventListener('click', function(e) {
    if (dragging) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  // ホイール: 縦→横に変換（横スクロール可能な時だけ発動）
  bar.addEventListener('wheel', function(e) {
    if (e.deltaY === 0) return;
    if (bar.scrollWidth > bar.clientWidth + 1) {
      bar.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });
}

function toggleDataSpecDropdown(forceOpen) {
  var dd = document.getElementById('dataSpecDropdown');
  var input = document.getElementById('dataSpecInput');
  if (!dd) return;
  _dataSpecDropdownOpen = typeof forceOpen === 'boolean' ? forceOpen : !_dataSpecDropdownOpen;
  if (_dataSpecDropdownOpen && input) {
    // position:fixed で親のoverflow/z-indexを完全に回避
    var rect = input.getBoundingClientRect();
    dd.style.cssText = [
      'display:block',
      'position:fixed',
      'left:' + rect.left + 'px',
      'top:' + (rect.bottom + 4) + 'px',
      'width:' + rect.width + 'px',
      'background:#fff',
      'border:1.5px solid #ccc',
      'border-radius:8px',
      'box-shadow:0 6px 20px rgba(0,0,0,.12)',
      'max-height:300px',
      'overflow-y:auto',
      'z-index:99999'
    ].join(';');
  } else {
    dd.style.display = 'none';
  }
}

function renderDataSpecDropdownList(specs) {
  const dropdown = document.getElementById('dataSpecDropdown');
  if (!dropdown) return;
  dropdown.replaceChildren();

  if (!specs.length) {
    const empty = document.createElement('div');
    empty.className = 'data-spec-empty';
    empty.textContent = '候補がありません';
    dropdown.appendChild(empty);
    return;
  }

  specs.forEach(function(item) {
    var isActive = item.kind === _dataKind && item.index === _dataSpecIdx;
    const option = document.createElement('div');
    option.className = 'data-spec-option' + (isActive ? ' active' : '');
    option.dataset.index = item.index;
    option.dataset.kind = item.kind;
    option.tabIndex = 0;
    option.textContent = item.name;
    dropdown.appendChild(option);
  });
}

function filterDataSpecOptions(keyword) {
  const q = normalizeDataSpecText(keyword);
  const currentSpecs = getSortedSpecsForKind(_dataKind).map(function(item) {
    return { kind: item.kind, index: item.index, name: item.name, norm: normalizeDataSpecText(item.name) };
  });

  if (!q) {
    _dataSpecFiltered = currentSpecs;
  } else {
    _dataSpecFiltered = currentSpecs.filter(function(item) {
      return typeof steelSpecMatchesQuery === 'function'
        ? steelSpecMatchesQuery(keyword, { kind: item.kind, spec: item.name, name: item.name })
        : item.norm.indexOf(q) >= 0;
    });
    if (typeof compareSteelSearchResults === 'function') {
      _dataSpecFiltered.sort(function(a, b) {
        return compareSteelSearchResults(keyword, { kind: a.kind, spec: a.name }, { kind: b.kind, spec: b.name });
      });
    }
  }

  renderDataSpecDropdownList(_dataSpecFiltered);

  Array.prototype.forEach.call(document.querySelectorAll('#dataSpecDropdown .data-spec-option'), function(option, idx, all) {
    option.onkeydown = function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectDataSpec(
          parseInt(this.getAttribute('data-index'), 10),
          this.getAttribute('data-kind') || _dataKind
        );
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        var next = all[Math.min(idx + 1, all.length - 1)];
        if (next) next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx === 0) {
          var input = document.getElementById('dataSpecInput');
          if (input) input.focus();
        } else {
          all[idx - 1].focus();
        }
      } else if (e.key === 'Escape') {
        closeDataSpecDropdown();
        var inputEl = document.getElementById('dataSpecInput');
        if (inputEl) inputEl.focus();
      }
    };
  });
}

function closeDataSpecDropdown() {
  const dd = document.getElementById('dataSpecDropdown');
  _dataSpecDropdownOpen = false;
  if (dd) dd.style.display = 'none';
}

document.addEventListener('click', function(e) {
  var picker = document.querySelector('.data-spec-picker');
  if (!picker || !picker.contains(e.target)) {
    closeDataSpecDropdown();
  }
});
