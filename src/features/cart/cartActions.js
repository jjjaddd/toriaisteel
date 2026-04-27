function cartAdd(cardId, btn) {
  var card = document.getElementById(cardId);
  if (!card) return;
  var titleEl = card.querySelector('.cc-desc');
  var title = titleEl ? titleEl.childNodes[0].textContent.trim() : '';
  var statsEl = card.querySelector('.cc-stats');
  var patEl = card.querySelector('.cc-pat');
  var diagHtml = '';
  card.querySelectorAll('[id^="diag_"]').forEach(function(d) { diagHtml += d.innerHTML; });
  var endLoss = parseInt(((document.getElementById('endloss') || {}).value), 10) || 150;
  var currentKind = '';
  if (typeof getCurrentKind === 'function') currentKind = getCurrentKind() || '';
  if (!currentKind && typeof curKind !== 'undefined') currentKind = curKind || '';
  if (!currentKind && window && typeof window.curKind !== 'undefined') currentKind = window.curKind || '';

  // 計算結果ペイロードから bars / remnants / meta を引き当てる
  var payload = typeof buildCardSelectionPayload === 'function'
    ? buildCardSelectionPayload(_lastCalcResult || {}, cardId)
    : null;
  var selectedBars = payload ? payload.selectedBars.slice() : (typeof getSelectedBarsFromResultData === 'function'
    ? getSelectedBarsFromResultData(_lastCalcResult, cardId)
    : (typeof getBarsForSelectedCard === 'function' ? getBarsForSelectedCard(cardId, _lastCalcResult) : parseBarsFromDiagHtml(diagHtml, 0, endLoss)));
  var rems = payload ? payload.remnants.slice() : (typeof extractRemnants === 'function'
    ? extractRemnants(_lastCalcResult, cardId)
    : (typeof extractRemnantsFromBars === 'function' ? extractRemnantsFromBars(selectedBars) : []));
  var resultMeta = payload ? Object.assign({}, payload.meta) : (_lastCalcResult && _lastCalcResult.meta ? Object.assign({}, _lastCalcResult.meta) : {});
  var remHtml = typeof buildRemHtmlFromRemnants === 'function'
    ? buildRemHtmlFromRemnants(rems)
    : '';

  var data = {
    cardId: cardId,
    title: title,
    isYield: !!card.closest('.yield-card, .yield-best'),
    isPat: !card.closest('.yield-card, .yield-best'),
    job: getJobInfo(),
    spec: (document.getElementById('spec') || {}).value || '',
    kind: currentKind,
    statsHtml: statsEl ? statsEl.innerHTML : '',
    patHtml: patEl ? patEl.innerHTML : '',
    diagHtml: diagHtml,
    remHtml: remHtml,
    bars: selectedBars,
    remnants: rems,
    resultMeta: resultMeta,
    endLoss: endLoss,
    motherSummary: Array.from(card.querySelectorAll('.pc-hd span')).map(function(el) { return (el.textContent || '').trim(); }).join(' + ')
  };
  addToCart(cardId, data);
  updateCartBadge();
  btn.textContent = '✓ 追加済み';
  btn.classList.add('added');
  btn.disabled = true;
  if (_lastCalcResult) saveCutHistory(_lastCalcResult, cardId);
}

function cartPrintCutting() {
  var cart = getCutCartItems();
  if (!cart.length) { alert('取り合いがカートにありません。'); return; }
  var html = buildCartCutPrintHtml(cart);
  if (!html) { alert('印刷データを生成できませんでした。'); return; }
  saveProjectCutHistory(cart, 'print');
  closeCartModal();
  var win = openOutputWindow(html, { title: '作業指示書', print: true, closeAfterPrint: true });
  if (!win) {
    showCartCutPreview(html);
    alert('印刷ウィンドウを開けなかったため、プレビューを表示しました。');
  }

  // 在庫消費: カート内の各カードについて残材在庫を消費
  (function consumeCartInventory() {
    var consumePayloads = [];
    cart.forEach(function(item) {
      var d = item.data || {};
      var cardId = d.cardId || '';
      if (!cardId) return;
      var payload = typeof buildPrintPayload === 'function'
        ? buildPrintPayload(cardId, window._lastCalcResult, d)
        : null;
      if (!payload) return;
      var hasSelected = typeof getSelectedInventoryIds === 'function' && getSelectedInventoryIds(payload.meta).length > 0;
      var hasConsumed = typeof getConsumedInventoryLengths === 'function' && getConsumedInventoryLengths(payload.bars, payload.meta).length > 0;
      if (hasSelected || hasConsumed) {
        consumePayloads.push({ cardId: cardId, bars: payload.bars, meta: payload.meta });
      }
    });
    if (!consumePayloads.length) return;
    var sig = JSON.stringify(consumePayloads.map(function(p) {
      return typeof buildInventoryConsumeSignature === 'function'
        ? buildInventoryConsumeSignature(p.cardId, p.bars, p.meta)
        : p.cardId;
    }).sort());
    if (window._lastConsumedInventorySignature === sig) return;
    window._lastConsumedInventorySignature = sig;
    consumePayloads.forEach(function(p) {
      if (typeof getSelectedInventoryIds === 'function' && getSelectedInventoryIds(p.meta).length > 0
          && typeof consumeSelectedInventoryRemnants === 'function') {
        consumeSelectedInventoryRemnants(p.meta.selectedInventoryRemnants);
      } else if (typeof consumeInventoryBars === 'function') {
        consumeInventoryBars(p.bars, p.meta);
      }
    });
  })();

  saveCart(getCart().filter(function(x) { return x && x.data && x.data.isWeight; }));
  updateCartBadge();
  renderCartModal();
  document.querySelectorAll('.cc-btn-add.added').forEach(function(btn) {
    var cardId = btn.id.replace('add_', '');
    var stillInCart = getCart().some(function(x) { return x.data.cardId === cardId; });
    if (!stillInCart) {
      btn.textContent = '＋';
      btn.classList.remove('added');
      btn.disabled = false;
    }
  });
}

