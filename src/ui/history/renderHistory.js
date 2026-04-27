(function(global) {
  'use strict';

  var ns = global.Toriai.ui.history = global.Toriai.ui.history || {};

  function historyContainsKind(entry, kind) {
    if (!kind || !entry) return true;
    if (entry.kind === kind) return true;
    if (entry.project) {
      if (typeof entry.project.kind === 'string') {
        var parts = entry.project.kind.split('/').map(function(v) { return v.trim(); });
        if (parts.indexOf(kind) >= 0) return true;
      }
      if (Array.isArray(entry.project.sections)) {
        return entry.project.sections.some(function(section) {
          return section && section.kind === kind;
        });
      }
    }
    return false;
  }

  function renderWeightHistoryCard(h) {
    var w = h.weight || {};
    var kgStr   = w.sumKg ? (Math.round(w.sumKg * 10) / 10).toLocaleString() + ' kg' : '—';
    var amtStr  = w.sumAmt != null ? '概算 ' + Math.round(w.sumAmt).toLocaleString() + ' 円' : '';
    var rowCount = (w.rows || []).length;
    var clientLabel = h.client || '';
    return '<div class="hi-card hi-card--weight" style="background:#fff;border:1px solid #d9dde6;border-radius:18px;padding:18px 18px;box-shadow:0 12px 28px rgba(17,17,17,.08);margin:0;" onclick="showWeightHistPreview(' + h.id + ')">' +
      '<div class="hi-card-top">' +
        '<div style="display:flex;align-items:center;gap:6px">' +
          '<span class="hi-tag hi-tag-weight">⚖ 重量</span>' +
          (clientLabel ? '<span class="hi-card-client">' + escapeHtml(clientLabel) + '</span>' : '') +
          (h.name ? '<span style="font-size:12px;color:#8888a8">' + escapeHtml(h.name) + '</span>' : '') +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">' +
          '<div class="hi-card-date">' + escapeHtml(h.dateLabel || '') + '</div>' +
          '<button onclick="event.stopPropagation();deleteCutHistory(' + h.id + ')" class="hist-del-btn">削除</button>' +
        '</div>' +
      '</div>' +
      '<div class="hi-tags">' +
        '<span class="hi-tag">' + escapeHtml(h.spec || '複数規格') + '</span>' +
        '<span class="hi-tag">' + rowCount + '行</span>' +
        '<span class="hi-tag" style="font-weight:700;color:#1a1a2e">' + kgStr + '</span>' +
        (amtStr ? '<span class="hi-tag">' + amtStr + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  function renderProjectHistoryCard(h) {
    var sectionCount = (h.project.sections || []).length;
    var projectClient = h.client || '顧客未設定';
    return '<div class="hi-card" style="background:#fff;border:1px solid #d9dde6;border-radius:18px;padding:18px 18px;box-shadow:0 12px 28px rgba(17,17,17,.08);margin:0;" onclick="showHistPreview(' + h.id + ')">' +
      '<div class="hi-card-top">' +
        '<div class="hi-card-client">' + escapeHtml(projectClient) + '</div>' +
        '<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-shrink:0">' +
          '<div class="hi-card-date">' + escapeHtml(h.dateLabel || '') + '</div>' +
          '<button onclick="event.stopPropagation();deleteCutHistory(' + h.id + ')" class="hist-del-btn">削除</button>' +
        '</div>' +
      '</div>' +
      '<div class="hi-tags">' +
        '<span class="hi-tag hi-tag-kind">物件</span>' +
        '<span class="hi-tag">' + sectionCount + '鋼材</span>' +
        '<span class="hi-tag">工事: ' + escapeHtml(h.name || '-') + '</span>' +
        '<span class="hi-tag">納期: ' + escapeHtml(h.deadline || '-') + '</span>' +
      '</div>' +
    '</div>';
  }

  function renderCutHistoryCard(h) {
    var remCount   = h.result && h.result.remnants ? h.result.remnants.length : 0;
    var specLabel  = h.spec || '規格未設定';
    var clientLabel = h.client || '顧客未設定';
    return '<div class="hi-card" style="background:#fff;border:1px solid #d9dde6;border-radius:18px;padding:18px 18px;box-shadow:0 12px 28px rgba(17,17,17,.08);margin:0;" onclick="showHistPreview(' + h.id + ')">' +
      '<div class="hi-card-top">' +
        '<div class="hi-card-client">' + escapeHtml(clientLabel) + '</div>' +
        '<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-shrink:0">' +
          '<div class="hi-card-date">' + escapeHtml(h.dateLabel || '') + '</div>' +
          '<button onclick="event.stopPropagation();deleteCutHistory(' + h.id + ')" class="hist-del-btn">削除</button>' +
        '</div>' +
      '</div>' +
      '<div class="hi-tags">' +
        '<span class="hi-tag hi-tag-kind">' + escapeHtml(h.kind || '鋼材') + '</span>' +
        '<span class="hi-tag">' + escapeHtml(specLabel) + '</span>' +
        '<span class="hi-tag">工事: ' + escapeHtml(h.name || '-') + '</span>' +
        '<span class="hi-tag">納期: ' + escapeHtml(h.deadline || '-') + '</span>' +
        '<span class="hi-tag">端材: ' + remCount + '本</span>' +
      '</div>' +
    '</div>';
  }

  ns.renderHistory = function renderHistory() {
    var cont = document.getElementById('histList');
    var empty = document.getElementById('histEmpty');
    if (!cont) return;

    var hist = global.getCutHistory().slice();
    var fc      = (((document.getElementById('hsClient')  || {}).value) || '').toLowerCase();
    var fn      = (((document.getElementById('hsName')    || {}).value) || '').toLowerCase();
    var fdf     = ((document.getElementById('hsDateFrom') || {}).value || '');
    var fdt     = ((document.getElementById('hsDateTo')   || {}).value || '');
    var fs      = ((document.getElementById('hsSt')       || {}).value || '');
    var fk      = ((document.getElementById('hsKind')     || {}).value || '');
    var keyword = (((document.getElementById('hsKeyword') || {}).value) || '').toLowerCase();
    var sort    = ((document.getElementById('hsSort')     || {}).value || 'date_desc');

    if (fc) hist = hist.filter(function(h) { return (h.client || '').toLowerCase().indexOf(fc) >= 0; });
    if (fn) hist = hist.filter(function(h) { return (h.name || '').toLowerCase().indexOf(fn) >= 0; });
    var chipFrom = (typeof global._chipDateFrom !== 'undefined' ? global._chipDateFrom : '') || '';
    var chipTo   = (typeof global._chipDateTo   !== 'undefined' ? global._chipDateTo   : '') || '';
    if (chipFrom) hist = hist.filter(function(h) { return global.normDateStr(h.dateLabel || h.date) >= chipFrom; });
    if (chipTo)   hist = hist.filter(function(h) { return global.normDateStr(h.dateLabel || h.date) <= chipTo; });
    if (fdf && !chipFrom) hist = hist.filter(function(h) { return global.parseDateValue(h.date) >= global.parseDateValue(fdf); });
    if (fdt && !chipTo)   hist = hist.filter(function(h) { return global.parseDateValue(h.date) <= global.parseDateValue(fdt); });
    if (fs) hist = hist.filter(function(h) { return (h.spec || '') === fs; });
    if (fk) hist = hist.filter(function(h) { return historyContainsKind(h, fk); });
    if (keyword) hist = hist.filter(function(h) {
      return [h.client, h.name, h.spec, h.kind, h.worker].join(' ').toLowerCase().indexOf(keyword) >= 0;
    });

    var typeFilter = (typeof global._histTypeFilter !== 'undefined') ? global._histTypeFilter : 'all';
    if (typeFilter === 'cut') hist = hist.filter(function(h) { return !h.type || h.type === 'cut'; });
    if (typeFilter === 'weight') hist = hist.filter(function(h) { return h.type === 'weight'; });

    hist.sort(function(a, b) {
      if (sort === 'date_asc')     return global.parseDateValue(a.date) - global.parseDateValue(b.date);
      if (sort === 'deadline_asc') return global.parseDateValue(a.deadline) - global.parseDateValue(b.deadline);
      if (sort === 'spec_asc')     return String(a.spec || '').localeCompare(String(b.spec || ''), 'ja');
      return global.parseDateValue(b.date) - global.parseDateValue(a.date);
    });

    if (!hist.length) {
      cont.innerHTML = '';
      if (empty) empty.style.display = 'block';
      var countEmpty = document.getElementById('hiCountLabel');
      if (countEmpty) countEmpty.textContent = '0件';
      global.renderPager('histPagination', 1, 1, 'setHistoryPage');
      return;
    }

    if (empty) empty.style.display = 'none';
    var pageData = global.paginateItems(hist, global.historyPage, global.HISTORY_PAGE_SIZE);
    global.historyPage = pageData.page;

    var countLabel = document.getElementById('hiCountLabel');
    if (countLabel) countLabel.textContent = hist.length.toLocaleString() + '件';

    cont.style.display = 'flex';
    cont.style.flexDirection = 'column';
    cont.style.gap = '14px';
    cont.innerHTML = pageData.items.map(function(h) {
      if (h.type === 'weight') return renderWeightHistoryCard(h);
      if (h.type === 'cut_project' && h.project) return renderProjectHistoryCard(h);
      return renderCutHistoryCard(h);
    }).join('');

    global.renderPager('histPagination', global.historyPage, pageData.totalPages, 'setHistoryPage');
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
