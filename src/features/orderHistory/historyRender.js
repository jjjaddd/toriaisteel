function renderHistory() {
  var cont = document.getElementById('histList');
  var empty = document.getElementById('histEmpty');
  if (!cont) return;
  var hist = getCutHistory().slice();
  var fc = (((document.getElementById('hsClient') || {}).value) || '').toLowerCase();
  var fn = (((document.getElementById('hsName') || {}).value) || '').toLowerCase();
  var fdf = ((document.getElementById('hsDateFrom') || {}).value || '');
  var fdt = ((document.getElementById('hsDateTo') || {}).value || '');
  var keyword = (((document.getElementById('hsKeyword') || {}).value) || '').toLowerCase();
  var sort = ((document.getElementById('hsSort') || {}).value || 'date_desc');
  if (fc) hist = hist.filter(function(h) { return (h.client || '').toLowerCase().indexOf(fc) >= 0; });
  if (fn) hist = hist.filter(function(h) { return (h.name || '').toLowerCase().indexOf(fn) >= 0; });
  var chipFrom = _chipDateFrom || '';
  var chipTo   = _chipDateTo   || '';
  if (chipFrom) hist = hist.filter(function(h) { return normDateStr(h.dateLabel || h.date) >= chipFrom; });
  if (chipTo)   hist = hist.filter(function(h) { return normDateStr(h.dateLabel || h.date) <= chipTo;   });
  if (fdf && !chipFrom) hist = hist.filter(function(h) { return normDateStr(h.dateLabel || h.date) >= normDateStr(fdf); });
  if (fdt && !chipTo)   hist = hist.filter(function(h) { return normDateStr(h.dateLabel || h.date) <= normDateStr(fdt); });
  if (fk) hist = hist.filter(function(h) { return historyHasKind(h, fk); });
  if (_histTypeFilter === 'cut')
    hist = hist.filter(function(h) { return !h.type || h.type === 'cut'; });
  if (_histTypeFilter === 'weight')
    hist = hist.filter(function(h) { return h.type === 'weight'; });
  if (keyword) hist = hist.filter(function(h) { return [h.client, h.name, h.spec, h.kind, h.worker].join(' ').toLowerCase().indexOf(keyword) >= 0; });
  hist.sort(function(a, b) {
    if (sort === 'date_asc') return parseDateValue(a.date) - parseDateValue(b.date);
    if (sort === 'deadline_asc') return parseDateValue(a.deadline) - parseDateValue(b.deadline);
    return parseDateValue(b.date) - parseDateValue(a.date);
  });
  if (!hist.length) {
    cont.innerHTML = '';
    if (empty) empty.style.display = 'block';
    var countEmpty = document.getElementById('hiCountLabel');
    if (countEmpty) countEmpty.textContent = '0件';
    renderPager('histPagination', 1, 1, 'setHistoryPage');
    return;
  }
  if (empty) empty.style.display = 'none';
  var countLabel = document.getElementById('hiCountLabel');
  if (countLabel) countLabel.textContent = hist.length + '件';
  var pageData = paginateItems(hist, historyPage, HISTORY_PAGE_SIZE);
  historyPage = pageData.page;

  if (_histView === 'group') {
    var pager = document.getElementById('histPagination');
    if (pager) pager.innerHTML = '';

    var jobMap = {};
    hist.forEach(function(h) {
      var key = ((h.client || '') + '___' + (h.name || '')).trim();
      if (key === '___') key = '未設定___未設定';
      if (!jobMap[key]) {
        jobMap[key] = {
          client: h.client || '',
          name: h.name || '',
          items: [],
          sumKg: 0,
          cutCount: 0,
          weightCount: 0
        };
      }
      jobMap[key].items.push(h);
      if (h.type === 'weight' && h.weight) jobMap[key].sumKg += (h.weight.sumKg || 0);
      if (h.type === 'weight') jobMap[key].weightCount++;
      else jobMap[key].cutCount++;
    });

    var jobKeys = Object.keys(jobMap).sort(function(a, b) {
      return parseDateValue(jobMap[b].items[0].date) - parseDateValue(jobMap[a].items[0].date);
    });

    cont.innerHTML = jobKeys.map(function(key) {
      var g = jobMap[key];
      var label = (g.client && g.name) ? g.client + '　' + g.name
        : (g.client || g.name || '案件未設定');
      var kgStr = g.sumKg > 0 ? (Math.round(g.sumKg * 10) / 10).toLocaleString() + ' kg' : '';
      return '<div class="hist2-group" style="' + HIST_GROUP_INLINE_STYLE + '">' +
        '<div class="hist2-group-hd" style="background:#ffffff;border-bottom:1px solid #eceff5;" onclick="this.parentElement.classList.toggle(\'open\')">' +
          '<div style="flex:1;min-width:0">' +
            '<div class="hist2-group-title">' + label + '</div>' +
            '<div class="hist2-group-meta">' +
              (g.cutCount ? '<span>✂ 取り合い ' + g.cutCount + '件</span>' : '') +
              (g.weightCount ? '<span>⚖ 重量計算 ' + g.weightCount + '件</span>' : '') +
              (kgStr ? '<span style="font-weight:700;color:#1a1a2e">計 ' + kgStr + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<span class="hist2-group-arrow">›</span>' +
        '</div>' +
        '<div class="hist2-group-body" style="background:#ffffff;padding:0 12px 12px;">' +
          g.items.map(function(h) {
            return _renderHistRow(h);
          }).join('') +
        '</div>' +
      '</div>';
    }).join('');
  } else {
    cont.style.display = 'flex';
    cont.style.flexDirection = 'column';
    cont.style.gap = '14px';
    cont.innerHTML = pageData.items.map(function(h) { return _renderHistRow(h); }).join('');
    renderPager('histPagination', historyPage, pageData.totalPages, 'setHistoryPage');
  }
}

var _weightHistPreviewId = null;

function showWeightHistPreview(id) {
  var hist = getCutHistory();
  // == で比較（JSON.parse後の型変換に対応）
  var entry = hist.filter(function(h) { return h.id == id; })[0];
  if (!entry) return;
  // type が未設定のエントリーも weight として扱う（weightプロパティがあれば）
  if (entry.type && entry.type !== 'weight') return;
  if (!entry.weight) return;

  _weightHistPreviewId = id;
  var modal = document.getElementById('weightHistPreviewModal');
  var body  = document.getElementById('weightHistPreviewBody');
  var meta  = document.getElementById('weightHistPreviewMeta');
  if (!modal || !body) return;

  var w = entry.weight;
  var rows = w.rows || [];
  var anyPrice = rows.some(function(r) { return r.amount !== null && r.amount !== undefined; });
  var anyPaint = rows.some(function(r) { return r.paintAmount !== null && r.paintAmount !== undefined; });
  var anyKuiku = rows.some(function(r) { return !!r.kuiku; });
  var anyMemo  = rows.some(function(r) { return !!r.memo; });

  // メタ情報
  var metaParts = [entry.dateLabel || ''];
  if (entry.client) metaParts.push(entry.client);
  if (entry.name)   metaParts.push(entry.name);
  if (meta) meta.textContent = metaParts.filter(Boolean).join('　');

  var TD  = 'padding:9px 12px;font-size:12px;color:#1a1a2e;border-bottom:1px solid #f0f0f0;';
  var TDR = TD + 'text-align:right;';
  var TDG = TD + 'color:#888;text-align:center;';

  var sumKg = 0, sumAmt = 0, sumPaint = 0;
  var rowsHtml = rows.map(function(r, i) {
    sumKg += (r.kgTotal || 0);
    if (r.amount     != null) sumAmt   += r.amount;
    if (r.paintAmount != null) sumPaint += r.paintAmount;
    var cells = '<td style="' + TDG + '">' + (i + 1) + '</td>';
    if (anyMemo)  cells += '<td style="' + TD + '">' + (r.memo ? _escHtml(r.memo) : '<span style="color:#ccc">—</span>') + '</td>';
    cells += '<td style="' + TD + '">' + _escHtml(r.kind || '') + '</td>';
    cells += '<td style="' + TD + '">' + _escHtml(r.spec || '') + '</td>';
    cells += '<td style="' + TDR + '">' + (r.len || 0).toLocaleString() + '</td>';
    cells += '<td style="' + TDR + '">' + (r.qty || 0) + '</td>';
    cells += '<td style="' + TDR + 'font-weight:700;">' + (Math.round((r.kgTotal || 0) * 10) / 10).toLocaleString() + ' kg</td>';
    if (anyKuiku) cells += '<td style="' + TD + '">' + (r.kuiku ? _escHtml(r.kuiku) : '<span style="color:#ccc">—</span>') + '</td>';
    if (anyPrice) cells += '<td style="' + TDR + '">' + (r.amount != null ? Math.round(r.amount).toLocaleString() + ' 円' : '<span style="color:#ccc">—</span>') + '</td>';
    if (anyPaint) cells += '<td style="' + TDR + '">' + (r.paintAmount != null ? Math.round(r.paintAmount).toLocaleString() + ' 円' : '<span style="color:#ccc">—</span>') + '</td>';
    return '<tr>' + cells + '</tr>';
  }).join('');

  var TH  = 'padding:8px 12px;font-size:10px;font-weight:600;color:#999;border-bottom:1px solid #e8e8e8;text-align:left;white-space:nowrap;';
  var THR = TH + 'text-align:right;';
  var ths = '<th style="' + TH + '">#</th>';
  if (anyMemo)  ths += '<th style="' + TH  + '">部材名</th>';
  ths += '<th style="' + TH  + '">種類</th>';
  ths += '<th style="' + TH  + '">規格</th>';
  ths += '<th style="' + THR + '">長さ (mm)</th>';
  ths += '<th style="' + THR + '">本数</th>';
  ths += '<th style="' + THR + '">合計重量</th>';
  if (anyKuiku) ths += '<th style="' + TH  + '">工区</th>';
  if (anyPrice) ths += '<th style="' + THR + '">概算金額</th>';
  if (anyPaint) ths += '<th style="' + THR + '">塗装金額</th>';

  var kgStr   = (Math.round(sumKg * 10) / 10).toLocaleString() + ' kg';
  var colSpan = 5 + (anyMemo?1:0) + (anyKuiku?1:0) + (anyPrice?1:0) + (anyPaint?1:0);
  var FT  = 'padding:10px 12px;font-size:12px;border-top:2px solid #e8e8e8;';
  var footCols = '<td colspan="' + (colSpan - (anyPrice?1:0) - (anyPaint?1:0)) + '" style="' + FT + 'text-align:right;color:#888;font-weight:600;">合　計</td>';
  footCols += '<td style="' + FT + 'text-align:right;font-weight:800;color:#1a1a2e;">' + kgStr + '</td>';
  if (anyPrice) footCols += '<td style="' + FT + 'text-align:right;font-weight:700;color:#1a1a2e;">' + (sumAmt > 0 ? Math.round(sumAmt).toLocaleString() + ' 円' : '—') + '</td>';
  if (anyPaint) footCols += '<td style="' + FT + 'text-align:right;font-weight:700;color:#1a1a2e;">' + (sumPaint > 0 ? Math.round(sumPaint).toLocaleString() + ' 円' : '—') + '</td>';

  body.innerHTML =
    '<table style="width:100%;border-collapse:collapse;">' +
      '<thead><tr>' + ths + '</tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody>' +
      '<tfoot><tr>' + footCols + '</tr></tfoot>' +
    '</table>';

  modal.style.display = 'flex';
}

function closeWeightHistPreview() {
  var modal = document.getElementById('weightHistPreviewModal');
  if (modal) modal.style.display = 'none';
  _weightHistPreviewId = null;
}

function printWeightHistPreview() {
  var body = document.getElementById('weightHistPreviewBody');
  if (!body) return;
  var meta = (document.getElementById('weightHistPreviewMeta') || {}).textContent || '';
  var html = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>重量計算プレビュー</title>' +
    '<style>' +
    '*{box-sizing:border-box}' +
    '@page{size:A4 landscape;margin:10mm 12mm}' +
    'body{font-family:sans-serif;font-size:11px;padding:14px;color:#000}' +
    'h2{font-size:13px;margin:0 0 4px;color:#1a1a2e}' +
    '.meta{font-size:10px;color:#888;margin-bottom:10px;border-bottom:1px solid #ccc;padding-bottom:6px}' +
    'table{border-collapse:collapse;width:100%}' +
    'th{font-size:10px;font-weight:700;color:#444;border-bottom:2px solid #000;padding:5px 8px;text-align:left;white-space:nowrap;background:#f4f4f4}' +
    'td{border-bottom:1px solid #ddd;padding:5px 8px;font-size:11px}' +
    'tfoot td{font-weight:700;border-top:2px solid #000;border-bottom:none;padding:6px 8px;background:#f8f8f8}' +
    '@media print{body{padding:0}}' +
    '</style></head><body>' +
    '<h2>重量計算プレビュー</h2>' +
    (meta ? '<div class="meta">' + meta + '</div>' : '') +
    body.innerHTML +
    '</body></html>';
  var w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(function(){ w.print(); }, 300); }
}

