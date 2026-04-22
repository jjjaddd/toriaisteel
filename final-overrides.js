/**
 * final-overrides.js
 * ─────────────────────────────────────────────────────────
 * このファイルは main.js の【後】に読み込まれ、以下の関数を上書きする。
 * main.js の同名関数を直接編集しても効果がないため、
 * 修正はこのファイルを見ること。
 *
 * 【直接上書き（再代入）している関数】
 *   saveSelectedInventoryRemnants  (l.*)
 *   updateInventoryUseButton       (l.*)
 *   addFromInventory               (l.*)
 *   removeRemnant                  (l.*)
 *   saveRemnants                   (l.*)
 *   createInventoryRemnantRow      (l.*)
 *   syncInventoryToRemnants        (l.*)
 *   getRemnants                    (l.*)
 *   renderHistory                  (enforceHistoryNewestFirst IIFE)
 *
 * 【ラップ（元実装を保存してから拡張）している関数】
 *   saveCutHistory    → _baseSaveCutHistory でラップ（端材・在庫消費を追加）
 *   cartAdd           → _baseCartAdd でラップ（印刷ペイロード保存を追加）
 *   renderCartModal   → _baseRenderCartModal でラップ（残材セクション追加）
 *   render            → _baseRender でラップ（残材ハイライト追加）
 *   renderInventoryPage → _baseRenderInventoryPage でラップ
 *
 * 【Phase 2 方針】
 *   上記の上書き・ラップを廃止し、各関数をそれぞれの
 *   責務ファイル（main.js / storage.js）に正式移植する。
 * ─────────────────────────────────────────────────────────
 */

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
  if (cartTitle) cartTitle.textContent = '出力カート';
  var cartIcon = document.querySelector('#cartModal .cart-modal-hd span[style*="font-size:16px"]');
  if (cartIcon) cartIcon.remove();


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
  var meta = (payload ? payload.meta : null) || data.resultMeta || (resultData && resultData.meta) || (window._lastCalcResult && window._lastCalcResult.meta) || {};
  var rems = payload
    ? payload.remnants.slice()
    : (Array.isArray(data.remnants) && data.remnants.length
        ? data.remnants.slice()
        : (typeof buildRemnantsFromBars === 'function'
        ? buildRemnantsFromBars(bars, meta)
        : extractRemnantsFromBars(bars)));
  if (String(cardId || '').indexOf('card_yield_') === 0 && meta && Array.isArray(meta.remnantBars) && meta.remnantBars.length) {
    var remnantBars = meta.remnantBars.map(function(bar) {
      return { pat: (bar.pat || []).slice(), loss: bar.loss || 0, sl: bar.sl || 0 };
    });
    var hasRemnantBars = bars.some(function(bar) {
      return bar && bar.sl && typeof isStdStockLength === 'function' && !isStdStockLength(bar.sl);
    });
    if (!hasRemnantBars) bars = remnantBars.concat(bars);
  }
  return {
    bars: bars,
    meta: meta,
    rems: rems
  };
}

function buildPrintSectionFromPayload(sectionIndex, spec, payload, endLoss) {
  var bars = Array.isArray(payload && payload.bars) ? payload.bars.slice() : [];
  var rems = Array.isArray(payload && payload.rems) ? payload.rems.slice() : [];
  var slGroups = {};
  var sumMap = {};
  var origPieces = payload && payload.meta && Array.isArray(payload.meta.origPieces)
    ? payload.meta.origPieces.slice()
    : [];

  bars.forEach(function(bar) {
    var sl = parseInt(bar && bar.sl, 10) || 0;
    if (!sl) return;
    if (!slGroups[sl]) slGroups[sl] = [];
    slGroups[sl].push(bar);
  });

  if (origPieces.length) {
    origPieces.forEach(function(len) {
      var pieceLen = parseInt(len, 10) || 0;
      if (!pieceLen) return;
      sumMap[pieceLen] = (sumMap[pieceLen] || 0) + 1;
    });
  } else {
    bars.forEach(function(bar) {
      (bar.pat || []).forEach(function(len) {
        sumMap[len] = (sumMap[len] || 0) + 1;
      });
    });
  }

  var orderedSls = typeof sortStockLengthsForDisplay === 'function'
    ? sortStockLengthsForDisplay(Object.keys(slGroups).map(Number))
    : Object.keys(slGroups).map(Number).sort(function(a, b) { return b - a; });

  var motherSummary = orderedSls.map(function(sl) {
    return Number(sl).toLocaleString() + 'mm x ' + slGroups[sl].length;
  }).join(' + ');

  var barHtml = '';
  orderedSls.forEach(function(sl) {
    barHtml += buildPrintBarHtml(slGroups[sl], sl, endLoss);
  });

  var remCounts = {};
  rems.forEach(function(rem) {
    var len = parseInt(rem && rem.len, 10) || 0;
    if (!len) return;
    remCounts[len] = (remCounts[len] || 0) + Math.max(1, parseInt(rem && rem.qty, 10) || 1);
  });
  var remTags = Object.keys(remCounts).map(Number).sort(function(a, b) {
    return b - a;
  }).map(function(len) {
    return Number(len).toLocaleString() + 'mm' + (remCounts[len] > 1 ? ' x ' + remCounts[len] : '');
  });

  return {
    idx: sectionIndex,
    spec: spec || '',
    motherSummary: motherSummary,
    sumMap: sumMap,
    remTags: remTags,
    barHtml: barHtml
  };
}

