function getSelectedInventoryRemnants() {
  return loadSelectedInventoryRemnantsState();
}

function saveSelectedInventoryRemnants(data) {
  _selectedInventoryRemnantsState = data && typeof data === 'object' ? data : {};
  persistSelectedInventoryRemnantsState();
}

function getSelectedInventoryRemnantDetails() {
  var grouped = typeof getInventoryForCurrentSpec === 'function' ? getInventoryForCurrentSpec() : [];
  var state = getSelectedInventoryRemnants();
  return Object.keys(state).map(function(key) {
    var item = grouped.find(function(group) {
      return getRemnantInventoryKey(group) === key;
    });
    if (!item) return null;
    var qty = Math.max(1, Math.min(item.qty || 1, parseInt((state[key] || {}).qty, 10) || 1));
    return {
      key: key,
      len: parseInt(item.len, 10) || 0,
      qty: qty,
      ids: (item.ids || []).slice(0, qty).map(function(id) { return String(id); }),
      spec: item.spec || '',
      kind: item.kind || '',
      company: item.company || '',
      note: item.note || ''
    };
  }).filter(Boolean);
}

function updateInventoryUseButton() {
  var btn = document.getElementById('invUseBtn');
  var sel = document.getElementById('invSelect');
  if (!btn) return;
  btn.textContent = '追加';
  btn.disabled = !(sel && sel.value);
}

function buildInventoryDropdown() {
  var cont = document.getElementById('invDropCont');
  var sel = document.getElementById('invSelect');
  var badge = document.getElementById('invBadge');
  var items = getInventoryForCurrentSpec();

  if (cont) cont.style.display = items.length ? 'block' : 'none';
  if (badge) {
    badge.textContent = '在庫 ' + items.reduce(function(sum, item) {
      return sum + (item.qty || 0);
    }, 0) + '本';
  }
  if (!sel) return;

  sel.innerHTML = '<option value="">在庫から追加する残材を選択</option>';
  items.forEach(function(item) {
    var option = document.createElement('option');
    option.value = getRemnantInventoryKey(item);
    option.textContent = Number(item.len || 0).toLocaleString() + 'mm / 在庫' + (item.qty || 0) + '本';
    sel.appendChild(option);
  });
  updateInventoryUseButton();
}

function addFromInventory() {
  var sel = document.getElementById('invSelect');
  if (!sel || !sel.value) return;

  var items = getInventoryForCurrentSpec();
  var chosen = items.find(function(item) {
    return getRemnantInventoryKey(item) === sel.value;
  });
  if (!chosen) return;

  var state = getSelectedInventoryRemnants();
  var key = getRemnantInventoryKey(chosen);
  if (!state[key]) state[key] = { qty: 1 };
  saveSelectedInventoryRemnants(state);

  sel.value = '';
  syncInventoryToRemnants();
  updateInventoryUseButton();
}

function removeRemnant(i) {
  var row = document.getElementById('remRow' + i);
  if (!row) return;

  var state = getSelectedInventoryRemnants();
  delete state[row.dataset.inventoryKey];
  saveSelectedInventoryRemnants(state);
  syncInventoryToRemnants();
  updateInventoryUseButton();
}

function saveRemnants() {
  var state = {};
  document.querySelectorAll('#remnantList .rem-row[data-source="inventory"]').forEach(function(row) {
    var qtyEl = row.querySelector('.rem-qty');
    var maxQty = Math.max(1, parseInt(row.dataset.maxQty || '1', 10));
    state[row.dataset.inventoryKey] = {
      qty: Math.max(1, Math.min(maxQty, parseInt(qtyEl && qtyEl.value, 10) || 1))
    };
  });
  saveSelectedInventoryRemnants(state);
}

function createInventoryRemnantRow(item, selectedQty) {
  var list = document.getElementById('remnantList');
  if (!list) return null;

  var i = remnantCount++;
  var usage = Math.max(1, Math.min(item.qty || 1, selectedQty || 1));
  var row = document.createElement('div');
  row.className = 'rem-row';
  row.id = 'remRow' + i;
  row.dataset.source = 'inventory';
  row.dataset.inventoryKey = getRemnantInventoryKey(item);
  row.dataset.maxQty = String(item.qty || 1);
  row.innerHTML =
    '<div class="rem-label-group">' +
      '<span class="rem-label-title">' + Number(item.len || 0).toLocaleString() + 'mm</span>' +
      '<span class="rem-label-sub">在庫 ' + (item.qty || 1) + '本</span>' +
    '</div>' +
    '<label class="rem-qty-group" for="remQty' + i + '">' +
      '<span class="rem-qty-label">今回使う本数</span>' +
      '<input type="number" class="rem-qty" id="remQty' + i + '" min="1" max="' + (item.qty || 1) + '" value="' + usage + '" oninput="saveRemnants()">' +
    '</label>' +
    '<button type="button" class="rem-del" aria-label="削除" onclick="removeRemnant(' + i + ')">×</button>';
  list.appendChild(row);
  return row;
}

function syncInventoryToRemnants() {
  var list = document.getElementById('remnantList');
  if (!list) return;

  var grouped = getInventoryForCurrentSpec();
  var state = getSelectedInventoryRemnants();
  list.innerHTML = '';
  remnantCount = 0;

  Object.keys(state).forEach(function(key) {
    var item = grouped.find(function(group) {
      return getRemnantInventoryKey(group) === key;
    });
    if (item) createInventoryRemnantRow(item, state[key].qty || 1);
  });

  if (!list.children.length) {
    list.innerHTML = '<div class="rem-row rem-row-empty"><div class="rem-meta">在庫から選択した残材がここに表示されます</div></div>';
  }
}

