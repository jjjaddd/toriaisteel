// 切断履歴の保存・読込 + 計算結果メタ生成 + カード選択ペイロード組み立て

function getCutHistory() {
  try { var r=localStorage.getItem(LS_CUT_HIST); return r?JSON.parse(r):[]; } catch(e){return [];}
}

function getLatestPrintedHistoryRemnants(cardId) {
  var hist = getCutHistory();
  if (!hist || !hist.length) return [];
  var latest = hist[0] || {};
  if ((latest.printedCardId || '') !== String(cardId || '')) return [];
  var result = latest.result || {};
  return Array.isArray(result.remnants) ? result.remnants.slice() : [];
}

function buildResultMeta(resultData) {
  var meta = resultData && resultData.meta ? Object.assign({}, resultData.meta) : {};
  if (!meta.spec) meta.spec = (document.getElementById('spec') || {}).value || '';
  if (!meta.kind) meta.kind = (typeof getCurrentKind === 'function' ? getCurrentKind() : (typeof curKind !== 'undefined' ? curKind : '')) || '';
  if (!meta.minRemnantLen) meta.minRemnantLen = parseInt((document.getElementById('minRemnantLen') || {}).value, 10) || 500;
  if (!meta.blade) meta.blade = parseInt((document.getElementById('blade') || {}).value, 10) || 3;
  if (!meta.endLoss) meta.endLoss = parseInt((document.getElementById('endloss') || {}).value, 10) || 150;
  if (!meta.job && typeof getJobInfo === 'function') meta.job = getJobInfo();
  if (!Array.isArray(meta.origPieces) && Array.isArray(resultData && resultData.origPieces)) meta.origPieces = resultData.origPieces.slice();
  if (!Array.isArray(meta.calcPieces) && Array.isArray(resultData && resultData.calcPieces)) meta.calcPieces = resultData.calcPieces.slice();
  return meta;
}

function cloneBarsForCard(bars, fallbackSl) {
  return (bars || []).map(function(bar) {
    return {
      pat: (bar.pat || []).slice(),
      loss: bar.loss || 0,
      sl: bar.sl || fallbackSl || 0
    };
  });
}

function getSelectedBarsFromResultData(resultData, cardId) {
  var result = resultData && resultData.result ? resultData.result : (resultData || {});
  var id = String(cardId || result.printedCardId || '');
  var printedCardId = String(result.printedCardId || '');
  var canUseStoredSelection = !id || (printedCardId && printedCardId === id);
  if (result.selectedBars && result.selectedBars.length && canUseStoredSelection) {
    return cloneBarsForCard(result.selectedBars, 0);
  }

  if (id.indexOf('card_remonly_') === 0) {
    return cloneBarsForCard(((result.meta || {}).remnantBars) || [], 0);
  }

  var yieldMatch = id.match(/^card_yield_(\d+)/);
  if (yieldMatch && result.allDP && result.allDP[parseInt(yieldMatch[1], 10)]) {
    var yieldCard = result.allDP[parseInt(yieldMatch[1], 10)];
    var remnantBars = cloneBarsForCard(((result.meta || {}).remnantBars) || [], 0);
    if (yieldCard && yieldCard.bars && yieldCard.bars.length) {
      var baseBars = cloneBarsForCard(yieldCard.bars || [], yieldCard.slA);
      var hasRemnantBars = baseBars.some(function(bar) {
        return bar && bar.sl && typeof isStdStockLength === 'function' && !isStdStockLength(bar.sl);
      });
      return hasRemnantBars ? baseBars : remnantBars.concat(baseBars);
    }
    var fallbackBars = cloneBarsForCard(yieldCard.bA || [], yieldCard.slA).concat(cloneBarsForCard(yieldCard.bB || [], yieldCard.slB));
    var hasFallbackRemnants = fallbackBars.some(function(bar) {
      return bar && bar.sl && typeof isStdStockLength === 'function' && !isStdStockLength(bar.sl);
    });
    return hasFallbackRemnants ? fallbackBars : remnantBars.concat(fallbackBars);
  }

  var patMatch = id.match(/^card_pat_([^_]+)/);
  var label = patMatch ? patMatch[1] : '';
  if (label === 'B90' && result.patB && result.patB.plan90) {
    return cloneBarsForCard(result.patB.plan90.bars || [], result.patB.plan90.sl);
  }
  if (label === 'B80' && result.patB && result.patB.plan80) {
    return cloneBarsForCard(result.patB.plan80.bars || [], result.patB.plan80.sl);
  }
  if (id.indexOf('card_pat') === 0 && result.patA) {
    return cloneBarsForCard(result.patA.bars || [], result.patA.sl);
  }
  if (result.allDP && result.allDP[0]) {
    if (result.allDP[0].bars && result.allDP[0].bars.length) {
      return cloneBarsForCard(result.allDP[0].bars || [], result.allDP[0].slA);
    }
    return cloneBarsForCard(result.allDP[0].bA || [], result.allDP[0].slA).concat(cloneBarsForCard(result.allDP[0].bB || [], result.allDP[0].slB));
  }
  return [];
}

