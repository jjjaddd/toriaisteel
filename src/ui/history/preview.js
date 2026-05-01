(function(global) {
  'use strict';

  var ns = global.Toriai.ui.history = global.Toriai.ui.history || {};
  var currentPreviewHistoryId = null;
  var currentPreviewEditOpen = false;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getPreviewJob(entry) {
    var projectJob = entry && entry.project && entry.project.job ? entry.project.job : {};
    var metaJob = entry && entry.result && entry.result.meta && entry.result.meta.job ? entry.result.meta.job : {};
    return {
      client: entry.client || projectJob.client || metaJob.client || '',
      name: entry.name || projectJob.name || metaJob.name || '',
      deadline: entry.deadline || projectJob.deadline || metaJob.deadline || '',
      worker: entry.worker || projectJob.worker || metaJob.worker || ''
    };
  }

  function renderPreviewEditPanel(entry) {
    var panel = document.getElementById('histPreviewEditPanel');
    if (!panel || !entry) return;
    if (!currentPreviewEditOpen) {
      panel.innerHTML = '';
      return;
    }
    var job = getPreviewJob(entry);
    panel.innerHTML =
      '<div style="padding:12px 20px 10px;border-bottom:1px solid #ececf2;background:#fbfbfd">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px">' +
          '<div style="font-size:11px;font-weight:800;color:#555;letter-spacing:.08em">作業情報</div>' +
          '<button type="button" onclick="applyHistoryPreviewJobInfo()" style="background:#1a1a2e;color:#fff;border:none;border-radius:7px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">反映</button>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">' +
          buildPreviewJobField('顧客', 'histPreviewClient', 'text', job.client) +
          buildPreviewJobField('現場名', 'histPreviewName', 'text', job.name) +
          buildPreviewJobField('納期', 'histPreviewDeadline', 'date', job.deadline) +
          buildPreviewJobField('メモ', 'histPreviewWorker', 'text', job.worker) +
        '</div>' +
      '</div>';
  }

  function buildPreviewJobField(label, id, type, value) {
    return '<label style="display:flex;flex-direction:column;gap:4px;font-size:10px;color:#666;font-weight:700">' +
      '<span>' + label + '</span>' +
      '<input id="' + id + '" type="' + type + '" value="' + esc(value) + '" ' +
        'onkeydown="if(event.key===\'Enter\')applyHistoryPreviewJobInfo()" ' +
        'style="width:100%;box-sizing:border-box;border:1px solid #d8d8e2;border-radius:7px;padding:7px 8px;font-size:12px;font-family:inherit;background:#fff;color:#111">' +
      '</label>';
  }

  function buildProjectPreviewHtml(entry, job) {
    var project = entry && entry.project ? entry.project : null;
    if (!project) return '';
    if (Array.isArray(project.sections) && project.sections.length) {
      return global.buildPrintPages(job || {}, project.sections.map(function(section, idx) {
        return {
          idx: section.idx || idx + 1,
          spec: section.spec || '',
          motherSummary: section.motherSummary || '',
          sumMap: section.sumMap || {},
          remTags: (section.remTags || []).slice(),
          bars: JSON.parse(JSON.stringify(section.bars || [])),
          endLoss: section.endLoss || 150
        };
      }));
    }
    return project.printHtml || '<div style="padding:20px;color:#aaa;text-align:center">データがありません</div>';
  }

  function buildSingleHistoryPreviewHtml(entry, job) {
    var r = entry.result || {};
    var spec = entry.spec || '';
    var endLoss = r.endLoss || 150;
    var printedId = entry.printedCardId || '';
    var payload = typeof global.buildCardSelectionPayload === 'function'
      ? global.buildCardSelectionPayload(r, printedId)
      : null;
    var bars = payload && payload.selectedBars && payload.selectedBars.length
      ? payload.selectedBars.slice()
      : ((r.selectedBars && r.selectedBars.length) ? r.selectedBars.slice() : global.getHistoryBarsForPrint(r, printedId));
    if (!bars.length) {
      return '<div style="padding:20px;color:#aaa;text-align:center">データがありません</div>';
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
    var remList = payload && payload.remnants ? payload.remnants.slice() : ((r.remnants || entry.remnants) || []);
    var remTags = remList.filter(function(r2) { return r2.len >= 500; }).map(function(r2) {
      return r2.len.toLocaleString() + 'mm' + (r2.qty > 1 ? ' x ' + r2.qty : '');
    });
    var barHtml = '';
    orderedSls.forEach(function(sl2) {
      barHtml += global.buildPrintBarHtml(slGroups[sl2], sl2, endLoss);
    });
    return global.buildPrintPages(job, [{
      idx: 1,
      spec: spec,
      motherSummary: motherSummary,
      sumMap: sumMap,
      remTags: remTags,
      barHtml: barHtml
    }]);
  }

  function renderHistoryPreviewEntry(entry) {
    var body = document.getElementById('histPreviewBody');
    if (!body || !entry) return;
    var job = getPreviewJob(entry);
    renderPreviewEditPanel(entry);
    body.innerHTML = entry.type === 'cut_project' && entry.project
      ? buildProjectPreviewHtml(entry, job)
      : buildSingleHistoryPreviewHtml(entry, job);
  }

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
    currentPreviewHistoryId = id;
    currentPreviewEditOpen = false;
    var editBtn = document.getElementById('histPreviewEditBtn');
    if (editBtn) editBtn.textContent = '編集';
    renderHistoryPreviewEntry(h);
    modal.style.display = 'flex';
  };

  ns.toggleHistoryPreviewJobEdit = function toggleHistoryPreviewJobEdit() {
    if (!currentPreviewHistoryId) return;
    var hist = global.getCutHistory();
    var entry = hist.find(function(x) { return x.id === currentPreviewHistoryId; });
    if (!entry) return;
    currentPreviewEditOpen = !currentPreviewEditOpen;
    renderPreviewEditPanel(entry);
    var btn = document.getElementById('histPreviewEditBtn');
    if (btn) btn.textContent = currentPreviewEditOpen ? '閉じる' : '編集';
  };

  ns.applyHistoryPreviewJobInfo = function applyHistoryPreviewJobInfo() {
    if (!currentPreviewHistoryId) return;
    var hist = global.getCutHistory();
    var entry = hist.find(function(x) { return x.id === currentPreviewHistoryId; });
    if (!entry) return;
    var job = {
      client: ((document.getElementById('histPreviewClient') || {}).value || '').trim(),
      name: ((document.getElementById('histPreviewName') || {}).value || '').trim(),
      deadline: ((document.getElementById('histPreviewDeadline') || {}).value || '').trim(),
      worker: ((document.getElementById('histPreviewWorker') || {}).value || '').trim()
    };
    entry.client = job.client;
    entry.name = job.name;
    entry.deadline = job.deadline;
    entry.worker = job.worker;
    if (entry.project) {
      entry.project.job = Object.assign({}, entry.project.job || {}, job);
      if (Array.isArray(entry.project.sections) && entry.project.sections.length) {
        entry.project.printHtml = buildProjectPreviewHtml(entry, job);
      }
    }
    if (entry.result && entry.result.meta) {
      entry.result.meta.job = Object.assign({}, entry.result.meta.job || {}, job);
    }
    if (typeof global.saveCutHistoryList === 'function') global.saveCutHistoryList(hist);
    if (typeof global.sbUpsert === 'function') global.sbUpsert('cut_history', hist);
    renderHistoryPreviewEntry(entry);
    if (typeof global.renderHistory === 'function') global.renderHistory();
  };

  global.applyHistoryPreviewJobInfo = ns.applyHistoryPreviewJobInfo;
  global.toggleHistoryPreviewJobEdit = ns.toggleHistoryPreviewJobEdit;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