function getRemnants() {
  var result = [];
  document.querySelectorAll('#remnantList .rem-row[data-source="inventory"]').forEach(function(row) {
    var title = row.querySelector('.rem-label-title');
    var qtyEl = row.querySelector('.rem-qty');
    var len = parseInt((title && title.textContent || '').replace(/[^\d]/g, ''), 10);
    var qty = Math.max(0, parseInt(qtyEl && qtyEl.value, 10) || 0);
    if (!len || !qty) return;
    for (var k = 0; k < qty; k++) result.push(len);
  });
  return result;
}

function cleanCartChrome() {
  var cartTitle = document.querySelector('#cartModal .cart-modal-hd span[style*="font-size:15px"]');
  if (cartTitle) cartTitle.textContent = '印刷カート';

  var printBtn = document.querySelector('#cartModal button[onclick="cartDoPrint()"]');
  if (printBtn) printBtn.textContent = 'まとめて印刷';

  var closeBtn = document.querySelector('#cartModal button[onclick="closeCartModal()"]');
  if (closeBtn) closeBtn.textContent = '閉じる';

  var clearBtn = document.querySelector('#cartModal button[onclick="cartClearAll()"]');
  if (clearBtn) clearBtn.textContent = '全クリア';
}

function getHistoryBarsForPrint(result, printedId) {
  if (!result) return [];
  var labelMatch = String(printedId || '').match(/^card_pat_([^_]+)/);
  var label = labelMatch ? labelMatch[1] : '';
  if (label === 'B90' && result.patB && result.patB.plan90 && result.patB.plan90.bars) {
    return result.patB.plan90.bars.slice();
  }
  if (label === 'B80' && result.patB && result.patB.plan80 && result.patB.plan80.bars) {
    return result.patB.plan80.bars.slice();
  }
  if (String(printedId || '').indexOf('card_pat') === 0 && result.patA && result.patA.bars) {
    return result.patA.bars.slice();
  }
  if (result.allDP && result.allDP[0]) {
    var top = result.allDP[0];
    var barsA = (top.bA || []).map(function(b) {
      return { pat: (b.pat || []).slice(), loss: b.loss || 0, sl: b.sl || top.slA || 0 };
    });
    var barsB = (top.bB || []).map(function(b) {
      return { pat: (b.pat || []).slice(), loss: b.loss || 0, sl: b.sl || top.slB || 0 };
    });
    return barsA.concat(barsB);
  }
  return [];
}

function extractRemnantsFromBars(bars) {
  if (typeof buildRemnantsFromBars === 'function') {
    var meta = window._lastCalcResult && window._lastCalcResult.meta ? window._lastCalcResult.meta : {};
    return buildRemnantsFromBars(bars, meta);
  }
  return [];
}

function extractRemnantsFromCard(cardId) {
  var card = document.getElementById(cardId);
  if (!card) return [];
  var minLen = parseInt((document.getElementById('minRemnantLen') || {}).value, 10) || 500;
  var spec = (document.getElementById('spec') || {}).value || '';
  var kind = typeof getCurrentKind === 'function' ? getCurrentKind() : (window.curKind || '');
  var rems = [];
  var remEl = card.querySelector('[class*="rem-section"]') || card.querySelector('.rem-list');
  if (!remEl) return rems;

  remEl.querySelectorAll('span').forEach(function(span) {
    var text = (span.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || text === 'なし' || text.indexOf('mm未満') >= 0) return;
    var lenMatch = text.match(/([\d,]+)\s*mm/i);
    if (!lenMatch) return;
    var qtyMatch = text.match(/[x×]\s*(\d+)/i);
    var len = parseInt(lenMatch[1].replace(/,/g, ''), 10);
    var qty = qtyMatch ? Math.max(1, parseInt(qtyMatch[1], 10) || 1) : 1;
    if (!len || len < minLen) return;
    for (var i = 0; i < qty; i++) {
      rems.push({ len: len, spec: spec, kind: kind, sl: 0 });
    }
  });
  return rems;
}

function getCardBarsById(cardId) {
  var card = document.getElementById(cardId);
  if (!card) return [];
  var diagHtml = '';
  card.querySelectorAll('[id^="diag_"]').forEach(function(diag) {
    diagHtml += diag.innerHTML || '';
  });
  if (!diagHtml) return [];
  var endLoss = parseInt(((document.getElementById('endloss') || {}).value), 10) || 150;
  return parseBarsFromDiagHtml(diagHtml, 0, endLoss);
}

function parsePatternPieces(text) {
  var pieces = [];
  var normalized = String(text || '').replace(/\s+/g, ' ').trim();
  normalized.split('+').forEach(function(part) {
    var token = String(part || '').trim();
    if (!token) return;
    var pair = token.match(/([\d,]+)(?:\s*mm)?\s*[x×＊*]\s*(\d+)(?:\s*本)?/i);
    if (pair) {
      var len = parseInt(pair[1].replace(/,/g, ''), 10) || 0;
      var qty = parseInt(pair[2], 10) || 0;
      for (var i = 0; i < qty; i++) if (len) pieces.push(len);
      return;
    }
    var single = token.match(/([\d,]+)(?:\s*mm)?/i);
    if (single) {
      var one = parseInt(single[1].replace(/,/g, ''), 10) || 0;
      if (one) pieces.push(one);
    }
  });
  return pieces;
}

