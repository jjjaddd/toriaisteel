function getSelectedInventoryRemnants() {
  return loadSelectedInventoryRemnantsState();
}

function saveSelectedInventoryRemnants(data) {
  _selectedInventoryRemnantsState = data && typeof data === 'object' ? data : {};
  persistSelectedInventoryRemnantsState();
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
    return (result.allDP[0].bA || []).concat(result.allDP[0].bB || []).map(function(b) {
      return { pat: (b.pat || []).slice(), loss: b.loss || 0, sl: b.sl || result.allDP[0].slA || 0 };
    });
  }
  return [];
}

function extractRemnantsFromBars(bars) {
  var minLen = parseInt((document.getElementById('minRemnantLen') || {}).value, 10) || 500;
  var spec = (document.getElementById('spec') || {}).value || '';
  var kind = typeof getCurrentKind === 'function' ? getCurrentKind() : (window.curKind || '');
  var rems = [];
  (bars || []).forEach(function(bar) {
    if (bar && bar.loss >= minLen) {
      rems.push({
        len: bar.loss,
        spec: spec,
        kind: kind,
        sl: bar.sl || 0
      });
    }
  });
  return rems;
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

var _baseSaveCutHistory = typeof saveCutHistory === 'function' ? saveCutHistory : null;
saveCutHistory = function(resultData, cardId) {
  var entry = _baseSaveCutHistory ? _baseSaveCutHistory(resultData, cardId) : null;
  if (!entry || !entry.result) return entry;

  var selectedRemnants = extractRemnantsFromCard(cardId);
  if (selectedRemnants.length) {
    entry.result.remnants = selectedRemnants;
    entry.printedCardId = cardId || entry.printedCardId || '';
    try {
      var hist = getCutHistory();
      if (hist.length) {
        hist[0] = entry;
        localStorage.setItem(LS_CUT_HIST, JSON.stringify(hist));
      }
    } catch (e) {}
  }
  return entry;
};

var _baseCartAdd = typeof cartAdd === 'function' ? cartAdd : null;
cartAdd = function(cardId, btn) {
  var result = _baseCartAdd ? _baseCartAdd(cardId, btn) : undefined;
  var rems = extractRemnantsFromCard(cardId);
  if (rems.length && typeof getCart === 'function' && typeof saveCart === 'function') {
    var counts = {};
    rems.forEach(function(item) {
      counts[item.len] = (counts[item.len] || 0) + 1;
    });
    var remHtml = '<div class="rem-list">' + Object.keys(counts).map(function(len) {
      var qty = counts[len];
      return '<span>' + Number(len).toLocaleString() + 'mm' + (qty > 1 ? ' x ' + qty : '') + '</span>';
    }).join('') + '</div>';
    var cart = getCart();
    for (var i = cart.length - 1; i >= 0; i--) {
      if (cart[i] && cart[i].cardId === cardId && cart[i].data) {
        cart[i].data.remHtml = remHtml;
        break;
      }
    }
    saveCart(cart);
  }
  if (rems.length && typeof registerRemnants === 'function') {
    var signature = JSON.stringify(rems.map(function(item) {
      return [item.spec, item.kind, item.sl, item.len];
    }).sort());
    if (window._lastRegisteredRemnantSignature !== signature) {
      window._lastRegisteredRemnantSignature = signature;
      registerRemnants(rems);
    }
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
  var bars = getHistoryBarsForPrint(r, printedId);
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
  var remTags = ((r.remnants || h.remnants) || []).filter(function(r2) { return r2.len >= 500; }).map(function(r2) {
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
  function bind() {
    var panel = document.getElementById('specPanel');
    var selected = document.getElementById('specSelected');
    var list = document.getElementById('specList');
    if (!panel || !selected || !list || selected.dataset.dropdownBound) return;

    selected.dataset.dropdownBound = '1';
    selected.addEventListener('click', function(e) {
      e.stopPropagation();
      list.style.display = list.style.display === 'none' ? 'block' : 'none';
    });

    panel.addEventListener('click', function(e) {
      e.stopPropagation();
    });

    document.addEventListener('click', function(e) {
      if (!panel.contains(e.target)) list.style.display = 'none';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