function buildSinglePrintHtml(job, spec, payload, endLoss) {
  return buildPrintPages(job || {}, [
    buildPrintSectionFromPayload(1, spec, payload, endLoss || 150)
  ]);
}

(function hardenDataDrivenCutFlow() {
  autoSyncResultRemnants = function() {
    return;
  };

  showRegisterRemnantsBtn = function() {
    return;
  };

  doRegisterRemnants = function() {
    return;
  };

  extractRemnantsFromCard = function(cardId) {
    return buildPrintPayload(cardId, window._lastCalcResult).rems.slice();
  };

  getCardBarsById = function(cardId) {
    return buildPrintPayload(cardId, window._lastCalcResult).bars.slice();
  };

  buildBarsFromCardPattern = function(cardId) {
    return getCardBarsById(cardId);
  };

  buildCutSourceLabel = function(slLen) {
    var safeLen = parseInt(slLen, 10) || 0;
    if (!safeLen) return '母材未設定';
    return isStdStockLength(safeLen)
      ? safeLen.toLocaleString() + 'mm 定尺'
      : '残材 L=' + safeLen.toLocaleString() + 'mm';
  };

  buildPrintBarHtml = function(bars, sl, endLoss) {
    if (!bars || !bars.length) return '';
    var endHalf = (endLoss || 150) / 2;
    var html = '';
    var groupsByStock = {};
    bars.forEach(function(bar) {
      var slKey = parseInt((bar && bar.sl) || sl, 10) || 0;
      if (!groupsByStock[slKey]) groupsByStock[slKey] = [];
      groupsByStock[slKey].push(bar);
    });
    Object.keys(groupsByStock).forEach(function(stockKey) {
      var slKey = parseInt(stockKey, 10) || 0;
      var grouped = {};
      groupsByStock[stockKey].forEach(function(bar) {
        var key = (bar.pat || []).slice().sort(function(a,b){return b-a;}).join(',') + '|' + (bar.loss || 0);
        if (!grouped[key]) grouped[key] = { bar: bar, cnt: 0 };
        grouped[key].cnt++;
      });
      var sourceLabel = buildCutSourceLabel(slKey);
      var isRemnant = typeof isStdStockLength === 'function' && slKey > 0 && !isStdStockLength(slKey);
      Object.keys(grouped).forEach(function(key) {
        var g = grouped[key];
        var bar = g.bar;
        var patSummary = typeof formatPatternSummary === 'function'
          ? formatPatternSummary(bar.pat)
          : (bar.pat || []).join(' + ');
        html += '<div class="bar-block">';
        html += '<div class="bar-head">'
          + '<span style="font-weight:700;font-size:10px">' + sourceLabel + '</span>'
          + '<span class="cnt-badge">× ' + g.cnt + 'セット</span>'
          + (isRemnant ? '<span class="source-chip">残材より</span>' : '')
          + '</div>';
        html += '<div class="bar-pat">= ' + patSummary + (bar.loss > 0 ? ' / 端材 ' + bar.loss.toLocaleString() + 'mm' : '') + '</div>';
        html += '<div class="bar-track">';
        html += '<div class="b-end" style="flex:' + endHalf + '"></div>';
        var segments = typeof buildDisplaySegments === 'function'
          ? buildDisplaySegments(bar.pat || [])
          : (bar.pat || []).map(function(len) { return { total: len, label: Number(len).toLocaleString() + 'mm' }; });
        segments.forEach(function(seg, idx) {
          if (idx > 0) html += '<div class="bar-cutline" aria-hidden="true"></div>';
          html += '<div class="b-piece" style="flex:' + seg.total + '">' + (seg.total >= 250 ? '<span>' + seg.label + '</span>' : '') + '</div>';
        });
        if (bar.loss > 0) {
          html += '<div class="' + (bar.loss >= 500 ? 'b-rem' : 'b-loss') + '" style="flex:' + bar.loss + '">' + bar.loss.toLocaleString() + '</div>';
        }
        html += '<div class="b-end" style="flex:' + endHalf + '"></div>';
        html += '</div></div>';
      });
    });
    return html;
  };
})();

(function forceHeaderNavOrder() {
  var observer = null;
  var ordering = false;

  function applyOrder() {
    if (ordering) return;
    var nav = document.querySelector('header nav');
    var right = document.querySelector('header .hdr-right');
    if (!nav) return;
    ordering = true;
    if (observer) observer.disconnect();
    var cartBadge = document.getElementById('cartBadge');
    var calc = document.getElementById('na');
    var hist = document.getElementById('nhi');
    var weight = document.getElementById('nw');
    var data = document.getElementById('nd');
    var contact = document.getElementById('nc') || document.getElementById('ncontact');
    [calc, weight, data, hist, contact].forEach(function(node) {
      if (node && node.parentNode === nav) nav.appendChild(node);
    });
    if (cartBadge && right && cartBadge.parentNode !== right) {
      right.insertBefore(cartBadge, right.firstChild || null);
    }
    if (cartBadge) {
      var digits = String(cartBadge.textContent || '').replace(/[^\d]/g, '');
      cartBadge.textContent = 'カート ' + (digits || '0') + '件';
      cartBadge.classList.add('header-cart-btn');
    }
    if (contact) {
      contact.classList.add('header-contact-link');
    }
    if (observer) observer.observe(nav, { childList: true, subtree: false });
    ordering = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyOrder, { once: true });
  } else {
    applyOrder();
  }

  window.addEventListener('load', applyOrder);
  setTimeout(applyOrder, 0);
  setTimeout(applyOrder, 200);
  setTimeout(applyOrder, 800);
  function bindObserver() {
    var nav = document.querySelector('header nav');
    if (!nav || observer) return;
    observer = new MutationObserver(function() {
      applyOrder();
    });
    observer.observe(nav, { childList: true, subtree: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindObserver, { once: true });
  } else {
    bindObserver();
  }
  window.addEventListener('load', bindObserver);
})();

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
  return 'mailto:konoshima@inoue-kouzai.co.jp?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
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
    'to=' + encodeURIComponent('konoshima@inoue-kouzai.co.jp'),
    'su=' + encodeURIComponent(''),
    'body=' + encodeURIComponent(lines.join('\n'))
  ];
  return 'https://mail.google.com/mail/?' + params.join('&');
}