function buildBarsFromCardPattern(cardId) {
  var card = document.getElementById(cardId);
  if (!card) return [];
  var blade = parseInt(((document.getElementById('blade') || {}).value), 10) || 3;
  var endLoss = parseInt(((document.getElementById('endloss') || {}).value), 10) || 150;
  var bars = [];

  card.querySelectorAll('.cc-pat .pc').forEach(function(block) {
    var hd = block.querySelector('.pc-hd span');
    var slMatch = hd ? String(hd.textContent || '').match(/([\d,]+)\s*mm/i) : null;
    var sl = slMatch ? parseInt(slMatch[1].replace(/,/g, ''), 10) || 0 : 0;
    if (!sl) return;

    block.querySelectorAll('.pc-row').forEach(function(row) {
      var countText = ((row.querySelector('.px') || {}).textContent || '');
      var count = parseInt(countText.replace(/[^\d]/g, ''), 10) || 1;
      var pieceText = ((row.querySelector('.pp') || {}).textContent || '');
      var pat = parsePatternPieces(pieceText);
      if (!pat.length) return;
      var used = pat.reduce(function(sum, len) { return sum + len; }, 0) + blade * Math.max(0, pat.length - 1) + endLoss;
      var loss = Math.max(0, sl - used);
      for (var i = 0; i < count; i++) {
        bars.push({ pat: pat.slice(), loss: loss, sl: sl });
      }
    });
  });

  return bars;
}

function getBarsForSelectedCard(cardId, resultData) {
  if (typeof getSelectedBarsFromResultData === 'function') {
    return getSelectedBarsFromResultData(resultData || window._lastCalcResult || {}, cardId);
  }
  return getCardBarsById(cardId);
}

function buildRemHtmlFromRemnants(rems) {
  var counts = {};
  (rems || []).forEach(function(item) {
    var qty = Math.max(1, parseInt(item && item.qty, 10) || 1);
    counts[item.len] = (counts[item.len] || 0) + qty;
  });
  return '<div class="rem-list">' + Object.keys(counts).sort(function(a, b) { return Number(b) - Number(a); }).map(function(len) {
    var qty = counts[len];
    return '<span class="rem-pill">' + Number(len).toLocaleString() + 'mm' + (qty > 1 ? ' x ' + qty : '') + '</span>';
  }).join('') + '</div>';
}

function buildRemnantSignature(cardId, rems) {
  return JSON.stringify([
    cardId || '',
    (rems || []).map(function(item) {
      return [item.spec, item.kind, item.sl, item.len];
    }).sort()
  ]);
}

function getConsumedRemnantLengths(bars) {
  return (bars || []).map(function(bar) {
    return parseInt(bar && bar.sl, 10) || 0;
  }).filter(function(sl) {
    if (!sl) return false;
    if (typeof isStdStockLength === 'function') return !isStdStockLength(sl);
    return true;
  });
}

function buildConsumeSignature(cardId, bars) {
  return JSON.stringify([
    cardId || '',
    getConsumedRemnantLengths(bars).sort(function(a, b) { return b - a; })
  ]);
}

function getSelectedInventoryIds(meta) {
  var selected = Array.isArray(meta && meta.selectedInventoryRemnants) ? meta.selectedInventoryRemnants : [];
  var ids = [];
  selected.forEach(function(item) {
    (item && item.ids ? item.ids : []).forEach(function(id) {
      ids.push(String(id));
    });
  });
  return ids;
}

function buildPrintPayload(cardId, resultData, fallbackData) {
  var data = fallbackData && typeof fallbackData === 'object' ? fallbackData : {};
  var liveResult = resultData || window._lastCalcResult || {};
  var liveMeta = liveResult && liveResult.meta ? liveResult.meta : {};
  var fallbackMeta = data.resultMeta || {};
  var canUseLiveResult = !Object.keys(data).length ||
    !fallbackMeta.calcId ||
    !liveMeta.calcId ||
    String(fallbackMeta.calcId) === String(liveMeta.calcId);
  var payload = canUseLiveResult && typeof buildCardSelectionPayload === 'function'
    ? buildCardSelectionPayload(liveResult, cardId)
    : null;
  var bars = payload
    ? payload.selectedBars.slice()
    : (Array.isArray(data.bars) && data.bars.length
        ? data.bars.slice()
        : getBarsForSelectedCard(cardId, resultData || window._lastCalcResult));
  var meta = data.resultMeta || (payload ? payload.meta : null) || (resultData && resultData.meta) || (window._lastCalcResult && window._lastCalcResult.meta) || {};
  var rems = payload
    ? payload.remnants.slice()
    : (Array.isArray(data.remnants) && data.remnants.length
        ? data.remnants.slice()
        : (typeof buildRemnantsFromBars === 'function'
        ? buildRemnantsFromBars(bars, meta)
        : extractRemnantsFromBars(bars)));
  return {
    bars: bars,
    meta: meta,
    rems: rems
  };
}

function getConsumedInventoryLengths(bars, meta) {
  var selected = Array.isArray(meta && meta.selectedInventoryRemnants) ? meta.selectedInventoryRemnants : [];
  var selectedByLen = {};
  selected.forEach(function(item) {
    var len = parseInt(item && item.len, 10) || 0;
    var qty = Math.max(0, parseInt(item && item.qty, 10) || 0);
    if (!len || !qty) return;
    selectedByLen[len] = (selectedByLen[len] || 0) + qty;
  });
  return (bars || []).map(function(bar) {
    return parseInt(bar && bar.sl, 10) || 0;
  }).filter(function(sl) {
    if (!sl) return false;
    if (selectedByLen[sl] > 0) {
      selectedByLen[sl]--;
      return true;
    }
    if (typeof isStdStockLength === 'function') return !isStdStockLength(sl);
    return true;
  });
}

function buildInventoryConsumeSignature(cardId, bars, meta) {
  var selectedIds = getSelectedInventoryIds(meta);
  if (selectedIds.length) {
    return JSON.stringify([cardId || '', selectedIds.sort()]);
  }
  return JSON.stringify([
    cardId || '',
    getConsumedInventoryLengths(bars, meta).sort(function(a, b) { return b - a; })
  ]);
}

