// ── レンダリング ───────────────────────────────────────────────
function wRenderRows() {
  var CO2_FACTOR = 2.1; // kg-CO2 per kg
  var empty       = document.getElementById('wEmpty');
  var tableWrap   = document.getElementById('wTableWrap');
  var tbody       = document.getElementById('wTbody');
  var tfoot       = document.getElementById('wTfoot');
  var cartBtn     = document.getElementById('wCartBtn');
  var mainHd      = document.getElementById('wMainHd');
  var thM2        = document.getElementById('wThM2');
  var thCo2       = document.getElementById('wThCo2');
  var thName      = document.getElementById('wThName');
  var thAmt       = document.getElementById('wThAmt');
  var thPaint     = document.getElementById('wThPaint');
  if (!empty || !tableWrap || !tbody || !tfoot) return;

  // 行が変わったときにボタンをリセット
  if (cartBtn && !_wCartAdded) {
    cartBtn.textContent = '＋ カートへ';
    cartBtn.classList.remove('added');
    cartBtn.disabled = false;
  }

  var topBar    = document.getElementById('wTopBar');
  var crumbCnt  = document.getElementById('wCrumbCount');
  var titleText = document.getElementById('wDocTitleText');

  if (_wRows.length === 0) {
    empty.style.display = 'flex';
    tableWrap.style.display = 'none';
    if (topBar)  topBar.style.display  = 'none';
    if (titleText) titleText.style.display = 'none';
    if (cartBtn) cartBtn.style.display = 'none';
    if (mainHd)  mainHd.style.display  = 'none';
    return;
  }

  empty.style.display = 'none';
  tableWrap.style.display = 'block';
  if (topBar)   topBar.style.display   = 'flex';
  if (titleText) {
    titleText.textContent = '印刷タイトル　' + wGetPrintTitle();
    titleText.style.display = '';
  }
  if (crumbCnt) crumbCnt.textContent = '(' + _wRows.length + '件)';
  if (cartBtn) cartBtn.style.display = '';
  if (mainHd)  mainHd.style.display  = 'flex';

  if (thM2)    thM2.style.display    = _wOpts.m2 ? '' : 'none';
  if (thCo2)   thCo2.style.display   = _wOpts.co2 ? '' : 'none';
  if (thName)  thName.style.display  = _wOpts.name ? '' : 'none';
  if (thAmt)   thAmt.style.display   = _wOpts.price ? '' : 'none';
  if (thPaint) thPaint.style.display = _wOpts.paint ? '' : 'none';

  var anyPrice    = _wRows.some(function(r) { return r.amount !== null; });
  var anyPaintAmt = _wRows.some(function(r) { return r.paintAmount !== null; });
  var sumKg = 0;
  var sumCo2 = 0;
  var sumM2v = 0;
  var sumAmt = 0;
  var sumPaint = 0;

  tbody.innerHTML = _wRows.map(function(r, i) {
    sumKg += r.kgTotal;
    sumCo2 += r.kgTotal * CO2_FACTOR;
    sumM2v += r.m2Total;
    if (r.amount !== null) sumAmt += r.amount;
    if (r.paintAmount !== null) sumPaint += r.paintAmount;

    var memoTitle = _esc(r.memo || '');
    var m2Cell = '<td class="w-r" style="' + (_wOpts.m2 ? '' : 'display:none;') + '">' + _wFmt(r.m2Total, 2) + '</td>';
    var co2Cell = '<td class="w-r w-co2" style="' + (_wOpts.co2 ? '' : 'display:none;') + '">' +
      (r.kgTotal * CO2_FACTOR).toFixed(1) + '</td>';
    var amtCell = r.amount !== null
      ? '<td class="w-r" style="' + (_wOpts.price ? '' : 'display:none;') + '">' + _wFmt(r.amount, 0) +
        '<span class="w-sub">@' + r.price + '円/kg</span></td>'
      : '<td class="w-r w-muted" style="' + (_wOpts.price ? '' : 'display:none;') + '">—</td>';
    var paintAmtCell = r.paintAmount !== null
      ? '<td class="w-r" style="' + (_wOpts.paint ? '' : 'display:none;') + '">' + _wFmt(r.paintAmount, 0) +
        '<span class="w-sub">@' + r.paintPrice + '円/m²</span></td>'
      : '<td class="w-r w-muted" style="' + (_wOpts.paint ? '' : 'display:none;') + '">—</td>';

    var trClasses = [];
    if (_wEditIdx === i) trClasses.push('w-editing');
    if (_wSelected.indexOf(i) !== -1) trClasses.push('w-sel');
    var trClass = trClasses.length ? ' class="' + trClasses.join(' ') + '"' : '';
    return (
      '<tr' + trClass + ' onclick="wRowClick(event,' + i + ')" title="クリックで編集 / Shift+クリックで範囲選択">' +
      '<td class="w-l w-n">' + String(i + 1).padStart(2, '0') + '</td>' +
      '<td class="w-l w-memo" style="' + (_wOpts.name ? '' : 'display:none') + '" title="' + memoTitle + '">' +
        _esc(r.memo || '—') +
      '</td>' +
      '<td class="w-l"><span class="w-kind-chip">' + _esc(r.kind) + '</span></td>' +
      '<td class="w-l w-spec-text">' + _esc(r.spec) + '</td>' +
      '<td class="w-r">' + r.len.toLocaleString() + '</td>' +
      '<td class="w-r">' + r.qty.toLocaleString() + '</td>' +
      '<td class="w-r">' + _wFmtKg(r.kg1) + '</td>' +
      '<td class="w-r">' + _wFmtKg(r.kgTotal) + '</td>' +
      co2Cell +
      m2Cell +
      amtCell +
      paintAmtCell +
      '<td class="w-x-cell">' +
        '<button onclick="event.stopPropagation();wDeleteRow(' + i + ')" class="w-del-x" title="削除">✕</button>' +
      '</td>' +
      '</tr>'
    );
  }).join('');

  var totalAmtCell = _wOpts.price
    ? (anyPrice
        ? '<td class="w-r w-total">' + _wFmt(sumAmt, 0) + '</td>'
        : '<td class="w-r w-muted">—</td>')
    : '';
  var totalPaintCell = _wOpts.paint
    ? (anyPaintAmt
        ? '<td class="w-r w-total">' + _wFmt(sumPaint, 0) + '</td>'
        : '<td class="w-r w-muted">—</td>')
    : '';
  var totalCo2Cell = _wOpts.co2
    ? '<td class="w-r w-total w-co2">' + sumCo2.toFixed(1) + '</td>'
    : '';
  var totalM2Cell = _wOpts.m2
    ? '<td class="w-r w-total">' + _wFmt(sumM2v, 2) + '</td>'
    : '';

  // 合計行の左カラム数（# + 部材名?? + 種類 + 規格 = 3 or 4）
  var leadCols = _wOpts.name ? 4 : 3;
  // 合計金額（有効な金額の合計のみ）
  var sumAllAmt = (_wOpts.price ? sumAmt : 0) + (_wOpts.paint ? sumPaint : 0);
  var showGrand = _wOpts.price || _wOpts.paint;
  // 合計金額は総額全列ぶちぬき（明細の末列まで）
  var totalCols =
    3 + // # + 種類 + 規格
    (_wOpts.name ? 1 : 0) +
    3 + // 長さ + 本数 + 1本重量
    1 + // 合計重量
    (_wOpts.co2 ? 1 : 0) +
    (_wOpts.m2 ? 1 : 0) +
    (_wOpts.price ? 1 : 0) +
    (_wOpts.paint ? 1 : 0) +
    1;  // ✕列

  tfoot.innerHTML =
    '<tr>' +
    '<td class="w-l" colspan="' + leadCols + '">合計</td>' +
    '<td class="w-r w-muted">—</td>' +
    '<td class="w-r w-muted">—</td>' +
    '<td class="w-r w-muted">—</td>' +
    '<td class="w-r w-total">' + _wFmtKg(sumKg) + '</td>' +
    totalCo2Cell +
    totalM2Cell +
    totalAmtCell +
    totalPaintCell +
    '<td></td>' +
    '</tr>' +
    (showGrand
      ? '<tr class="w-grand">' +
          '<td class="w-l w-grand-lbl" colspan="' + (totalCols - 2) + '">合計金額</td>' +
          '<td class="w-r w-grand-val" colspan="2">' + _wFmt(sumAllAmt, 0) + ' 円</td>' +
        '</tr>'
      : '');
}

