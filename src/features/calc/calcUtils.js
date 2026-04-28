function sortStockLengthsForDisplay(lengths) {
  return lengths.slice().sort(function(a, b) {
    var aRem = !isStdStockLength(a);
    var bRem = !isStdStockLength(b);
    if (aRem !== bRem) return aRem ? -1 : 1;
    return a - b;
  });
}

function parseBarsFromDiagHtml(diagHtml, fallbackSl, fallbackEndLoss) {
  if (!diagHtml) return [];
  var wrap = document.createElement('div');
  wrap.innerHTML = diagHtml;
  return Array.from(wrap.querySelectorAll('.bar-vis')).map(function(vis) {
    var labelText = ((vis.querySelector('.bar-vis-label strong') || {}).textContent || '').trim();
    var slMatch = labelText.match(/L=([\d,]+)mm|([\d,]+)mm/);
    var sl = fallbackSl || 0;
    if (slMatch) sl = parseInt((slMatch[1] || slMatch[2] || '0').replace(/,/g, ''), 10) || sl;
    var pieces = Array.from(vis.querySelectorAll('.b-piece')).map(function(piece) {
      return parseInt(String(piece.style.flex || '').replace(/[^\d]/g, ''), 10) || parseInt((piece.textContent || '').replace(/[^\d]/g, ''), 10) || 0;
    }).filter(Boolean);
    var remEl = vis.querySelector('.b-rem, .b-loss');
    var loss = remEl ? (parseInt(String(remEl.style.flex || '').replace(/[^\d]/g, ''), 10) || parseInt((remEl.textContent || '').replace(/[^\d]/g, ''), 10) || 0) : 0;
    if (!pieces.length && !loss) return null;
    return { pat: pieces, loss: loss, sl: sl, endLoss: fallbackEndLoss || 150 };
  }).filter(Boolean);
}