function cartSaveCuttingPdf() {
  var cart = getCutCartItems();
  if (!cart.length) { alert('取り合いがカートにありません。'); return; }
  var html = buildCartCutPrintHtml(cart);
  if (!html) { alert('PDF保存用データを生成できませんでした。'); return; }
  saveProjectCutHistory(cart, 'pdf');
  closeCartModal();
  var win = openOutputWindow(html, {
    title: '作業指示書_PDF',
    print: true,
    closeAfterPrint: false
  });
  if (!win) {
    showCartCutPreview(html);
    alert('PDF保存用のウィンドウを開けなかったため、プレビューを表示しました。右上の印刷からPDF保存してください。');
  }
}

function getWeightKgmForSpec(kind, spec) {
  var hit0 = getAppSteelRow(kind, spec);
  if (hit0) return Number(hit0[1]) || 0;
  if (typeof getSteelRowsForKind === 'function') {
    var rows = getSteelRowsForKind(kind) || [];
    var hit = rows.find(function(row) { return row[0] === spec; });
    if (hit) return Number(hit[1]) || 0;
  }
  return 0;
}

function buildWeightRowsFromCutCart(cart) {
  var grouped = {};
  (cart || []).forEach(function(item) {
    var data = item.data || {};
    var resolvedKind = data.kind || (data.job && data.job.kind) || '';
    if (!resolvedKind && typeof curKind !== 'undefined') resolvedKind = curKind || '';
    var bars = Array.isArray(data.bars) && data.bars.length
      ? data.bars
      : parseBarsFromDiagHtml(data.diagHtml || '', 0, data.endLoss || 150);
    if (!bars.length && data.motherSummary) {
      String(data.motherSummary).split(/[+＋]/).forEach(function(part) {
        var match = part.match(/([\d,]+)\s*mm?\s*[×x]\s*(\d+)/i) || part.match(/([\d,]+)\s*[×x]\s*(\d+)/i);
        if (!match) return;
        var sl = parseInt((match[1] || '0').replace(/,/g, ''), 10) || 0;
        var qty = parseInt(match[2] || '0', 10) || 0;
        for (var i = 0; i < qty; i++) bars.push({ sl: sl, pat: [], loss: 0 });
      });
    }
    bars.forEach(function(bar) {
      var sl = parseInt(bar && bar.sl, 10) || 0;
      if (!sl) return;
      var key = [resolvedKind, data.spec || '', sl].join('::');
      if (!grouped[key]) {
        grouped[key] = { kind: resolvedKind, spec: data.spec || '', len: sl, qty: 0 };
      }
      grouped[key].qty += 1;
    });
  });
  return Object.keys(grouped).map(function(key) {
    var item = grouped[key];
    var kgm = getWeightKgmForSpec(item.kind, item.spec);
    var kg1 = typeof jisRound === 'function' ? jisRound(kgm * item.len / 1000, 1) : Math.round(kgm * item.len / 100) / 10;
    var ppm = typeof wGetPaintPerM === 'function' ? wGetPaintPerM(item.kind, item.spec) : 0;
    var m2_1 = ppm * item.len / 1000;
    return {
      kind: item.kind,
      spec: item.spec,
      memo: '取り合い母材',
      len: item.len,
      qty: item.qty,
      kgm: kgm,
      kg1: kg1,
      kgTotal: kg1 * item.qty,
      m2_1: m2_1,
      m2Total: m2_1 * item.qty,
      price: 0,
      amount: null,
      paintPrice: 0,
      paintAmount: null
    };
  }).sort(function(a, b) {
    if (a.kind !== b.kind) return String(a.kind).localeCompare(String(b.kind), 'ja');
    if (a.spec !== b.spec) return String(a.spec).localeCompare(String(b.spec), 'ja');
    return b.len - a.len;
  });
}

function cartSendToWeightTab() {
  var cart = getCutCartItems();
  if (!cart.length) { alert('取り合いがカートにありません。'); return; }
  var rows = buildWeightRowsFromCutCart(cart);
  if (!rows.length) { alert('重量タブに渡せる母材データがありません。'); return; }
  var job = (cart[0].data && cart[0].data.job) || {};
  if (typeof wRecallFromHistory === 'function') {
    wRecallFromHistory(rows, { price: false, name: false, rev: false, paint: false, m2: false, co2: false }, {
      client: job.client || '',
      name: job.name || ''
    });
  }
  if (typeof goPage === 'function') goPage('w');
  setTimeout(function() {
    if (typeof wRecallFromHistory === 'function') {
      wRecallFromHistory(rows, { price: false, name: false, rev: false, paint: false, m2: false, co2: false }, {
        client: job.client || '',
        name: job.name || ''
      });
    }
  }, 0);
  closeCartModal();
}