function getCartPurchaseSummary(cart) {
  var grouped = {};
  (cart || []).forEach(function(item) {
    var data = item && item.data ? item.data : {};
    var spec = data.spec || '';
    (data.bars || []).forEach(function(bar) {
      var sl = parseInt(bar && bar.sl, 10) || 0;
      if (!sl || (typeof isStdStockLength === 'function' && !isStdStockLength(sl))) return;
      var key = spec + '::' + sl;
      if (!grouped[key]) grouped[key] = { spec: spec, sl: sl, qty: 0 };
      grouped[key].qty += 1;
    });
  });
  return Object.keys(grouped).map(function(key) { return grouped[key]; }).sort(function(a, b) {
    if (a.spec !== b.spec) return String(a.spec).localeCompare(String(b.spec), 'ja');
    return b.sl - a.sl;
  });
}

function buildPurchaseMailto(summary, cart) {
  if (!summary.length) return '';
  var first = cart && cart[0] && cart[0].data ? cart[0].data : {};
  var job = first.job || {};
  var lines = [
    'お世話になっております。',
    '',
    '下記鋼材の手配をお願いいたします。',
    '',
    '案件名: ' + (job.name || ''),
    '希望納期: ',
    '',
    '【発注明細】'
  ];
  summary.forEach(function(item) {
    lines.push('・' + (item.spec || '規格未設定') + ' / ' + Number(item.sl || 0).toLocaleString() + 'mm × ' + item.qty + '本');
  });
  lines.push('');
  lines.push('よろしくお願いいたします。');
  var subject = '';
  return 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
}

function buildPurchaseGmailUrl(summary, cart) {
  if (!summary.length) return '';
  var first = cart && cart[0] && cart[0].data ? cart[0].data : {};
  var job = first.job || {};
  var lines = [
    'お世話になっております。',
    '',
    '下記鋼材の手配をお願いいたします。',
    '',
    '案件名: ' + (job.name || ''),
    '希望納期: ',
    '',
    '【発注明細】'
  ];
  summary.forEach(function(item) {
    lines.push('・' + (item.spec || '規格未設定') + ' / ' + Number(item.sl || 0).toLocaleString() + 'mm × ' + item.qty + '本');
  });
  lines.push('');
  lines.push('よろしくお願いいたします。');
  var params = [
    'view=cm',
    'fs=1',
    'su=' + encodeURIComponent(''),
    'body=' + encodeURIComponent(lines.join('\n'))
  ];
  return 'https://mail.google.com/mail/?' + params.join('&');
}

function getLatestPrintedHistoryRemnants(cardId) {
  if (typeof getCutHistory !== 'function') return [];
  var hist = getCutHistory();
  if (!hist || !hist.length) return [];
  var latest = hist[0] || {};
  if ((latest.printedCardId || '') !== String(cardId || '')) return [];
  var result = latest.result || {};
  return Array.isArray(result.remnants) ? result.remnants.slice() : [];
}

var _baseSaveCutHistory = typeof saveCutHistory === 'function' ? saveCutHistory : null;
saveCutHistory = function(resultData, cardId) {
  var entry = _baseSaveCutHistory ? _baseSaveCutHistory(resultData, cardId) : null;
  if (!entry || !entry.result) return entry;

  var payload = typeof buildCardSelectionPayload === 'function'
    ? buildCardSelectionPayload(resultData || window._lastCalcResult || {}, cardId)
    : null;
  var selectedBars = payload ? payload.selectedBars.slice() : (typeof getSelectedBarsFromResultData === 'function'
    ? getSelectedBarsFromResultData(resultData, cardId)
    : getBarsForSelectedCard(cardId, resultData));
  var selectedRemnants = payload ? payload.remnants.slice() : (typeof extractRemnants === 'function'
    ? extractRemnants(resultData, cardId)
    : extractRemnantsFromBars(selectedBars));
  entry.result.remnants = selectedRemnants;
  entry.result.selectedBars = selectedBars;
  entry.result.meta = payload ? Object.assign({}, payload.meta) : (resultData && resultData.meta ? Object.assign({}, resultData.meta) : (entry.result.meta || {}));
  entry.printedCardId = cardId || entry.printedCardId || '';
  try {
    var hist = getCutHistory();
    if (hist.length) {
      hist[0] = entry;
      localStorage.setItem(LS_CUT_HIST, JSON.stringify(hist));
    }
  } catch (e) {}
  return entry;
};

var _baseCartAdd = typeof cartAdd === 'function' ? cartAdd : null;
cartAdd = function(cardId, btn) {
  var result = _baseCartAdd ? _baseCartAdd(cardId, btn) : undefined;
  var payload = typeof buildCardSelectionPayload === 'function'
    ? buildCardSelectionPayload(window._lastCalcResult || {}, cardId)
    : null;
  var selectedBars = payload ? payload.selectedBars.slice() : (typeof getSelectedBarsFromResultData === 'function'
    ? getSelectedBarsFromResultData(window._lastCalcResult, cardId)
    : getBarsForSelectedCard(cardId, window._lastCalcResult));
  var rems = payload ? payload.remnants.slice() : (typeof extractRemnants === 'function'
    ? extractRemnants(window._lastCalcResult, cardId)
    : extractRemnantsFromBars(selectedBars));
  if (typeof getCart === 'function' && typeof saveCart === 'function') {
    var remHtml = buildRemHtmlFromRemnants(rems);
    var cart = getCart();
    for (var i = cart.length - 1; i >= 0; i--) {
      if (cart[i] && cart[i].cardId === cardId && cart[i].data) {
        cart[i].data.remHtml = remHtml;
        cart[i].data.bars = selectedBars;
        cart[i].data.remnants = rems;
        cart[i].data.resultMeta = payload ? Object.assign({}, payload.meta) : (window._lastCalcResult && window._lastCalcResult.meta ? Object.assign({}, window._lastCalcResult.meta) : {});
        break;
      }
    }
    saveCart(cart);
  }
  return result;
};

