function buildCartShortCopyText() {
  var cart = getCutCartItems();
  if (!cart.length) return '';
  var first = cart[0].data || {};
  var job = first.job || {};
  var lines = [
    '顧客情報: ' + formatCalcToolbarField(job.client),
    '工事名: ' + formatCalcToolbarField(job.name),
    '納期: ' + formatCalcToolbarField(job.deadline)
  ];
  collectCartCutSections(cart).forEach(function(section, index) {
    var cutSummary = Object.keys(section.sumMap).map(Number).sort(function(a, b) { return b - a; }).map(function(len) {
      return len.toLocaleString() + 'mm×' + section.sumMap[len];
    }).join(' / ');
    lines.push(
      (index + 1) + '. ' + [section.kind, section.spec].filter(Boolean).join(' '),
      '使用母材: ' + (section.motherSummary || '記載なし'),
      '本数: ' + (getStatValueFromHtml(section.statsHtml, '使用本数') || '記載なし'),
      '歩留まり: ' + (getStatValueFromHtml(section.statsHtml, '歩留まり') || '記載なし'),
      'カット内容: ' + (cutSummary || '記載なし')
    );
  });
  return lines.join('\n');
}

function cartCopyCutShort() {
  var text = buildCartShortCopyText();
  if (!text) { alert('取り合いがカートにありません。'); return; }
  function finishCopy() {
    closeCartModal();
    alert('共有用テキストをコピーしました。');
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(finishCopy).catch(function() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      finishCopy();
    });
    return;
  }
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  finishCopy();
}

function cartPrintWeight() {
  var cart = getCart().filter(function(x) { return x.data.isWeight; });
  if (!cart.length) { alert('重量リストがカートにありません。'); return; }

  // XSS 防御（2026-05-01）: メモ・部材名・規格・タイトルなどユーザー入力をエスケープ
  var _esc = (window.Toriai && window.Toriai.utils && window.Toriai.utils.html && window.Toriai.utils.html.escapeHtml) || function(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  };

  var allSections = cart.map(function(item) {
    var d = item.data;
    var sumKg = d.sumKg;
    var sumAmt = d.sumAmt;
    var anyPrice = d.anyPrice;
    var rows = (d.rows || []).map(function(r, i) {
      return '<tr style="border-bottom:1px solid #eee">' +
        '<td style="padding:4px 8px;text-align:center">' + (i + 1) + '</td>' +
        '<td style="padding:4px 8px">' + _esc(r.memo || '—') +
          (r.kuiku ? ' <span style="font-size:9px;background:#f0f0f0;padding:1px 5px;border-radius:8px">' + _esc(r.kuiku) + '</span>' : '') +
        '</td>' +
        '<td style="padding:4px 8px">' + _esc(r.kind) + '</td>' +
        '<td style="padding:4px 8px">' + _esc(r.spec) + '</td>' +
        '<td style="padding:4px 8px;text-align:right">' + r.len.toLocaleString() + '</td>' +
        '<td style="padding:4px 8px;text-align:right">' + r.qty + '</td>' +
        '<td style="padding:4px 8px;text-align:right;font-weight:700">' +
          (typeof _wFmtKg === 'function' ? _wFmtKg(r.kgTotal) : r.kgTotal.toFixed(1)) + '</td>' +
        (anyPrice ? '<td style="padding:4px 8px;text-align:right">' +
          (r.amount !== null ? Number(r.amount).toLocaleString() + ' 円' : '—') + '</td>' : '') +
      '</tr>';
    }).join('');

    return '<div style="margin-bottom:24px">' +
      '<h3 style="font-size:12px;margin-bottom:6px;color:#444">重量計算リスト — ' + _esc(d.title) + '</h3>' +
      '<table style="width:100%;border-collapse:collapse;font-size:11px">' +
      '<thead><tr style="background:#f4f4fa;border-bottom:2px solid #e0e0ea">' +
        '<th style="padding:5px 8px;text-align:left">#</th>' +
        '<th style="padding:5px 8px;text-align:left">部材名</th>' +
        '<th style="padding:5px 8px;text-align:left">種類</th>' +
        '<th style="padding:5px 8px;text-align:left">規格</th>' +
        '<th style="padding:5px 8px;text-align:right">長さ(mm)</th>' +
        '<th style="padding:5px 8px;text-align:right">本数</th>' +
        '<th style="padding:5px 8px;text-align:right">合計重量(kg)</th>' +
        (anyPrice ? '<th style="padding:5px 8px;text-align:right">概算金額(円)</th>' : '') +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '<tfoot><tr style="background:#f4f4fa;font-weight:700">' +
        '<td colspan="6" style="padding:5px 8px;text-align:right">合　計</td>' +
        '<td style="padding:5px 8px;text-align:right">' +
          (typeof _wFmtKg === 'function' ? _wFmtKg(sumKg) : sumKg.toFixed(1)) + ' kg</td>' +
        (anyPrice ? '<td style="padding:5px 8px;text-align:right">' + Number(sumAmt).toLocaleString() + ' 円</td>' : '') +
      '</tr></tfoot></table></div>';
  }).join('<hr style="border:none;border-top:1px solid #e0e0ea;margin:24px 0">');

  var html = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">' +
    '<title>重量計算書</title>' +
    '<style>*{box-sizing:border-box}body{font-family:sans-serif;font-size:12px;padding:20px}' +
    'h2{font-size:14px;margin-bottom:16px}' +
    '@media print{body{padding:0}}</style></head><body>' +
    '<h2>重量計算書</h2>' + allSections + '</body></html>';

  var w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(function(){ w.print(); }, 300); }
  saveCart(getCart().filter(function(x) { return !x.data.isWeight; }));
  updateCartBadge();
  renderCartModal();
  closeCartModal();
}

