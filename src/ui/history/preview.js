(function(global) {
  'use strict';

  var ns = global.Toriai.ui.history = global.Toriai.ui.history || {};

  ns.buildPrintSectionFromPayload = function buildPrintSectionFromPayload(sectionIndex, spec, payload, endLoss) {
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

    var orderedSls = typeof global.sortStockLengthsForDisplay === 'function'
      ? global.sortStockLengthsForDisplay(Object.keys(slGroups).map(Number))
      : Object.keys(slGroups).map(Number).sort(function(a, b) { return b - a; });

    var motherSummary = orderedSls.map(function(sl) {
      return Number(sl).toLocaleString() + 'mm x ' + slGroups[sl].length;
    }).join(' + ');

    var barHtml = '';
    orderedSls.forEach(function(sl) {
      barHtml += global.buildPrintBarHtml(slGroups[sl], sl, endLoss);
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
  };

  ns.buildSinglePrintHtml = function buildSinglePrintHtml(job, spec, payload, endLoss) {
    return global.buildPrintPages(job || {}, [
      ns.buildPrintSectionFromPayload(1, spec, payload, endLoss || 150)
    ]);
  };

  ns.showHistPreview = function showHistPreview(id) {
    var hist = global.getCutHistory();
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
    var payload = typeof global.buildCardSelectionPayload === 'function'
      ? global.buildCardSelectionPayload(r, printedId)
      : null;
    var bars = payload && payload.selectedBars && payload.selectedBars.length
      ? payload.selectedBars.slice()
      : ((r.selectedBars && r.selectedBars.length) ? r.selectedBars.slice() : global.getHistoryBarsForPrint(r, printedId));
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
    var orderedSls = global.sortStockLengthsForDisplay(Object.keys(slGroups).map(Number));
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
      barHtml += global.buildPrintBarHtml(slGroups[sl2], sl2, endLoss);
    });
    body.innerHTML = global.buildPrintPages(job, [{
      idx: 1,
      spec: spec,
      motherSummary: motherSummary,
      sumMap: sumMap,
      remTags: remTags,
      barHtml: barHtml
    }]);
    modal.style.display = 'flex';
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