showHistPreview = function(id) {
  var hist = getCutHistory();
  var h = hist.find(function(x) { return x.id === id; });
  if (!h) return;
  var modal = document.getElementById('histPreviewModal');
  var body = document.getElementById('histPreviewBody');
  if (!modal || !body) return;
  var r = h.result || {};
  var job = { client: h.client || '', name: h.name || '', deadline: h.deadline || '', worker: h.worker || '' };
  var spec = h.spec || '';
  var endLoss = r.endLoss || 150;
  var printedId = h.printedCardId || '';
  var payload = typeof buildCardSelectionPayload === 'function'
    ? buildCardSelectionPayload(r, printedId)
    : null;
  var bars = payload && payload.selectedBars && payload.selectedBars.length
    ? payload.selectedBars.slice()
    : ((r.selectedBars && r.selectedBars.length) ? r.selectedBars.slice() : getHistoryBarsForPrint(r, printedId));
  if (!bars.length) {
    body.innerHTML = '<div style="padding:20px;color:#aaa;text-align:center">データがありません</div>';
    modal.style.display = 'flex';
    return;
  }
  var slGroups = {};
  bars.forEach(function(b) {
    var sl2 = b.sl || 0;
    if (!slGroups[sl2]) slGroups[sl2] = [];
    slGroups[sl2].push(b);
  });
  var orderedSls = sortStockLengthsForDisplay(Object.keys(slGroups).map(Number));
  var motherSummary = orderedSls.map(function(s) { return s.toLocaleString() + 'mm x ' + slGroups[s].length; }).join(' + ');
  var sumMap = {};
  bars.forEach(function(b) {
    (b.pat || []).forEach(function(len) {
      sumMap[len] = (sumMap[len] || 0) + 1;
    });
  });
  var remList = payload && payload.remnants ? payload.remnants.slice() : ((r.remnants || h.remnants) || []);
  var remTags = remList.filter(function(r2) { return r2.len >= 500; }).map(function(r2) {
    return r2.len.toLocaleString() + 'mm' + (r2.qty > 1 ? ' x ' + r2.qty : '');
  });
  var barHtml = '';
  orderedSls.forEach(function(sl2) {
    barHtml += buildPrintBarHtml(slGroups[sl2], sl2, endLoss);
  });
  body.innerHTML = buildPrintPages(job, [{
    idx: 1,
    spec: spec,
    motherSummary: motherSummary,
    sumMap: sumMap,
    remTags: remTags,
    barHtml: barHtml
  }]);
  modal.style.display = 'flex';
};

var _basePrintCard = typeof printCard === 'function' ? printCard : null;
printCard = function(cardId) {
  window._lastPrintedCardId = cardId;
  return _basePrintCard ? _basePrintCard(cardId) : undefined;
};

autoRegisterAfterPrint = function() {
  var cardId = window._lastPrintedCardId;
  if (!cardId) return;
  var payload = buildPrintPayload(cardId, window._lastCalcResult);
  var remSignature = buildRemnantSignature(cardId, payload.rems);
  var consumeSignature = buildInventoryConsumeSignature(cardId, payload.bars, payload.meta);

  if (payload.rems.length && typeof registerRemnants === 'function' && window._lastPrintedRemnantSignature !== remSignature) {
    window._lastPrintedRemnantSignature = remSignature;
    registerRemnants(payload.rems);
  }
  var selectedIds = getSelectedInventoryIds(payload.meta);
  if (selectedIds.length && typeof consumeSelectedInventoryRemnants === 'function' && window._lastConsumedInventorySignature !== consumeSignature) {
    window._lastConsumedInventorySignature = consumeSignature;
    consumeSelectedInventoryRemnants(payload.meta.selectedInventoryRemnants);
  } else if (getConsumedInventoryLengths(payload.bars, payload.meta).length && typeof consumeInventoryBars === 'function' && window._lastConsumedInventorySignature !== consumeSignature) {
    window._lastConsumedInventorySignature = consumeSignature;
    consumeInventoryBars(payload.bars, payload.meta);
  }
};

var _baseCartDoPrint = typeof cartDoPrint === 'function' ? cartDoPrint : null;
cartDoPrint = function() {
  var cartSnapshot = typeof getCart === 'function' ? getCart().slice() : [];
  var result = _baseCartDoPrint ? _baseCartDoPrint() : undefined;
  if (!cartSnapshot.length) return result;

  var allRems = [];
  var sigParts = [];
  var consumePayloads = [];
  cartSnapshot.forEach(function(item) {
    var data = item && item.data ? item.data : {};
    var cardId = data.cardId || item.cardId;
    var payload = buildPrintPayload(cardId, window._lastCalcResult, data);
    if (payload.rems.length) {
      allRems = allRems.concat(payload.rems);
      sigParts.push(buildRemnantSignature(cardId, payload.rems));
    }
    if (getSelectedInventoryIds(payload.meta).length || getConsumedInventoryLengths(payload.bars, payload.meta).length) {
      consumePayloads.push({ cardId: cardId, bars: payload.bars, meta: payload.meta });
    }
  });

  if (allRems.length && typeof registerRemnants === 'function') {
    var signature = JSON.stringify(sigParts.sort());
    if (window._lastPrintedRemnantSignature !== signature) {
      window._lastPrintedRemnantSignature = signature;
      registerRemnants(allRems);
    }
  }
  if (consumePayloads.length && typeof consumeInventoryBars === 'function') {
    var consumeSignature = JSON.stringify(consumePayloads.map(function(item) {
      return buildInventoryConsumeSignature(item.cardId, item.bars, item.meta);
    }).sort());
    if (window._lastConsumedInventorySignature !== consumeSignature) {
      window._lastConsumedInventorySignature = consumeSignature;
      consumePayloads.forEach(function(item) {
        if (getSelectedInventoryIds(item.meta).length && typeof consumeSelectedInventoryRemnants === 'function') {
          consumeSelectedInventoryRemnants(item.meta.selectedInventoryRemnants);
        } else if (typeof consumeInventoryBars === 'function') {
          consumeInventoryBars(item.bars, item.meta);
        }
      });
    }
  }
  return result;
};

