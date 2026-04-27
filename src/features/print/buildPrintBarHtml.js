function buildPrintBarHtml(bars, sl, endLoss) {
  if (!bars || !bars.length) return '';
  var groupsByStock = {};
  bars.forEach(function(bar) {
    var slKey = bar && bar.sl ? bar.sl : sl;
    if (!groupsByStock[slKey]) groupsByStock[slKey] = [];
    groupsByStock[slKey].push(bar);
  });
  var slKeys = sortStockLengthsForDisplay(Object.keys(groupsByStock).map(Number));
  var html = '';
  slKeys.forEach(function(slKey) {
    var grouped = {};
    groupsByStock[slKey].forEach(function(bar) {
      var key = JSON.stringify((bar.pat || []).slice()) + '|' + (bar.loss || 0);
      if (!grouped[key]) grouped[key] = { bar: bar, cnt: 0 };
      grouped[key].cnt++;
    });
    var sourceLabel = buildCutSourceLabel(slKey);
    var isRemnant = !isStdStockLength(slKey);
    Object.keys(grouped).forEach(function(key) {
      var g = grouped[key];
      var bar = g.bar;
      var endHalf = (endLoss || 150) / 2;
      html += '<div class="bar-group">';
      html += '<div class="bar-head"><span style="font-weight:700;font-size:10px">' + sourceLabel + '</span><span class="cnt-badge">× ' + g.cnt + 'セット</span>' + (isRemnant ? '<span class="source-chip">残材より</span>' : '') + '</div>';
      html += '<div class="bar-pat">= ' + formatPatternSummary(bar.pat) + (bar.loss > 0 ? ' / 端材 ' + Number(bar.loss).toLocaleString() + 'mm' : '') + '</div>';
      html += '<div class="bar-track">';
      html += '<div class="b-end" style="flex:' + endHalf + '"></div>';
      buildDisplaySegments(bar.pat || []).forEach(function(segment, idx) {
        if (idx > 0) html += '<div class="b-blade"></div>';
        html += '<div class="b-piece" style="flex:' + segment.total + '"><span>' + segment.label + '</span></div>';
      });
      if (bar.loss > 0) {
        html += '<div class="b-blade"></div>';
        html += '<div class="' + (bar.loss >= 500 ? 'b-rem' : 'b-loss') + '" style="flex:' + bar.loss + '">' + Number(bar.loss).toLocaleString() + '</div>';
      }
      html += '<div class="b-end" style="flex:' + endHalf + '"></div>';
      html += '</div></div>';
    });
  });
  return html;
}