function cartExportWeightCsv() {
  var cart = getCart().filter(function(x) { return x.data.isWeight; });
  if (!cart.length) return;

  var lines = ['\uFEFF#,部材名,工区,種類,規格,長さ(mm),本数,合計重量(kg),概算金額(円),塗装金額(円)'];
  var idx = 1;
  cart.forEach(function(item) {
    (item.data.rows || []).forEach(function(r) {
      lines.push([
        idx++,
        '"' + (r.memo || '') + '"',
        '"' + (r.kuiku || '') + '"',
        '"' + r.kind + '"',
        '"' + r.spec + '"',
        r.len,
        r.qty,
        r.kgTotal.toFixed(2),
        r.amount !== null ? r.amount : '',
        r.paintAmount !== null ? r.paintAmount : ''
      ].join(','));
    });
  });

  var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '重量計算リスト.csv';
  a.click();
  URL.revokeObjectURL(url);
  saveCart(getCart().filter(function(x) { return !x.data.isWeight; }));
  updateCartBadge();
  renderCartModal();
  closeCartModal();
}

// ── コピー プレビュー ──────────────────────────────────────────
var _copyPendingTsv = '';

function cartCopyPreview(mode) {
  var cart = getCart().filter(function(x) { return x.data.isWeight; });
  if (!cart.length) return;

  var rows = [];
  cart.forEach(function(item) { rows = rows.concat(item.data.rows || []); });

  var tsv = '';
  var previewHtml = '';

  if (mode === 'all') {
    var header = ['#', '部材名', '工区', '種類', '規格', '長さ(mm)', '本数', '1本重量(kg)', '合計重量(kg)'];
    var hasAmt = rows.some(function(r) { return r.amount !== null; });
    var hasM2 = rows.some(function(r) { return r.m2Total != null; });
    var hasPaint = rows.some(function(r) { return r.paintAmount !== null; });
    if (hasM2) header.push('塗装面積(m²)');
    if (hasAmt) header.push('概算金額(円)');
    if (hasPaint) header.push('塗装金額(円)');
    var dataRows = rows.map(function(r, i) {
      var row = [i + 1, r.memo || '—', r.kuiku || '', r.kind, r.spec, r.len, r.qty,
                 (r.kg1 || (r.kgTotal / r.qty)).toFixed(3), r.kgTotal.toFixed(2)];
      if (hasM2) row.push(r.m2Total != null ? r.m2Total.toFixed(2) : '—');
      if (hasAmt) row.push(r.amount !== null ? Math.round(r.amount) : '');
      if (hasPaint) row.push(r.paintAmount !== null ? Math.round(r.paintAmount) : '');
      return row;
    });
    tsv = [header].concat(dataRows).map(function(r) { return r.join('\t'); }).join('\r\n');
    previewHtml = buildCopyPreviewTable(header, dataRows);
    document.getElementById('copyPreviewTitle').textContent = '📋 すべてをコピー';
  } else if (mode === 'parts-simple') {
    var headerSimple = ['種類', '規格', '長さ(mm)', '本数', '合計重量(kg)'];
    var dataRowsSimple = rows.map(function(r) {
      return [r.kind, r.spec, r.len, r.qty, r.kgTotal.toFixed(2)];
    });
    tsv = [headerSimple].concat(dataRowsSimple).map(function(r) { return r.join('\t'); }).join('\r\n');
    previewHtml = buildCopyPreviewTable(headerSimple, dataRowsSimple);
    document.getElementById('copyPreviewTitle').textContent = '📋 部材のみ（種類・規格・長さ・本数・重量）';
  } else if (mode === 'parts') {
    var header = ['#', '部材名', '工区', '種類', '規格', '長さ(mm)', '本数', '合計重量(kg)'];
    var hasAmt = rows.some(function(r) { return r.amount !== null; });
    if (hasAmt) header.push('概算金額(円)');
    var dataRows = rows.map(function(r, i) {
      var row = [i + 1, r.memo || '—', r.kuiku || '', r.kind, r.spec, r.len, r.qty, r.kgTotal.toFixed(2)];
      if (hasAmt) row.push(r.amount !== null ? Math.round(r.amount) : '');
      return row;
    });
    tsv = [header].concat(dataRows).map(function(r) { return r.join('\t'); }).join('\r\n');
    previewHtml = buildCopyPreviewTable(header, dataRows);
    document.getElementById('copyPreviewTitle').textContent = '📋 部材リスト';
  } else if (mode === 'amount') {
    var map = {};
    rows.forEach(function(r) {
      var key = r.kind + ' ' + r.spec;
      if (!map[key]) map[key] = { kind: r.kind, spec: r.spec, qty: 0, kg: 0, amt: 0, hasAmt: false };
      map[key].qty += r.qty;
      map[key].kg += r.kgTotal;
      if (r.amount !== null) { map[key].amt += r.amount; map[key].hasAmt = true; }
    });
    var header2 = ['種類', '規格', '本数', '合計重量(kg)', '概算金額(円)'];
    var dataRows2 = Object.values(map).map(function(v) {
      return [v.kind, v.spec, v.qty, v.kg.toFixed(2), v.hasAmt ? Math.round(v.amt) : '—'];
    });
    tsv = [header2].concat(dataRows2).map(function(r) { return r.join('\t'); }).join('\r\n');
    previewHtml = buildCopyPreviewTable(header2, dataRows2);
    document.getElementById('copyPreviewTitle').textContent = '📋 金額サマリー（規格別）';
  } else if (mode === 'total') {
    var sumKg = 0;
    var sumAmt = 0;
    var hasAmt2 = false;
    rows.forEach(function(r) {
      sumKg += r.kgTotal;
      if (r.amount !== null) { sumAmt += r.amount; hasAmt2 = true; }
    });
    var header3 = ['合計重量(kg)', '概算金額(円)'];
    var dataRows3 = [[sumKg.toFixed(2), hasAmt2 ? Math.round(sumAmt) : '—']];
    tsv = [header3].concat(dataRows3).map(function(r) { return r.join('\t'); }).join('\r\n');
    previewHtml = buildCopyPreviewTable(header3, dataRows3);
    document.getElementById('copyPreviewTitle').textContent = '📋 合計のみ';
  }

  _copyPendingTsv = tsv;
  document.getElementById('copyPreviewTable').innerHTML = previewHtml;
  document.getElementById('copyPreviewModal').style.display = 'flex';
}