function buildFeedbackBody() {
  var client = (document.getElementById('jobClient') || {}).value || '';
  var jobName = (document.getElementById('jobName') || {}).value || '';
  var note = (document.getElementById('jobWorker') || {}).value || '';
  var feedbackType = (document.getElementById('contactType') || {}).value || 'ご意見';
  var sender = (document.getElementById('contactSender') || {}).value || '';
  var reply = (document.getElementById('contactReply') || {}).value || '';
  var body = (document.getElementById('contactBody') || {}).value || '';
  return [
    'お世話になっております。',
    '',
    'TORIAI ベータ版について、以下の内容を共有します。',
    '',
    '種別: ' + feedbackType,
    '顧客名: ' + client,
    '工事名: ' + jobName,
    '送信者名: ' + sender,
    '返信先: ' + reply,
    'メモ: ' + note,
    '',
    '【内容】',
    body || '',
    '',
    'よろしくお願いいたします。'
  ].join('\n');
}

function buildFeedbackMailto() {
  return 'mailto:support.toriai@gmail.com?subject=' + encodeURIComponent('TORIAI お問い合わせ') + '&body=' + encodeURIComponent(buildFeedbackBody());
}

function buildFeedbackGmailUrl() {
  var params = [
    'view=cm',
    'fs=1',
    'to=' + encodeURIComponent('support.toriai@gmail.com'),
    'su=' + encodeURIComponent('TORIAI お問い合わせ'),
    'body=' + encodeURIComponent(buildFeedbackBody())
  ];
  return 'https://mail.google.com/mail/?' + params.join('&');
}

function openFeedbackMailDefault() {
  window.location.href = buildFeedbackMailto();
}

function openFeedbackMailGmail() {
  window.open(buildFeedbackGmailUrl(), '_blank');
}

function submitFeedbackViaGAS() {
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbzdy3iDrtieC8qcpkMejASM1y1tAMVA1LeXstAYC6bOCyCcVpYzlcgwqJzAXD2RaP-h/exec';

  var feedbackType = (document.getElementById('contactType') || {}).value || 'ご意見';
  var sender       = ((document.getElementById('contactSender') || {}).value || '').trim();
  var reply        = ((document.getElementById('contactReply')  || {}).value || '').trim();
  var body         = ((document.getElementById('contactBody')   || {}).value || '').trim();

  var statusEl  = document.getElementById('feedbackStatus');
  var submitBtn = document.getElementById('feedbackSubmitBtn');

  function setStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.display = 'block';
    var styles = {
      success: { background:'#f0fdf4', border:'1px solid #86efac', color:'#15803d' },
      error:   { background:'#fff1f2', border:'1px solid #fca5a5', color:'#b91c1c' },
      info:    { background:'#f8f8fc', border:'1px solid #e0e0ea', color:'#5a5a78' }
    }[type] || {};
    Object.assign(statusEl.style, styles);
  }

  if (!body) {
    setStatus('内容を入力してください。', 'error');
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '送信中...'; }
  setStatus('送信しています。しばらくお待ちください。', 'info');

  var message = '種別: ' + feedbackType + '\n送信者: ' + (sender || '（未記入）') + '\n返信先: ' + (reply || '（未記入）') + '\n\n' + body;
  var subject = '【' + feedbackType + '】TORIAI お問い合わせ';

  function onSuccess() {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '送信する →'; }
    setStatus('送信しました。ご意見ありがとうございます。', 'success');
    ['contactType','contactSender','contactReply','contactBody'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = (el.tagName === 'SELECT') ? el.options[0].value : '';
    });
  }

  function onError() {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '送信する →'; }
    setStatus('送信に失敗しました。接続状態をご確認ください。', 'error');
  }

  var payload = JSON.stringify({
    name: sender || '匿名',
    subject: subject,
    message: message
  });

  if (typeof fetch !== 'undefined') {
    var tid = setTimeout(function() { onError(); }, 15000);
    fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: payload
    }).then(function() {
      clearTimeout(tid);
      onSuccess();
    }).catch(function() {
      clearTimeout(tid);
      onError();
    });
    return;
  }

  // Fallback: JSONP (legacy browsers)
  var callbackName = '__foContactCb_' + Date.now();
  var cleanup = function() {
    try { delete window[callbackName]; } catch (_) {}
    var s = document.getElementById(callbackName);
    if (s && s.parentNode) s.parentNode.removeChild(s);
  };

  var timeout = setTimeout(function() {
    cleanup();
    onError();
  }, 12000);

  window[callbackName] = function(result) {
    clearTimeout(timeout);
    cleanup();
    if (!result || result.status !== 'ok') { onError(); return; }
    onSuccess();
  };

  var params = [
    'callback=' + encodeURIComponent(callbackName),
    'name='     + encodeURIComponent(sender || '匿名'),
    'subject='  + encodeURIComponent(subject),
    'message='  + encodeURIComponent(message)
  ];
  var script = document.createElement('script');
  script.id = callbackName;
  script.src = GAS_URL + '?' + params.join('&');
  script.onerror = function() { clearTimeout(timeout); cleanup(); onError(); };
  document.body.appendChild(script);
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
  if (h.type === 'cut_project' && h.project) {
    body.innerHTML = h.project.printHtml || '<div style="padding:20px;color:#aaa;text-align:center">データがありません</div>';
    modal.style.display = 'flex';
    return;
  }
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
  var origPieces = payload && payload.meta && Array.isArray(payload.meta.origPieces)
    ? payload.meta.origPieces.slice()
    : [];
  if (origPieces.length) {
    origPieces.forEach(function(len) {
      var pieceLen = parseInt(len, 10) || 0;
      if (!pieceLen) return;
      sumMap[pieceLen] = (sumMap[pieceLen] || 0) + 1;
    });
  } else {
    bars.forEach(function(b) {
      (b.pat || []).forEach(function(len) {
        sumMap[len] = (sumMap[len] || 0) + 1;
      });
    });
  }
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

