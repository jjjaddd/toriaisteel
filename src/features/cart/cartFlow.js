function getCutCartItems() {
  return getCart().filter(function(item) {
    return !(item && item.data && item.data.isWeight);
  });
}

function getStatValueFromHtml(statsHtml, label) {
  if (!statsHtml) return '';
  var wrap = document.createElement('div');
  wrap.innerHTML = statsHtml;
  var stat = Array.from(wrap.querySelectorAll('.cs')).find(function(node) {
    var labelNode = node.querySelector('.cl');
    return labelNode && (labelNode.textContent || '').trim() === label;
  });
  var valueNode = stat && stat.querySelector('.cv');
  return valueNode ? (valueNode.textContent || '').trim() : '';
}

function getPieceSummaryFromBars(bars) {
  var sumMap = {};
  (bars || []).forEach(function(bar) {
    (bar.pat || []).forEach(function(len) {
      var num = parseInt(len, 10) || 0;
      if (!num) return;
      sumMap[num] = (sumMap[num] || 0) + 1;
    });
  });
  return sumMap;
}

function getRemTagsFromHtml(remHtml) {
  if (!remHtml) return [];
  var wrap = document.createElement('div');
  wrap.innerHTML = remHtml;
  return Array.from(wrap.querySelectorAll('span')).map(function(el) {
    return (el.textContent || '').trim();
  }).filter(function(text) {
    return text && text !== 'なし';
  });
}

function collectCartCutSections(cart) {
  cart = cart || getCutCartItems();
  return cart.map(function(item, index) {
    var data = item.data || {};
    var bars = Array.isArray(data.bars) && data.bars.length
      ? data.bars.slice()
      : parseBarsFromDiagHtml(data.diagHtml || '', 0, data.endLoss || 150);
    var stockLengths = sortStockLengthsForDisplay(
      bars.map(function(bar) { return parseInt(bar.sl, 10) || 0; })
        .filter(Boolean)
        .filter(function(v, i, arr) { return arr.indexOf(v) === i; })
    );
    var barHtml = '';
    stockLengths.forEach(function(sl) {
      barHtml += buildPrintBarHtml(
        bars.filter(function(bar) { return (parseInt(bar.sl, 10) || 0) === sl; }),
        sl,
        data.endLoss || 150
      );
    });
    return {
      idx: index + 1,
      itemId: item.id,
      title: data.title || '',
      kind: data.kind || '',
      spec: data.spec || '',
      statsHtml: data.statsHtml || '',
      motherSummary: data.motherSummary || '',
      bars: bars,
      sumMap: getPieceSummaryFromBars(bars),
      remTags: getRemTagsFromHtml(data.remHtml),
      barHtml: barHtml
    };
  });
}

function buildCartCutPrintHtml(cart) {
  cart = cart || getCutCartItems();
  if (!cart.length) return '';
  var first = cart[0].data || {};
  return buildPrintPages(first.job || {}, collectCartCutSections(cart));
}

function buildProjectHistoryPayload(cart) {
  cart = cart || getCutCartItems();
  if (!cart.length) return null;
  var first = cart[0].data || {};
  var job = first.job || {};
  var sections = collectCartCutSections(cart);
  var kinds = [];
  var specs = [];
  sections.forEach(function(section) {
    if (section.kind && kinds.indexOf(section.kind) < 0) kinds.push(section.kind);
    if (section.spec && specs.indexOf(section.spec) < 0) specs.push(section.spec);
  });
  return {
    job: {
      client: job.client || '',
      name: job.name || '',
      deadline: job.deadline || '',
      worker: job.worker || ''
    },
    kind: kinds.join(' / '),
    spec: specs.join(' / '),
    sections: sections.map(function(section) {
      return {
        idx: section.idx,
        title: section.title || '',
        kind: section.kind || '',
        spec: section.spec || '',
        motherSummary: section.motherSummary || '',
        sumMap: Object.assign({}, section.sumMap),
        remTags: (section.remTags || []).slice(),
        bars: JSON.parse(JSON.stringify(section.bars || [])),
        statsHtml: section.statsHtml || ''
      };
    }),
    cartItemIds: cart.map(function(item) { return item.id; }),
    printHtml: buildPrintPages(job, sections)
  };
}

function saveProjectCutHistory(cart, outputType) {
  var payload = buildProjectHistoryPayload(cart);
  if (!payload) return null;
  var signature = JSON.stringify([
    payload.cartItemIds.slice().sort(),
    payload.kind,
    payload.spec
  ]);
  if (window._lastProjectHistorySignature === signature) return null;
  window._lastProjectHistorySignature = signature;
  var hist = getCutHistory();
  var entry = {
    id: Date.now(),
    type: 'cut_project',
    date: new Date().toISOString(),
    dateLabel: new Date().toLocaleDateString('ja-JP'),
    client: payload.job.client,
    name: payload.job.name,
    deadline: payload.job.deadline,
    worker: payload.job.worker,
    kind: payload.kind,
    spec: payload.spec,
    outputType: outputType || 'print',
    project: payload
  };
  hist.unshift(entry);
  if (typeof saveCutHistoryList === 'function') saveCutHistoryList(hist);
  if (typeof sbUpsert === 'function') sbUpsert('cut_history', hist);
  return entry;
}

function showCartCutPreview(html) {
  if (!html) {
    var cart = getCutCartItems();
    if (!cart.length) { alert('取り合いがカートにありません。'); return; }
    html = buildCartCutPrintHtml(cart);
  }
  if (!html) { alert('作業指示書プレビューを生成できませんでした。'); return; }
  var modal = document.getElementById('histPreviewModal');
  var body = document.getElementById('histPreviewBody');
  if (!modal || !body) return;
  body.innerHTML = html;
  closeCartModal();
  modal.style.display = 'flex';
}