function cartCopyCutResult() {
  var cart = getCart().filter(function(x) { return !x.data.isWeight; });
  if (!cart.length) { alert('取り合いがカートにありません。'); return; }
  var rows = [];
  cart.forEach(function(item) {
    var d = item.data || {};
    var sumMap = {};
    var bars = Array.isArray(d.bars) && d.bars.length ? d.bars : parseBarsFromDiagHtml(d.diagHtml || '', 0, d.endLoss || 150);
    bars.forEach(function(bar) {
      var pat = Array.isArray(bar.pat) ? bar.pat : [];
      pat.forEach(function(len) { if (len) sumMap[len] = (sumMap[len] || 0) + 1; });
    });
    Object.keys(sumMap).map(Number).sort(function(a, b) { return b - a; }).forEach(function(len) {
      rows.push([d.spec || '', len, sumMap[len]]);
    });
  });
  var header = ['規格', '長さ(mm)', '本数'];
  var tsv = [header].concat(rows).map(function(r) { return r.join('\t'); }).join('\r\n');
  var previewHtml = buildCopyPreviewTable(header, rows);
  document.getElementById('copyPreviewTitle').textContent = '📋 計算結果（切断リスト）';
  _copyPendingTsv = tsv;
  document.getElementById('copyPreviewTable').innerHTML = previewHtml;
  document.getElementById('copyPreviewModal').style.display = 'flex';
}