printCard = function(cardId) {
  window._lastPrintedCardId = cardId;
  var payload = buildPrintPayload(cardId, window._lastCalcResult);
  if (!payload.bars.length) return;
  var meta = payload.meta || {};
  var job = meta.job || (typeof getJobInfo === 'function' ? getJobInfo() : {});
  var spec = meta.spec || ((document.getElementById('spec') || {}).value || '');
  var endLoss = parseInt(meta.endLoss, 10) || parseInt(((document.getElementById('endloss') || {}).value), 10) || 150;

  openPrintWindow(buildSinglePrintHtml(job, spec, payload, endLoss));

  if (window._lastCalcResult && typeof saveCutHistory === 'function') {
    saveCutHistory(window._lastCalcResult, cardId);
  }
  autoRegisterAfterPrint();
  return;
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
    section.className = 'rem-section rem-strip';
    if (pat && pat.parentNode === card) pat.insertAdjacentElement('afterend', section);
    else card.appendChild(section);
  }
  section.classList.add('rem-section', 'rem-strip');
  section.style.background = '';  /* clear any old inline bg */
  var dup = section.nextElementSibling;
  while (dup && !(dup.classList && dup.classList.contains('diag-toggle'))) {
    var next = dup.nextElementSibling;
    if ((dup.textContent || '').indexOf('端材リスト') >= 0 || (dup.classList && dup.classList.contains('rem-section'))) {
      dup.remove();
    }
    dup = next;
  }
  section.innerHTML =
    '<div class="rem-strip-label">端材リスト</div>' +
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
    var invCountEmpty = document.getElementById('invCountLabel');
    if (invCountEmpty) invCountEmpty.textContent = '0件';
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

  var invCountLabel = document.getElementById('invCountLabel');
  if (invCountLabel) invCountLabel.textContent = rows.length.toLocaleString() + '件';
  cont.innerHTML = Object.keys(specGroups).sort().map(function(spec) {
    return specGroups[spec].map(function(item) {
      return '<div class="inv-card-new">' +
        '<div class="inv-len">' + Number(item.len || 0).toLocaleString() + '<span> mm</span></div>' +
        '<div class="inv-detail">' +
          '<div class="inv-spec-label">' + escapeHtml(spec) + '</div>' +
          '<div class="inv-meta">' + escapeHtml(item.company || '会社名なし') + ' / ' + escapeHtml(item.note || 'メモなし') + ' / ' + escapeHtml(item.addedDate || '') + '</div>' +
        '</div>' +
        '<span class="inv-qty-badge">' + item.qty + '本</span>' +
        '<button type="button" class="inv-del-btn" data-group-key="' + item.ids.join(',') + '" onclick="deleteInventoryGroup(\'' + item.ids.join(',') + '\')">削除</button>' +
      '</div>';
    }).join('');
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

(function injectContactPage() {
  return;
  function ensureContactNav() {
    var nav = document.querySelector('header nav');
    if (!nav || document.getElementById('ncontact') || document.getElementById('nc')) return;
    var cartBadge = document.getElementById('cartBadge');
    var link = document.createElement('a');
    link.id = 'ncontact';
    link.textContent = 'お問い合わせ';
    link.href = 'javascript:void(0)';
    link.onclick = function() {
      if (typeof goPage === 'function') goPage('contact');
    };
    if (cartBadge && cartBadge.parentNode === nav) nav.insertBefore(link, cartBadge);
    else nav.appendChild(link);
  }

  function ensureContactPage() {
    if (document.getElementById('cop') || document.getElementById('contactp')) return;
    var page = document.createElement('div');
    page.id = 'contactp';
    page.className = 'pg';
    page.innerHTML =
      '<div class="contact-page">' +
        '<div class="contact-card">' +
          '<div class="contact-title">お問い合わせ</div>' +
          '<p class="contact-lead">使いづらかった点や欲しい機能、不具合などをお聞きしながら改善していきたいです。</p>' +
          '<div class="contact-grid">' +
            '<div class="contact-field">' +
              '<label for="contactType">種別</label>' +
              '<select id="contactType" onkeydown="if(event.key===\'Enter\'){event.preventDefault();var s=document.getElementById(\'contactSender\');if(s){s.focus();s.select();}}">' +
                '<option value="ご意見">ご意見</option>' +
                '<option value="不具合報告">不具合報告</option>' +
                '<option value="改善要望">改善要望</option>' +
                '<option value="その他">その他</option>' +
              '</select>' +
            '</div>' +
            '<div class="contact-field">' +
              '<label for="contactSender">ペンネーム</label>' +
              '<input type="text" id="contactSender" placeholder="ペンネーム" onkeydown="if(event.key===\'Enter\'){event.preventDefault();var r=document.getElementById(\'contactReply\');if(r){r.focus();r.select();}}">' +
            '</div>' +
            '<div class="contact-field contact-field-wide">' +
              '<label for="contactReply">返信先メール</label>' +
              '<input type="email" id="contactReply" placeholder="返信が必要な場合のみ" onkeydown="if(event.key===\'Enter\'){event.preventDefault();document.getElementById(\'contactBody\').focus();}">' +
            '</div>' +
            '<div class="contact-field contact-field-wide">' +
              '<label for="contactBody">内容</label>' +
              '<textarea id="contactBody" placeholder="気になった点やご要望をご記入ください"></textarea>' +
            '</div>' +
          '</div>' +
          '<div class="contact-actions">' +
            '<button type="button" id="feedbackSubmitBtn" class="cart-purchase-mail" onclick="submitFeedbackViaGAS()" style="width:100%;background:#f3efff;border:1.5px solid #e6ddff;border-radius:10px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">送信する →</button>' +
          '</div>' +
          '<div id="feedbackStatus" style="display:none;margin-top:12px;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600;text-align:center"></div>' +
          '<div class="contact-destination" style="margin-top:14px;padding:12px;background:#f8f8fc;border:1px solid #e0e0ea;border-radius:10px;font-size:11px;color:#8888a8;line-height:1.7;">ご入力いただいた情報は、お問い合わせへの回答にのみ使用し、第三者への提供は行いません。</div>' +
        '</div>' +
      '</div>';

    var historyPage = document.getElementById('hip');
    if (historyPage && historyPage.parentNode) {
      historyPage.parentNode.insertBefore(page, historyPage.nextSibling);
    } else {
      document.body.appendChild(page);
    }
  }

  var _baseGoPage = typeof goPage === 'function' ? goPage : null;
  if (_baseGoPage) {
    goPage = function(p) {
      ensureContactNav();
      var navCalc = document.getElementById('na');
      var navHist = document.getElementById('nhi');
      var navContact = document.getElementById('nc') || document.getElementById('ncontact');
      if (p === 'contact') {
        document.querySelectorAll('.pg').forEach(function(el) { el.classList.remove('show'); });
        var contactPage = document.getElementById('cop') || document.getElementById('contactp');
        if (contactPage) contactPage.classList.add('show');
        if (navCalc) navCalc.classList.remove('active');
        if (navHist) navHist.classList.remove('active');
        if (navContact) navContact.classList.add('active');
        return;
      }
      _baseGoPage.apply(this, arguments);
      if (navContact) navContact.classList.remove('active');
    };
  }

  function initContactPage() {
    ensureContactNav();
    if (!document.getElementById('cop')) ensureContactPage();
    var cartBadge = document.getElementById('cartBadge');
    if (cartBadge) {
      var digits = String(cartBadge.textContent || '').replace(/[^\d]/g, '');
      cartBadge.textContent = 'カート ' + (digits || '0') + '件';
    }
    var page = document.getElementById('cop');
    if (page) {
      var title = page.querySelector('div[style*="font-size:20px"]');
      if (title) title.textContent = 'お問い合わせ';
      var lead = page.querySelector('div[style*="font-size:12px;color:#8888a8"]');
      if (lead) lead.textContent = 'ご質問やご要望をお送りください。';
      var subject = document.getElementById('contactSubject');
      if (subject && subject.tagName !== 'SELECT') {
        var select = document.createElement('select');
        select.id = 'contactSubject';
        select.required = true;
        select.style.cssText = subject.style.cssText;
        select.innerHTML =
          '<option value="">選択してください</option>' +
          '<option value="機能についての質問">機能についての質問</option>' +
          '<option value="不具合の報告">不具合の報告</option>' +
          '<option value="改善要望">改善要望</option>' +
          '<option value="その他">その他</option>';
        subject.parentNode.replaceChild(select, subject);
      }
      Array.from(page.querySelectorAll('*')).forEach(function(el) {
        if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
          el.textContent = el.textContent.replace(/[^\S\r\n]*[\uE000-\uF8FF\u2190-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]+/g, '').trim() || el.textContent;
        }
      });
    }
    document.querySelectorAll('.beta, .beta-pixel').forEach(function(el) {
      el.remove();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContactPage, { once: true });
  } else {
    initContactPage();
  }
})();

(function enforceHistoryNewestFirst() {
  renderHistory = function() {
    var cont = document.getElementById('histList');
    var empty = document.getElementById('histEmpty');
    if (!cont) return;

    var hist = getCutHistory().slice();
    var fc      = (((document.getElementById('hsClient')  || {}).value) || '').toLowerCase();
    var fn      = (((document.getElementById('hsName')    || {}).value) || '').toLowerCase();
    var fdf     = ((document.getElementById('hsDateFrom') || {}).value || '');
    var fdt     = ((document.getElementById('hsDateTo')   || {}).value || '');
    var fs      = ((document.getElementById('hsSt')       || {}).value || '');
    var fk      = ((document.getElementById('hsKind')     || {}).value || '');
    var keyword = (((document.getElementById('hsKeyword') || {}).value) || '').toLowerCase();
    var sort    = ((document.getElementById('hsSort')     || {}).value || 'date_desc');

    if (fc) hist = hist.filter(function(h) { return (h.client || '').toLowerCase().indexOf(fc) >= 0; });
    if (fn) hist = hist.filter(function(h) { return (h.name   || '').toLowerCase().indexOf(fn) >= 0; });
    var chipFrom = (typeof _chipDateFrom !== 'undefined' ? _chipDateFrom : '') || '';
    var chipTo   = (typeof _chipDateTo   !== 'undefined' ? _chipDateTo   : '') || '';
    if (chipFrom) hist = hist.filter(function(h) { return normDateStr(h.dateLabel || h.date) >= chipFrom; });
    if (chipTo)   hist = hist.filter(function(h) { return normDateStr(h.dateLabel || h.date) <= chipTo;   });
    if (fdf && !chipFrom) hist = hist.filter(function(h) { return parseDateValue(h.date) >= parseDateValue(fdf); });
    if (fdt && !chipTo)   hist = hist.filter(function(h) { return parseDateValue(h.date) <= parseDateValue(fdt); });
    if (fs) hist = hist.filter(function(h) { return (h.spec || '') === fs; });
    if (fk) hist = hist.filter(function(h) { return (h.kind || '') === fk; });
    if (keyword) hist = hist.filter(function(h) { return [h.client, h.name, h.spec, h.kind, h.worker].join(' ').toLowerCase().indexOf(keyword) >= 0; });

    // 種別フィルター
    var typeFilter = (typeof _histTypeFilter !== 'undefined') ? _histTypeFilter : 'all';
    if (typeFilter === 'cut')    hist = hist.filter(function(h) { return !h.type || h.type === 'cut'; });
    if (typeFilter === 'weight') hist = hist.filter(function(h) { return h.type === 'weight'; });

    hist.sort(function(a, b) {
      if (sort === 'date_asc')     return parseDateValue(a.date) - parseDateValue(b.date);
      if (sort === 'deadline_asc') return parseDateValue(a.deadline) - parseDateValue(b.deadline);
      if (sort === 'spec_asc')     return String(a.spec || '').localeCompare(String(b.spec || ''), 'ja');
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
    var pageData = paginateItems(hist, historyPage, HISTORY_PAGE_SIZE);
    historyPage = pageData.page;

    var countLabel = document.getElementById('hiCountLabel');
    if (countLabel) countLabel.textContent = hist.length.toLocaleString() + '件';

    cont.innerHTML = pageData.items.map(function(h) {
      var isWeight = h.type === 'weight';
      if (isWeight) {
        var w = h.weight || {};
        var kgStr   = w.sumKg  ? (Math.round(w.sumKg * 10) / 10).toLocaleString() + ' kg' : '—';
        var amtStr  = w.sumAmt != null ? '概算 ' + Math.round(w.sumAmt).toLocaleString() + ' 円' : '';
        var rowCount = (w.rows || []).length;
        var clientLabel = h.client || '';
        return '<div class="hi-card hi-card--weight" onclick="showWeightHistPreview(' + h.id + ')">' +
          '<div class="hi-card-top">' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<span class="hi-tag hi-tag-weight">⚖ 重量</span>' +
              (clientLabel ? '<span class="hi-card-client">' + escapeHtml(clientLabel) + '</span>' : '') +
              (h.name      ? '<span style="font-size:12px;color:#8888a8">' + escapeHtml(h.name) + '</span>' : '') +
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
      if (h.type === 'cut_project' && h.project) {
        var sectionCount = (h.project.sections || []).length;
        var projectClient = h.client || '顧客未設定';
        return '<div class="hi-card" onclick="showHistPreview(' + h.id + ')">' +
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
      // 取り合いカード
      var remCount   = h.result && h.result.remnants ? h.result.remnants.length : 0;
      var specLabel  = h.spec   || '規格未設定';
      var clientLabel = h.client || '顧客未設定';
      return '<div class="hi-card" onclick="showHistPreview(' + h.id + ')">' +
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
    }).join('');

    renderPager('histPagination', historyPage, pageData.totalPages, 'setHistoryPage');
  };
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
        if (!list.contains(e.target) && !selected.contains(e.target)) {
          list.style.display = 'block';
        }
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
      var list = document.getElementById('specList');
      if (list && list.dataset.forceOpen === '1') {
        list.style.display = 'block';
      }
      return out;
    };
  }

  var _baseSelectKind = typeof selectKind === 'function' ? selectKind : null;
  if (_baseSelectKind) {
    selectKind = function(btn, k) {
      var list = document.getElementById('specList');
      if (list) list.dataset.forceOpen = '1';
      var out = _baseSelectKind.apply(this, arguments);
      setTimeout(function() {
        var refreshedList = document.getElementById('specList');
        if (refreshedList) {
          refreshedList.dataset.forceOpen = '0';
          refreshedList.style.display = 'block';
        }
      }, 0);
      return out;
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSpecPanelBehavior, { once: true });
  } else {
    bindSpecPanelBehavior();
  }
})();

(function enhanceDeadlineInput() {
  function pad2(v) {
    v = String(v || '').replace(/[^\d]/g, '');
    return v ? v.padStart(2, '0') : '';
  }

  function syncHidden(hidden, monthInput, dayInput) {
    if (!hidden) return;
    var mm = pad2(monthInput && monthInput.value);
    var dd = pad2(dayInput && dayInput.value);
    if (monthInput) monthInput.value = mm ? String(parseInt(mm, 10)) : '';
    if (dayInput) dayInput.value = dd ? String(parseInt(dd, 10)) : '';
    hidden.value = (mm && dd) ? ('2026-' + mm + '-' + dd) : '';
    if (typeof saveSettings === 'function') saveSettings();
  }

  function bindEnterNav(input, target) {
    if (!input) return;
    input.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (target) {
        target.focus();
        if (typeof target.select === 'function') target.select();
      }
    });
  }

  function clampPart(input, max) {
    if (!input) return;
    input.addEventListener('input', function() {
      var digits = String(input.value || '').replace(/[^\d]/g, '').slice(0, 2);
      var num = parseInt(digits || '0', 10);
      if (digits && num > max) num = max;
      input.value = digits ? String(num) : '';
    });
  }

  function init() {
    var hidden = document.getElementById('jobDeadline');
    if (!hidden || hidden.dataset.segmented === '1') return;
    var field = hidden.closest('.field');
    if (!field) return;

    hidden.type = 'hidden';
    hidden.dataset.segmented = '1';

    var initial = String(hidden.value || '');
    var mm0 = '';
    var dd0 = '';
    var m = initial.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      mm0 = String(parseInt(m[2], 10));
      dd0 = String(parseInt(m[3], 10));
    }

    var wrap = document.createElement('div');
    wrap.className = 'deadline-split';
    wrap.innerHTML =
      '<span class="deadline-year">2026</span>' +
      '<span class="deadline-sep">/</span>' +
      '<input type="text" id="jobDeadlineMonth" inputmode="numeric" autocomplete="off" placeholder="月" maxlength="2">' +
      '<span class="deadline-sep">/</span>' +
      '<input type="text" id="jobDeadlineDay" inputmode="numeric" autocomplete="off" placeholder="日" maxlength="2">';

    hidden.insertAdjacentElement('afterend', wrap);

    var monthInput = document.getElementById('jobDeadlineMonth');
    var dayInput = document.getElementById('jobDeadlineDay');
    var next = document.getElementById('jobWorker');
    monthInput.value = mm0;
    dayInput.value = dd0;

    clampPart(monthInput, 12);
    clampPart(dayInput, 31);
    bindEnterNav(monthInput, dayInput);
    bindEnterNav(dayInput, next);

    [monthInput, dayInput].forEach(function(input) {
      input.addEventListener('input', function() {
        syncHidden(hidden, monthInput, dayInput);
      });
      input.addEventListener('blur', function() {
        syncHidden(hidden, monthInput, dayInput);
      });
    });

    if (!hidden.value) {
      monthInput.value = '';
      dayInput.value = '';
    } else {
      syncHidden(hidden, monthInput, dayInput);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

(function refineDeadlineSplitUi() {
  function pad2(v) {
    v = String(v || '').replace(/[^\d]/g, '');
    return v ? v.padStart(2, '0') : '';
  }

  function syncDeadlineValue(hidden, monthInput, dayInput) {
    if (!hidden) return;
    var mm = pad2(monthInput && monthInput.value);
    var dd = pad2(dayInput && dayInput.value);
    hidden.value = (mm && dd) ? ('2026-' + mm + '-' + dd) : '';
    if (typeof saveSettings === 'function') saveSettings();
  }

  function openDeadlinePicker(hidden, monthInput, dayInput) {
    var picker = document.createElement('input');
    picker.type = 'date';
    picker.value = hidden.value || '2026-01-01';
    picker.style.position = 'fixed';
    picker.style.left = '-9999px';
    picker.style.opacity = '0';
    document.body.appendChild(picker);
    picker.addEventListener('change', function() {
      var m = String(picker.value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        monthInput.value = String(parseInt(m[2], 10));
        dayInput.value = String(parseInt(m[3], 10));
        syncDeadlineValue(hidden, monthInput, dayInput);
      }
      picker.remove();
    }, { once: true });
    picker.addEventListener('blur', function() {
      setTimeout(function() {
        if (picker.isConnected) picker.remove();
      }, 0);
    }, { once: true });
    picker.focus();
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  }

  function init() {
    var hidden = document.getElementById('jobDeadline');
    var wrap = document.querySelector('.deadline-split');
    var monthInput = document.getElementById('jobDeadlineMonth');
    var dayInput = document.getElementById('jobDeadlineDay');
    if (!hidden || !wrap || !monthInput || !dayInput) return;

    monthInput.placeholder = '月';
    dayInput.placeholder = '日';

    if (!document.getElementById('jobDeadlinePicker')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'jobDeadlinePicker';
      btn.className = 'deadline-picker-btn';
      btn.setAttribute('aria-label', 'カレンダーを開く');
      btn.textContent = '日付';
      btn.addEventListener('click', function() {
        openDeadlinePicker(hidden, monthInput, dayInput);
      });
      wrap.appendChild(btn);
    }

    [monthInput, dayInput].forEach(function(input) {
      if (input.dataset.deadlineSyncBound === '1') return;
      input.dataset.deadlineSyncBound = '1';
      input.addEventListener('input', function() {
        syncDeadlineValue(hidden, monthInput, dayInput);
      });
      input.addEventListener('blur', function() {
        syncDeadlineValue(hidden, monthInput, dayInput);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

(function rebuildDeadlineUiFinal() {
  function digits(v, max) {
    return String(v || '').replace(/[^\d]/g, '').slice(0, max);
  }

  function pad2(v) {
    v = digits(v, 2);
    return v ? v.padStart(2, '0') : '';
  }

  function syncDeadline(hidden, yearInput, monthInput, dayInput) {
    if (!hidden) return;
    var yyyy = digits(yearInput && yearInput.value, 4) || '2026';
    var mm = pad2(monthInput && monthInput.value);
    var dd = pad2(dayInput && dayInput.value);
    yearInput.value = yyyy;
    if (monthInput) monthInput.value = mm ? String(parseInt(mm, 10)) : '';
    if (dayInput) dayInput.value = dd ? String(parseInt(dd, 10)) : '';
    hidden.value = (mm && dd) ? (yyyy + '-' + mm + '-' + dd) : '';
    if (typeof saveSettings === 'function') saveSettings();
  }

  function bindEnter(input, next) {
    if (!input || input.dataset.deadlineEnterBound === '1') return;
    input.dataset.deadlineEnterBound = '1';
    input.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (next) {
        next.focus();
        if (typeof next.select === 'function') next.select();
      }
    });
  }

  function bindClamp(input, maxLen, maxValue) {
    if (!input || input.dataset.deadlineClampBound === '1') return;
    input.dataset.deadlineClampBound = '1';
    input.addEventListener('input', function() {
      var raw = digits(input.value, maxLen);
      var num = parseInt(raw || '0', 10);
      if (raw && maxValue && num > maxValue) num = maxValue;
      input.value = raw ? String(num) : '';
    });
  }

  function openPicker(hidden, yearInput, monthInput, dayInput) {
    hidden.type = 'date';
    hidden.classList.add('deadline-native-picker');
    hidden.value = hidden.value || ((digits(yearInput.value, 4) || '2026') + '-01-01');

    if (hidden.dataset.deadlineNativeBound !== '1') {
      hidden.dataset.deadlineNativeBound = '1';
      hidden.addEventListener('change', function() {
        var m = String(hidden.value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
          yearInput.value = String(parseInt(m[1], 10));
          monthInput.value = String(parseInt(m[2], 10));
          dayInput.value = String(parseInt(m[3], 10));
          syncDeadline(hidden, yearInput, monthInput, dayInput);
        }
      });
    }

    try {
      hidden.focus();
      if (typeof hidden.showPicker === 'function') {
        hidden.showPicker();
      } else {
        hidden.click();
      }
    } catch (e) {
      hidden.click();
    }
  }

  function init() {
    var hidden = document.getElementById('jobDeadline');
    var wrap = document.querySelector('.deadline-split');
    if (!hidden || !wrap || wrap.dataset.deadlineRebuilt === '1') return;
    wrap.dataset.deadlineRebuilt = '1';

    hidden.classList.add('deadline-native-picker');

    var match = String(hidden.value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var yyyy = match ? String(parseInt(match[1], 10)) : '2026';
    var mm = match ? String(parseInt(match[2], 10)) : '';
    var dd = match ? String(parseInt(match[3], 10)) : '';

    wrap.innerHTML =
      '<input type="text" id="jobDeadlineYear" class="deadline-year-input" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="2026">' +
      '<span class="deadline-sep">/</span>' +
      '<input type="text" id="jobDeadlineMonth" class="deadline-part-input" inputmode="numeric" autocomplete="off" maxlength="2" placeholder="月">' +
      '<span class="deadline-sep">/</span>' +
      '<input type="text" id="jobDeadlineDay" class="deadline-part-input" inputmode="numeric" autocomplete="off" maxlength="2" placeholder="日">' +
      '<button type="button" id="jobDeadlinePicker" class="deadline-picker-btn" aria-label="カレンダーを開く"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM6 8h12V6H6v2Z"/></svg></button>';

    var yearInput = document.getElementById('jobDeadlineYear');
    var monthInput = document.getElementById('jobDeadlineMonth');
    var dayInput = document.getElementById('jobDeadlineDay');
    var pickerBtn = document.getElementById('jobDeadlinePicker');
    var memoInput = document.getElementById('jobWorker');

    yearInput.value = yyyy;
    monthInput.value = mm;
    dayInput.value = dd;

    bindClamp(yearInput, 4, 0);
    bindClamp(monthInput, 2, 12);
    bindClamp(dayInput, 2, 31);
    bindEnter(yearInput, monthInput);
    bindEnter(monthInput, dayInput);
    bindEnter(dayInput, memoInput);

    [yearInput, monthInput, dayInput].forEach(function(input) {
      input.addEventListener('input', function() {
        syncDeadline(hidden, yearInput, monthInput, dayInput);
      });
      input.addEventListener('blur', function() {
        syncDeadline(hidden, yearInput, monthInput, dayInput);
      });
    });

    if (pickerBtn) {
      pickerBtn.addEventListener('click', function() {
        openPicker(hidden, yearInput, monthInput, dayInput);
      });
    }

    syncDeadline(hidden, yearInput, monthInput, dayInput);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

(function ensureDeadlineEnterToMemo() {
  function bind() {
    var dayInput = document.getElementById('jobDeadlineDay');
    var memoInput = document.getElementById('jobWorker');
    if (!dayInput || !memoInput || dayInput.dataset.memoEnterBound === '1') return;
    dayInput.dataset.memoEnterBound = '1';
    dayInput.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      memoInput.focus();
      if (typeof memoInput.select === 'function') memoInput.select();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