function recallWeightFromPreview() {
  var id = _weightHistPreviewId;
  if (!id) return;
  closeWeightHistPreview();
  var hist = getCutHistory();
  var entry = hist.filter(function(h) { return h.id == id; })[0];
  if (!entry || !entry.weight) return;
  // 先にデータをセットしてからタブを開く
  // → wInit() 内の wRenderRows() が正しいデータで描画される
  if (typeof wRecallFromHistory === 'function') {
    wRecallFromHistory(entry.weight.rows, entry.weight.opts, entry);
  }
  if (typeof goPage === 'function') goPage('w');
}

function recallWeightHistory(id) {
  showWeightHistPreview(id);
}

function clearHistSearch() {
  ['hsClient', 'hsName', 'hsDateFrom', 'hsDateTo', 'hsSt', 'hsKind', 'hsKeyword'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var sortEl = document.getElementById('hsSort');
  if (sortEl) sortEl.value = 'date_desc';
  _hiChipActive = 0;
  _chipDateFrom = '';
  _chipDateTo   = '';
  [1,2,3,4].forEach(function(i) {
    var c = document.getElementById('hChip' + i);
    if (c) c.classList.remove('on');
  });
  var hsSbCont = document.getElementById('hsSbKinds');
  if (hsSbCont) hsSbCont.querySelectorAll('.hi-sb-item').forEach(function(el) { el.classList.remove('on'); });
  _histTypeFilter = 'all';
  ['hTypeAll', 'hTypeCut', 'hTypeWeight'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.classList.toggle('on', id === 'hTypeAll'); }
  });
  _histView = 'flat';
  hiSetView('flat');
}