function cartCopyCutStock() {
  var cart = getCart().filter(function(x) { return !x.data.isWeight; });
  if (!cart.length) { alert('取り合いがカートにありません。'); return; }
  var rows = [];
  cart.forEach(function(item) {
    var d = item.data || {};
    var bars = Array.isArray(d.bars) && d.bars.length ? d.bars : parseBarsFromDiagHtml(d.diagHtml || '', 0, d.endLoss || 150);
    var slCount = {};
    bars.forEach(function(bar) { var sl = bar.sl || 0; if (sl) slCount[sl] = (slCount[sl] || 0) + 1; });
    Object.keys(slCount).map(Number).sort(function(a, b) { return b - a; }).forEach(function(sl) {
      rows.push([d.spec || '', sl, slCount[sl]]);
    });
  });
  var header = ['規格', '定尺', '使用本数'];
  // ヘッダーなし・値のみのTSV（メール・Excelにそのまま貼り付け用）
  var tsv = rows.map(function(r) { return r.join('\t'); }).join('\r\n');
  var previewHtml = buildCopyPreviewTable(header, rows);
  document.getElementById('copyPreviewTitle').textContent = '📋 使用予定の母材';
  _copyPendingTsv = tsv;
  document.getElementById('copyPreviewTable').innerHTML = previewHtml;
  document.getElementById('copyPreviewModal').style.display = 'flex';
}

function buildCopyPreviewTable(headers, rows) {
  var th = headers.map(function(h) {
    return '<th style="padding:5px 10px;background:var(--bg2);text-align:left;white-space:nowrap;font-size:10px">' + h + '</th>';
  }).join('');
  var tbody = rows.map(function(r) {
    var tds = r.map(function(c) {
      return '<td style="padding:4px 10px;border-top:1px solid var(--line);white-space:nowrap">' + c + '</td>';
    }).join('');
    return '<tr>' + tds + '</tr>';
  }).join('');
  return '<table style="border-collapse:collapse;width:100%"><thead><tr>' + th + '</tr></thead><tbody>' + tbody + '</tbody></table>';
}

function executeCopy() {
  if (!_copyPendingTsv) return;
  navigator.clipboard.writeText(_copyPendingTsv).then(function() {
    var btn = document.getElementById('copyExecBtn');
    if (btn) { btn.textContent = '✓ コピーしました'; btn.disabled = true; }
    setTimeout(closeCopyPreview, 900);
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = _copyPendingTsv;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    var btn = document.getElementById('copyExecBtn');
    if (btn) { btn.textContent = '✓ コピーしました'; btn.disabled = true; }
    setTimeout(closeCopyPreview, 900);
  });
}

function closeCopyPreview() {
  _copyPendingTsv = '';
  var m = document.getElementById('copyPreviewModal');
  if (m) m.style.display = 'none';
  var btn = document.getElementById('copyExecBtn');
  if (btn) { btn.textContent = '📋 コピー実行'; btn.disabled = false; }
}

var INVENTORY_REMNANT_SELECTED_KEY = 'toriai_inventory_remnant_selected_v1';