var _baseRenderCartModal = typeof renderCartModal === 'function' ? renderCartModal : null;
renderCartModal = function() {
  var out = _baseRenderCartModal ? _baseRenderCartModal.apply(this, arguments) : undefined;
  var body = document.getElementById('cartModalBody');
  if (!body) return out;
  var cart = typeof getCart === 'function' ? getCart() : [];
  if (!cart.length) return out;
  var summary = getCartPurchaseSummary(cart);
  var existing = document.getElementById('cartPurchaseSection');
  if (existing) existing.remove();
  var section = document.createElement('div');
  section.id = 'cartPurchaseSection';
  section.className = 'cart-purchase-section';
  section.innerHTML =
    '<div class="cart-purchase-title">材料手配</div>' +
    (summary.length
      ? '<div class="cart-purchase-list">' + summary.map(function(item) {
          return '<div class="cart-purchase-row"><span class="cart-purchase-spec">' + escapeHtml(item.spec || '規格未設定') + '</span><span class="cart-purchase-stock">' + Number(item.sl || 0).toLocaleString() + 'mm × ' + item.qty + '本</span></div>';
        }).join('') + '</div>' +
        '<div class="cart-purchase-actions">' +
          '<button type="button" class="cart-purchase-mail" onclick="window.location.href=\'' + buildPurchaseMailto(summary, cart).replace(/'/g, '%27') + '\'">既定のメールで開く</button>' +
          '<button type="button" class="cart-purchase-mail" onclick="window.open(\'' + buildPurchaseGmailUrl(summary, cart).replace(/'/g, '%27') + '\', \'_blank\')">Gmailで開く</button>' +
        '</div>'
      : '<div class="cart-purchase-empty">今回発注が必要な定尺材はありません。</div>');
  body.appendChild(section);
  return out;
};

function hydrateYieldRemnantLists() {
  return;
}

var _baseRender = typeof render === 'function' ? render : null;
render = function() {
  var out = _baseRender ? _baseRender.apply(this, arguments) : undefined;
  hydrateYieldRemnantLists();
  return out;
};

function renderCardRemnantSection(card, rems) {
  if (!card) return;
  var pat = card.querySelector('.cc-pat');
  var section = card.querySelector('.rem-section');
  if (!section && pat) {
    var probe = pat.nextElementSibling;
    while (probe) {
      if (probe.classList && probe.classList.contains('diag-toggle')) break;
      if (((probe.textContent || '').indexOf('端材リスト') >= 0) || (probe.classList && probe.classList.contains('rem-list'))) {
        section = probe;
        break;
      }
      probe = probe.nextElementSibling;
    }
  }
  if (!section) {
    section = document.createElement('div');
    section.className = 'rem-section';
    section.style.cssText = 'padding:6px 14px;background:#f8f8fb;border-top:1px solid #e8e8ed';
    if (pat && pat.parentNode === card) pat.insertAdjacentElement('afterend', section);
    else card.appendChild(section);
  }
  section.classList.add('rem-section');
  var dup = section.nextElementSibling;
  while (dup && !(dup.classList && dup.classList.contains('diag-toggle'))) {
    var next = dup.nextElementSibling;
    if ((dup.textContent || '').indexOf('端材リスト') >= 0 || (dup.classList && dup.classList.contains('rem-section'))) {
      dup.remove();
    }
    dup = next;
  }
  section.innerHTML =
    '<div style="font-size:10px;color:#8888a8;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">端材リスト</div>' +
    (rems.length ? buildRemHtmlFromRemnants(rems) : '<div class="rem-list"><span class="rem-pill rem-pill-empty">なし</span></div>');
}

function hydrateCardRemnantLists() {
  document.querySelectorAll('.cc[id]').forEach(function(card) {
    var payload = typeof buildCardSelectionPayload === 'function'
      ? buildCardSelectionPayload(window._lastCalcResult || {}, card.id)
      : null;
    var rems = payload ? payload.remnants.slice() : (typeof extractRemnants === 'function'
      ? extractRemnants(window._lastCalcResult, card.id)
      : extractRemnantsFromBars(getBarsForSelectedCard(card.id, window._lastCalcResult)));
    renderCardRemnantSection(card, rems);
  });
}

function focusFirstPieceRow() {
  var target = null;
  for (var i = 0; typeof totalRows !== 'undefined' && i < totalRows; i++) {
    var input = document.getElementById('pl' + i);
    if (!input) continue;
    if (!String(input.value || '').trim()) {
      target = input;
      break;
    }
    if (!target) target = input;
  }
  if (target) {
    target.focus();
    if (typeof target.select === 'function') target.select();
  }
}

var _renderAfterRemnantOverride = render;
render = function() {
  var out = _renderAfterRemnantOverride ? _renderAfterRemnantOverride.apply(this, arguments) : undefined;
  hydrateCardRemnantLists();
  return out;
};

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function deleteInventoryGroup(groupKey) {
  var ids = String(groupKey || '').split(',').map(function(id) {
    return String(id || '').trim();
  }).filter(Boolean);
  if (!ids.length || typeof saveInventory !== 'function' || typeof getInventory !== 'function') return;
  if (!confirm('この在庫を削除しますか？')) return;
  saveInventory(getInventory().filter(function(item) {
    return ids.indexOf(String(item.id)) === -1;
  }));
  syncInventoryToRemnants();
  updateInvDropdown();
  renderInventoryPage();
}

function bindInventoryListActions() {
  var cont = document.getElementById('invListCont');
  if (!cont || cont.dataset.actionsBound === '1') return;
  cont.dataset.actionsBound = '1';
  cont.addEventListener('click', function(e) {
    var editBtn = e.target.closest('.inv-note-badge[data-group-key]');
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      toggleInventoryGroupNoteEditor(editBtn.dataset.groupKey || '', true);
      return;
    }
    var saveBtn = e.target.closest('.inv-note-save[data-group-key]');
    if (saveBtn) {
      e.preventDefault();
      e.stopPropagation();
      saveInventoryGroupNoteFromInput(saveBtn.dataset.groupKey || '');
    }
  });
}

function bindRemnantQtyEnter() {
  var list = document.getElementById('remnantList');
  if (!list || list.dataset.enterBound === '1') return;
  list.dataset.enterBound = '1';
  list.addEventListener('keydown', function(e) {
    var target = e.target;
    if (!target || !target.classList || !target.classList.contains('rem-qty')) return;
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (typeof saveRemnants === 'function') saveRemnants();
    focusFirstPieceRow();
  });
}

function updateInventoryGroupNote(groupKey, value) {
  var ids = String(groupKey || '').split(',').map(function(id) {
    return String(id || '').trim();
  }).filter(Boolean);
  if (!ids.length || typeof saveInventory !== 'function' || typeof getInventory !== 'function') return;
  var note = String(value == null ? '' : value).trim();
  var inv = getInventory().map(function(item) {
    if (ids.indexOf(String(item.id)) === -1) return item;
    return Object.assign({}, item, { note: note });
  });
  saveInventory(inv);
  syncInventoryToRemnants();
  updateInvDropdown();
  renderInventoryPage();
}

function toggleInventoryGroupNoteEditor(groupKey, forceOpen) {
  var root = document.querySelector('.inv-note-cell[data-group-key="' + String(groupKey || '') + '"]');
  if (!root) return;
  var display = root.querySelector('.inv-note-display');
  var editor = root.querySelector('.inv-note-editor');
  var shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !(editor && editor.style.display !== 'none');
  if (display) display.style.display = shouldOpen ? 'none' : 'flex';
  if (editor) editor.style.display = shouldOpen ? 'flex' : 'none';
  if (shouldOpen) {
    var input = root.querySelector('.inv-note-input');
    if (input) {
      input.focus();
      input.select();
    }
  }
}

function saveInventoryGroupNoteFromInput(groupKey) {
  var root = document.querySelector('.inv-note-cell[data-group-key="' + String(groupKey || '') + '"]');
  if (!root) return;
  var input = root.querySelector('.inv-note-input');
  updateInventoryGroupNote(groupKey, input ? input.value : '');
}

var _baseRenderInventoryPage = typeof renderInventoryPage === 'function' ? renderInventoryPage : null;
renderInventoryPage = function() {
  var cont = document.getElementById('invListCont');
  var empty = document.getElementById('invEmptyMsg');
  if (!cont) {
    return _baseRenderInventoryPage ? _baseRenderInventoryPage.apply(this, arguments) : undefined;
  }

  var kindF = ((document.getElementById('invFilterKind') || {}).value || '');
  var specF = ((document.getElementById('invFilterSpec') || {}).value || '');
  var keyword = (((document.getElementById('invKeyword') || {}).value) || '').toLowerCase();
  var dateFrom = ((document.getElementById('invDateFrom') || {}).value || '');
  var sort = ((document.getElementById('invSort') || {}).value || 'date_desc');
  var inv = getInventory().slice();

  if (kindF) inv = inv.filter(function(item) { return item.kind === kindF; });
  if (specF) inv = inv.filter(function(item) { return item.spec === specF; });
  if (keyword) inv = inv.filter(function(item) {
    return [item.spec, item.kind, item.company, item.note, item.len].join(' ').toLowerCase().indexOf(keyword) >= 0;
  });
  if (dateFrom) inv = inv.filter(function(item) { return parseDateValue(item.addedDate) >= parseDateValue(dateFrom); });
  inv.sort(function(a, b) {
    if (sort === 'date_asc') return parseDateValue(a.addedDate) - parseDateValue(b.addedDate);
    if (sort === 'len_desc') return (b.len || 0) - (a.len || 0);
    if (sort === 'len_asc') return (a.len || 0) - (b.len || 0);
    if (sort === 'spec_asc') return String(a.spec || '').localeCompare(String(b.spec || ''), 'ja');
    return parseDateValue(b.addedDate) - parseDateValue(a.addedDate);
  });

  if (!inv.length) {
    cont.innerHTML = '';
    if (empty) empty.style.display = 'block';
    renderPager('invPagination', 1, 1, 'setInventoryPage');
    return;
  }
  if (empty) empty.style.display = 'none';

  var grouped = {};
  inv.forEach(function(item) {
    var specKey = item.spec || item.kind || '未設定';
    var lenKey = parseInt(item.len || 0, 10) || 0;
    var key = specKey + '::' + lenKey;
    if (!grouped[key]) grouped[key] = { spec: specKey, len: lenKey, items: [] };
    grouped[key].items.push(item);
  });

  var rows = Object.keys(grouped).map(function(key) {
    var group = grouped[key];
    var companies = group.items.map(function(item) { return item.company || ''; }).filter(Boolean);
    var notes = group.items.map(function(item) { return item.note || ''; }).filter(Boolean);
    var dates = group.items.map(function(item) { return item.addedDate || ''; }).filter(Boolean).sort(function(a, b) {
      return parseDateValue(b) - parseDateValue(a);
    });
    return {
      spec: group.spec,
      len: group.len,
      qty: group.items.length,
      ids: group.items.map(function(item) { return item.id; }),
      company: !companies.length ? '-' : (Array.from(new Set(companies)).length === 1 ? companies[0] : '複数'),
      note: !notes.length ? '-' : (Array.from(new Set(notes)).length === 1 ? notes[0] : '複数'),
      addedDate: dates[0] || ''
    };
  });

  var pageData = paginateItems(rows, inventoryPage, INVENTORY_PAGE_SIZE);
  inventoryPage = pageData.page;
  var specGroups = {};
  pageData.items.forEach(function(item) {
    if (!specGroups[item.spec]) specGroups[item.spec] = [];
    specGroups[item.spec].push(item);
  });

  cont.innerHTML = Object.keys(specGroups).sort().map(function(spec) {
    return '<div class="inv-card">' +
      '<div class="inv-card-header"><span class="inv-spec-label">' + escapeHtml(spec) + '</span><span class="inv-count-badge">' + specGroups[spec].reduce(function(sum, row) { return sum + row.qty; }, 0) + '本</span></div>' +
      '<div class="inv-col-header"><span>寸法</span><span>長さ</span><span>会社名</span><span>メモ</span><span>登録日</span><span></span></div>' +
      specGroups[spec].map(function(item) {
        var groupKey = item.ids.join(',');
        var noteText = item.note === '-' ? '' : item.note;
        return '<div class="inv-row">' +
          '<span class="inv-spec">' + escapeHtml(item.spec) + '</span>' +
          '<span class="inv-len"><span class="inv-len-stack">' + Number(item.len || 0).toLocaleString() + '<span class="inv-len-unit">mm</span></span><span class="inv-qty">x ' + item.qty + '</span></span>' +
          '<span class="inv-company">' + escapeHtml(item.company) + '</span>' +
          '<div class="inv-note-cell" data-group-key="' + groupKey + '">' +
            '<div class="inv-note-display">' +
              '<span class="inv-note-text">' + escapeHtml(noteText || '-') + '</span>' +
              '<button type="button" class="inv-note-badge" data-group-key="' + groupKey + '">編集</button>' +
            '</div>' +
            '<div class="inv-note-editor" style="display:none">' +
              '<input class="inv-note-input" type="text" value="' + escapeHtml(noteText) + '" placeholder="メモ" onkeydown="if(event.key===\'Enter\'){saveInventoryGroupNoteFromInput(\'' + groupKey + '\')}" />' +
              '<button type="button" class="inv-note-save" data-group-key="' + groupKey + '">保存</button>' +
            '</div>' +
          '</div>' +
          '<span class="inv-date">' + escapeHtml(item.addedDate) + '</span>' +
          '<div class="inv-action"><button type="button" class="inv-del-btn" data-group-key="' + groupKey + '" onclick="deleteInventoryGroup(\'' + groupKey + '\')">削除</button></div>' +
        '</div>';
      }).join('') +
    '</div>';
  }).join('');

  bindInventoryListActions();
  renderPager('invPagination', inventoryPage, pageData.totalPages, 'setInventoryPage');
};

(function initializeFinalOverrides() {
  function bind() {
    var sel = document.getElementById('invSelect');
    var btn = document.getElementById('invUseBtn');

    if (sel && !sel.dataset.finalBound) {
      sel.dataset.finalBound = '1';
      sel.addEventListener('change', updateInventoryUseButton);
    }
    if (btn && !btn.dataset.finalBound) {
      btn.dataset.finalBound = '1';
      btn.addEventListener('click', addFromInventory);
    }

    buildInventoryDropdown();
    syncInventoryToRemnants();
    bindRemnantQtyEnter();
    cleanCartChrome();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();

function extractRemnantsFromCard(cardId) {
  var card = document.getElementById(cardId);
  if (!card) return [];
  var minLen = parseInt((document.getElementById('minRemnantLen') || {}).value, 10) || 500;
  var spec = (document.getElementById('spec') || {}).value || '';
  var kind = typeof getCurrentKind === 'function' ? getCurrentKind() : (window.curKind || '');
  var remEl = card.querySelector('[class*="rem-section"]') || card.querySelector('.rem-list');
  if (!remEl) return [];

  var text = String(remEl.textContent || '').replace(/\s+/g, ' ');
  var regex = /([\d,]+)\s*mm(?:\s*[x\u00d7*]\s*(\d+))?/gi;
  var rems = [];
  var match;
  while ((match = regex.exec(text))) {
    var len = parseInt(String(match[1] || '').replace(/,/g, ''), 10);
    var qty = match[2] ? Math.max(1, parseInt(match[2], 10) || 1) : 1;
    if (!len || len < minLen) continue;
    for (var i = 0; i < qty; i++) {
      rems.push({ len: len, spec: spec, kind: kind, sl: 0 });
    }
  }
  return rems;
}

(function bindSpecDropdownOutsideCloseFinal() {
  function bindSpecPanelBehavior() {
    var panel = document.getElementById('specPanel');
    var selected = document.getElementById('specSelected');
    var list = document.getElementById('specList');
    if (!panel || !selected || !list) return;

    if (selected.dataset.dropdownBound !== '1') {
      selected.dataset.dropdownBound = '1';
      selected.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        list.style.display = list.style.display === 'block' ? 'none' : 'block';
      });
    }

    if (panel.dataset.dropdownBound !== '1') {
      panel.dataset.dropdownBound = '1';
      panel.addEventListener('click', function(e) {
        e.stopPropagation();
      });
      document.addEventListener('click', function(e) {
        if (!panel.contains(e.target)) list.style.display = 'none';
      });
    }

    if (list.dataset.forceOpen === '1') {
      list.style.display = 'block';
      list.dataset.forceOpen = '0';
    } else {
      list.style.display = 'none';
    }
  }

  var _baseBuildSpec = typeof buildSpec === 'function' ? buildSpec : null;
  if (_baseBuildSpec) {
    buildSpec = function() {
      var out = _baseBuildSpec.apply(this, arguments);
      bindSpecPanelBehavior();
      return out;
    };
  }

  var _baseSelectKind = typeof selectKind === 'function' ? selectKind : null;
  if (_baseSelectKind) {
    selectKind = function(btn, k) {
      var list = document.getElementById('specList');
      if (list) list.dataset.forceOpen = '1';
      return _baseSelectKind.apply(this, arguments);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSpecPanelBehavior, { once: true });
  } else {
    bindSpecPanelBehavior();
  }
})();
