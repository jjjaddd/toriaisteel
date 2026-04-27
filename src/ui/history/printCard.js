(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.ui = ns.ui || {};
  ns.ui.history = ns.ui.history || {};

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
      if (typeof global.isStdStockLength === 'function') return !global.isStdStockLength(sl);
      return true;
    });
  }

  function buildInventoryConsumeSignature(cardId, bars, meta) {
    var selectedIds = global.getSelectedInventoryIds(meta);
    if (selectedIds.length) {
      return JSON.stringify([cardId || '', selectedIds.sort()]);
    }
    return JSON.stringify([
      cardId || '',
      getConsumedInventoryLengths(bars, meta).sort(function(a, b) { return b - a; })
    ]);
  }

  ns.ui.history.getConsumedInventoryLengths = getConsumedInventoryLengths;
  ns.ui.history.buildInventoryConsumeSignature = buildInventoryConsumeSignature;
  global.getConsumedInventoryLengths = getConsumedInventoryLengths;
  global.buildInventoryConsumeSignature = buildInventoryConsumeSignature;

  global.showHistPreview = function showHistPreview(id) {
    return ns.ui.history.showHistPreview(id);
  };

  global.printCard = function printCard(cardId) {
    global._lastPrintedCardId = cardId;
    var payload = global.buildPrintPayload(cardId, global._lastCalcResult);
    if (!payload.bars.length) return;
    var meta = payload.meta || {};
    var job = meta.job || (typeof global.getJobInfo === 'function' ? global.getJobInfo() : {});
    var spec = meta.spec || ((document.getElementById('spec') || {}).value || '');
    var endLoss = parseInt(meta.endLoss, 10) || parseInt(((document.getElementById('endloss') || {}).value), 10) || 150;

    global.openPrintWindow(ns.ui.history.buildSinglePrintHtml(job, spec, payload, endLoss));

    if (global._lastCalcResult && typeof global.saveCutHistory === 'function') {
      global.saveCutHistory(global._lastCalcResult, cardId);
    }
    global.autoRegisterAfterPrint();
  };

  global.autoRegisterAfterPrint = function autoRegisterAfterPrint() {
    var cardId = global._lastPrintedCardId;
    if (!cardId) return;
    var payload = global.buildPrintPayload(cardId, global._lastCalcResult);
    var remSignature = global.buildRemnantSignature(cardId, payload.rems);
    var consumeSignature = buildInventoryConsumeSignature(cardId, payload.bars, payload.meta);

    if (payload.rems.length && typeof global.registerRemnants === 'function' && global._lastPrintedRemnantSignature !== remSignature) {
      global._lastPrintedRemnantSignature = remSignature;
      global.registerRemnants(payload.rems);
    }
    var selectedIds = global.getSelectedInventoryIds(payload.meta);
    if (selectedIds.length && typeof global.consumeSelectedInventoryRemnants === 'function' && global._lastConsumedInventorySignature !== consumeSignature) {
      global._lastConsumedInventorySignature = consumeSignature;
      global.consumeSelectedInventoryRemnants(payload.meta.selectedInventoryRemnants);
    } else if (getConsumedInventoryLengths(payload.bars, payload.meta).length && typeof global.consumeInventoryBars === 'function' && global._lastConsumedInventorySignature !== consumeSignature) {
      global._lastConsumedInventorySignature = consumeSignature;
      global.consumeInventoryBars(payload.bars, payload.meta);
    }
  };
})(window);