function buildCardSelectionPayload(resultData, cardId) {
  var result = resultData && resultData.result ? resultData.result : (resultData || {});
  var meta = buildResultMeta(result);
  var selectedBars = getSelectedBarsFromResultData(result, cardId);
  return {
    cardId: String(cardId || result.printedCardId || ''),
    selectedBars: selectedBars,
    meta: meta,
    remnants: buildRemnantsFromBars(selectedBars, meta)
  };
}

function buildRemnantsFromBars(bars, meta) {
  var context = buildResultMeta({ meta: meta || {} });
  var minLen = parseInt(context.minRemnantLen, 10) || 500;
  var rems = [];
  (bars || []).forEach(function(bar) {
    if (!bar || bar.loss < minLen) return;
    rems.push({
      len: bar.loss,
      spec: context.spec || '',
      kind: context.kind || '',
      sl: bar.sl || 0,
      qty: 1
    });
  });
  return rems;
}

function legacyExtractRemnants(resultData, cardId) {
  var result = resultData && resultData.result ? resultData.result : (resultData || {});
  return buildRemnantsFromBars(getSelectedBarsFromResultData(result, cardId), buildResultMeta(result));
}

function saveCutHistory(resultData, cardId) {
  resultData = resultData || _lastCalcResult || {};
  var job = getJobInfo();
  var zones = getZoneInfo();
  var hist = getCutHistory();
  var payload = buildCardSelectionPayload(resultData, cardId);
  var resultMeta = payload.meta;
  var selectedBars = payload.selectedBars;
  var entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    dateLabel: new Date().toLocaleDateString('ja-JP'),
    client: job.client,
    name: job.name,
    deadline: job.deadline,
    worker: job.worker,
    spec: job.spec,
    kind: job.kind,
    zones: zones,
    printedCardId: cardId || '',
    result: {
      allDP: resultData.allDP ? resultData.allDP.slice(0, 5).map(function(d) {
        return {
          desc: d.desc,
          lossRate: d.lossRate,
          lossKg: d.lossKg,
          barKg: d.barKg,
          slA: d.slA,
          slB: d.slB,
          type: d.type,
          chg: d.chg,
          bA: d.bA ? d.bA.map(function(b) { return { pat: b.pat, loss: b.loss, sl: b.sl }; }) : [],
          bB: d.bB ? d.bB.map(function(b) { return { pat: b.pat, loss: b.loss, sl: b.sl }; }) : []
        };
      }) : [],
      patA: resultData.patA ? {
        label: resultData.patA.label,
        sl: resultData.patA.sl,
        bars: resultData.patA.bars ? resultData.patA.bars.map(function(b) { return { pat: b.pat, loss: b.loss, sl: b.sl }; }) : []
      } : null,
      patB: resultData.patB ? {
        label: resultData.patB.label,
        plan90: resultData.patB.plan90 ? {
          label: resultData.patB.plan90.label,
          sl: resultData.patB.plan90.sl,
          bars: resultData.patB.plan90.bars ? resultData.patB.plan90.bars.map(function(b) { return { pat: b.pat, loss: b.loss, sl: b.sl }; }) : []
        } : null,
        plan80: resultData.patB.plan80 ? {
          label: resultData.patB.plan80.label,
          sl: resultData.patB.plan80.sl,
          bars: resultData.patB.plan80.bars ? resultData.patB.plan80.bars.map(function(b) { return { pat: b.pat, loss: b.loss, sl: b.sl }; }) : []
        } : null
      } : null,
      meta: resultMeta,
      selectedBars: selectedBars,
      remnants: payload.remnants,
      blade: parseInt((document.getElementById('blade') || {}).value, 10) || 3,
      endLoss: parseInt((document.getElementById('endloss') || {}).value, 10) || 150
    }
  };
  hist.unshift(entry);
  var saved = false;
  while (!saved && hist.length > 0) {
    try {
      localStorage.setItem(LS_CUT_HIST, JSON.stringify(hist));
      saved = true;
    } catch (e) {
      hist = hist.slice(0, Math.floor(hist.length * 0.7));
    }
  }
  if (saved && typeof sbUpsert === 'function') sbUpsert('cut_history', hist);
  return entry;
}

function extractRemnants(resultData, cardId) {
  resultData = resultData || _lastCalcResult || {};
  return buildCardSelectionPayload(resultData, cardId).remnants;
}
