function wAddToCart() {
  if (_wRows.length === 0) { alert('リストが空です。'); return; }
  var btn = document.getElementById('wCartBtn');
  var sumKg = 0, sumAmt = 0, sumM2 = 0, anyPrice = false;
  _wRows.forEach(function(r) {
    sumKg += r.kgTotal;
    sumM2 += (r.m2Total || 0);
    if (r.amount !== null) { sumAmt += r.amount; anyPrice = true; }
  });

  var specs = [];
  _wRows.forEach(function(r) {
    if (specs.indexOf(r.spec) === -1) specs.push(r.spec);
  });
  var title = specs.slice(0, 2).join(' / ') + (specs.length > 2 ? ' 他' : '') +
              '（' + _wRows.length + '行）';

  var data = {
    isWeight: true,
    title: title,
    job: wGetJobForHistory(),
    rows: _wRows.slice(),
    sumKg: sumKg,
    sumM2: sumM2,
    sumAmt: sumAmt,
    anyPrice: anyPrice
  };

  if (typeof addToCart === 'function') addToCart('weight_' + Date.now(), data);
  if (typeof saveWeightHistory === 'function') {
    saveWeightHistory(
      JSON.parse(JSON.stringify(_wRows)),
      JSON.parse(JSON.stringify(_wOpts)),
      wGetJobForHistory()
    );
  }
  if (typeof updateCartBadge === 'function') updateCartBadge();
  _wCartAdded = true;
  if (btn) {
    btn.textContent = '✓ 追加済み';
    btn.classList.add('added');
    btn.disabled = true;
  }
}

function wPrint() {
  if (_wRows.length === 0) { alert('リストが空です。'); return; }
  if (typeof saveWeightHistory === 'function') {
    saveWeightHistory(
      JSON.parse(JSON.stringify(_wRows)),
      JSON.parse(JSON.stringify(_wOpts)),
      wGetJobForHistory()
    );
  }

  var CO2_FACTOR = 2.1;
  var optName  = !!_wOpts.name;
  var optCo2   = !!_wOpts.co2;
  var optM2    = !!_wOpts.m2;
  var optPrice = !!_wOpts.price;
  var optPaint = !!_wOpts.paint;
  var printTitle = _esc(wGetPrintTitle());

  var sumKg = 0, sumAmt = 0, sumPaint = 0, sumCo2 = 0, sumM2 = 0;
  var rows = _wRows.map(function(r, i) {
    sumKg += r.kgTotal;
    sumCo2 += r.kgTotal * CO2_FACTOR;
    sumM2 += (r.m2Total || 0);
    if (r.amount !== null) sumAmt += r.amount;
    if (r.paintAmount !== null) sumPaint += r.paintAmount;
    var memoStr = r.memo ? _esc(r.memo) : '—';
    return '<tr>' +
      '<td style="text-align:center">' + (i + 1) + '</td>' +
      (optName ? '<td>' + memoStr + '</td>' : '') +
      '<td>' + _esc(r.kind) + '</td>' +
      '<td>' + _esc(r.spec) + '</td>' +
      '<td style="text-align:right">' + r.len.toLocaleString() + '</td>' +
      '<td style="text-align:right">' + r.qty + '</td>' +
      '<td style="text-align:right;font-weight:700">' + _wFmtKg(r.kgTotal) + '</td>' +
      (optCo2   ? '<td style="text-align:right">' + (r.kgTotal * CO2_FACTOR).toFixed(1) + ' kg-CO₂</td>' : '') +
      (optM2    ? '<td style="text-align:right">' + _wFmt(r.m2Total || 0, 2) + '</td>' : '') +
      (optPrice ? (r.amount !== null
        ? '<td style="text-align:right">' + _wFmt(r.amount, 0) + '<br><small>@' + r.price + '円/kg</small></td>'
        : '<td style="text-align:center;color:#ccc">—</td>') : '') +
      (optPaint ? (r.paintAmount !== null
        ? '<td style="text-align:right">' + _wFmt(r.paintAmount, 0) + '<br><small>@' + r.paintPrice + '円/m²</small></td>'
        : '<td style="text-align:center;color:#ccc">—</td>') : '') +
      '</tr>';
  }).join('');

  var jobHeader = '';
  if (_wJobClient || _wJobName) {
    jobHeader = '<p style="margin:0 0 6px;font-size:11px;color:#555">' +
      (_wJobClient ? '顧客名: ' + _esc(_wJobClient) + '　' : '') +
      (_wJobName   ? '工事名: ' + _esc(_wJobName)   : '') +
      '</p>';
  }

  var footLeadCols = 5 + (optName ? 1 : 0);
  var html = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>' + printTitle + '</title>' +
    '<style>*{box-sizing:border-box}body{font-family:sans-serif;font-size:11px;padding:16px}' +
    'h2{font-size:13px;margin-bottom:4px}' +
    'table{border-collapse:collapse;width:100%}' +
    'th,td{border:1px solid #ddd;padding:5px 8px}' +
    'th{background:#f4f4fa;font-size:10px;font-weight:600}' +
    'tfoot td{font-weight:700;background:#f8f8fc}' +
    'small{color:#aaa}' +
    '@media print{body{padding:0}}' +
    '</style></head><body>' +
    '<h2>' + printTitle + '</h2>' + jobHeader +
    '<table><thead><tr>' +
    '<th>#</th>' +
    (optName  ? '<th>部材名</th>' : '') +
    '<th>種類</th><th>規格</th>' +
    '<th>長さ(mm)</th><th>本数</th><th>合計重量(kg)</th>' +
    (optCo2   ? '<th>CO₂(kg-CO₂)</th>' : '') +
    (optM2    ? '<th>塗装面積(m²)</th>' : '') +
    (optPrice ? '<th>概算金額(円)</th>' : '') +
    (optPaint ? '<th>塗装金額(円)</th>' : '') +
    '</tr></thead><tbody>' + rows + '</tbody>' +
    '<tfoot><tr>' +
    '<td colspan="' + footLeadCols + '" style="text-align:right">合　計</td>' +
    '<td style="text-align:right">' + _wFmtKg(sumKg) + ' kg</td>' +
    (optCo2   ? '<td style="text-align:right">' + sumCo2.toFixed(1) + ' kg-CO₂</td>' : '') +
    (optM2    ? '<td style="text-align:right">' + _wFmt(sumM2, 2) + '</td>' : '') +
    (optPrice ? '<td style="text-align:right">' + (sumAmt   > 0 ? _wFmt(sumAmt, 0) + ' 円' : '—') + '</td>' : '') +
    (optPaint ? '<td style="text-align:right">' + (sumPaint > 0 ? _wFmt(sumPaint, 0) + ' 円' : '—') + '</td>' : '') +
    '</tr></tfoot></table></body></html>';

  var w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(function(){ w.print(); }, 300); }
}
