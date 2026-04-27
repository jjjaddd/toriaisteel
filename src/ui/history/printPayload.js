(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.ui = ns.ui || {};
  ns.ui.history = ns.ui.history || {};
  var printPayload = ns.ui.history.printPayload = ns.ui.history.printPayload || {};

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
    if (typeof global.buildRemnantsFromBars === 'function') {
      var meta = global._lastCalcResult && global._lastCalcResult.meta ? global._lastCalcResult.meta : {};
      return global.buildRemnantsFromBars(bars, meta);
    }
    return [];
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

  function getCardBarsByIdFromDom(cardId) {
    var card = document.getElementById(cardId);
    if (!card) return [];
    var diagHtml = '';
    card.querySelectorAll('[id^="diag_"]').forEach(function(diag) {
      diagHtml += diag.innerHTML || '';
    });
    if (!diagHtml) return [];
    var endLoss = parseInt(((document.getElementById('endloss') || {}).value), 10) || 150;
    return global.parseBarsFromDiagHtml(diagHtml, 0, endLoss);
  }

  function buildBarsFromCardPatternFromDom(cardId) {
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
    if (typeof global.getSelectedBarsFromResultData === 'function') {
      return global.getSelectedBarsFromResultData(resultData || global._lastCalcResult || {}, cardId);
    }
    return global.getCardBarsById(cardId);
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
      if (typeof global.isStdStockLength === 'function') return !global.isStdStockLength(sl);
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
    var liveResult = resultData || global._lastCalcResult || {};
    var liveMeta = liveResult && liveResult.meta ? liveResult.meta : {};
    var fallbackMeta = data.resultMeta || {};
    var canUseLiveResult = !Object.keys(data).length ||
      !fallbackMeta.calcId ||
      !liveMeta.calcId ||
      String(fallbackMeta.calcId) === String(liveMeta.calcId);
    var payload = canUseLiveResult && typeof global.buildCardSelectionPayload === 'function'
      ? global.buildCardSelectionPayload(liveResult, cardId)
      : null;
    var bars = payload
      ? payload.selectedBars.slice()
      : (Array.isArray(data.bars) && data.bars.length
          ? data.bars.slice()
          : getBarsForSelectedCard(cardId, resultData || global._lastCalcResult));
    var meta = (payload ? payload.meta : null) || data.resultMeta || (resultData && resultData.meta) || (global._lastCalcResult && global._lastCalcResult.meta) || {};
    var rems = payload
      ? payload.remnants.slice()
      : (Array.isArray(data.remnants) && data.remnants.length
          ? data.remnants.slice()
          : (typeof global.buildRemnantsFromBars === 'function'
          ? global.buildRemnantsFromBars(bars, meta)
          : extractRemnantsFromBars(bars)));
    if (String(cardId || '').indexOf('card_yield_') === 0 && meta && Array.isArray(meta.remnantBars) && meta.remnantBars.length) {
      var remnantBars = meta.remnantBars.map(function(bar) {
        return { pat: (bar.pat || []).slice(), loss: bar.loss || 0, sl: bar.sl || 0 };
      });
      var hasRemnantBars = bars.some(function(bar) {
        return bar && bar.sl && typeof global.isStdStockLength === 'function' && !global.isStdStockLength(bar.sl);
      });
      if (!hasRemnantBars) bars = remnantBars.concat(bars);
    }
    return {
      bars: bars,
      meta: meta,
      rems: rems
    };
  }

  function buildCutSourceLabel(slLen) {
    var safeLen = parseInt(slLen, 10) || 0;
    if (!safeLen) return '母材未設定';
    return global.isStdStockLength(safeLen)
      ? safeLen.toLocaleString() + 'mm'
      : '残材 L=' + safeLen.toLocaleString() + 'mm';
  }

  function buildPrintBarHtml(bars, sl, endLoss) {
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
      var isRemnant = typeof global.isStdStockLength === 'function' && slKey > 0 && !global.isStdStockLength(slKey);
      Object.keys(grouped).forEach(function(key) {
        var g = grouped[key];
        var bar = g.bar;
        var patSummary = typeof global.formatPatternSummary === 'function'
          ? global.formatPatternSummary(bar.pat)
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
        var segments = typeof global.buildDisplaySegments === 'function'
          ? global.buildDisplaySegments(bar.pat || [])
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
  }

  printPayload.getHistoryBarsForPrint = getHistoryBarsForPrint;
  printPayload.extractRemnantsFromBars = extractRemnantsFromBars;
  printPayload.parsePatternPieces = parsePatternPieces;
  printPayload.getBarsForSelectedCard = getBarsForSelectedCard;
  printPayload.buildRemHtmlFromRemnants = buildRemHtmlFromRemnants;
  printPayload.buildRemnantSignature = buildRemnantSignature;
  printPayload.getConsumedRemnantLengths = getConsumedRemnantLengths;
  printPayload.buildConsumeSignature = buildConsumeSignature;
  printPayload.getSelectedInventoryIds = getSelectedInventoryIds;
  printPayload.buildPrintPayload = buildPrintPayload;
  printPayload.buildCutSourceLabel = buildCutSourceLabel;
  printPayload.buildPrintBarHtml = buildPrintBarHtml;

  global.getHistoryBarsForPrint = getHistoryBarsForPrint;
  global.extractRemnantsFromBars = extractRemnantsFromBars;
  global.parsePatternPieces = parsePatternPieces;
  global.getBarsForSelectedCard = getBarsForSelectedCard;
  global.buildRemHtmlFromRemnants = buildRemHtmlFromRemnants;
  global.buildRemnantSignature = buildRemnantSignature;
  global.getConsumedRemnantLengths = getConsumedRemnantLengths;
  global.buildConsumeSignature = buildConsumeSignature;
  global.getSelectedInventoryIds = getSelectedInventoryIds;
  global.buildPrintPayload = buildPrintPayload;

  global.autoSyncResultRemnants = function() {};
  global.showRegisterRemnantsBtn = function() {};
  global.doRegisterRemnants = function() {};
  global.extractRemnantsFromCard = function(cardId) {
    return buildPrintPayload(cardId, global._lastCalcResult).rems.slice();
  };
  global.getCardBarsById = function(cardId) {
    return buildPrintPayload(cardId, global._lastCalcResult).bars.slice();
  };
  global.buildBarsFromCardPattern = function(cardId) {
    return global.getCardBarsById(cardId);
  };
  global.buildCutSourceLabel = buildCutSourceLabel;
  global.buildPrintBarHtml = buildPrintBarHtml;

  printPayload._domGetCardBars = getCardBarsByIdFromDom;
  printPayload._domBuildBarsFromCardPattern = buildBarsFromCardPatternFromDom;
})(window);
