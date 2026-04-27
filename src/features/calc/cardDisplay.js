function toggleCardDetail(id, btn) {
  var el = document.getElementById(id);
  if (!el) return;
  var open = el.classList.contains('open');
  el.classList.toggle('open', !open);
  btn.textContent = open ? '詳細を表示 ▼' : '詳細を閉じる ▲';
  btn.classList.toggle('open', !open);
}

function formatPatternSummary(pattern) {
  var order = [];
  var counts = {};
  (pattern || []).forEach(function(len) {
    var n = parseInt(len, 10);
    if (!n) return;
    if (!counts[n]) order.push(n);
    counts[n] = (counts[n] || 0) + 1;
  });
  return order.map(function(len) {
    return len.toLocaleString() + 'mm x ' + counts[len] + '本';
  }).join(' + ');
}

function buildDisplaySegments(pattern) {
  var segments = [];
  (pattern || []).forEach(function(len) {
    var n = parseInt(len, 10);
    if (!n) return;
    var last = segments[segments.length - 1];
    if (last && last.len === n) {
      last.count++;
      last.total += n;
    } else {
      segments.push({ len: n, count: 1, total: n });
    }
  });
  return segments.reduce(function(list, segment) {
    if (segment.count >= 5) {
      list.push({
        len: segment.len,
        count: segment.count,
        total: segment.total,
        label: segment.len.toLocaleString() + 'mm × ' + segment.count + '本'
      });
    } else {
      for (var i = 0; i < segment.count; i++) {
        list.push({ len: segment.len, count: 1, total: segment.len, label: segment.len.toLocaleString() + 'mm' });
      }
    }
    return list;
  }, []);
}

function buildCutDiagram(bars, slLen, label) {
  var grouped = groupBars(bars);
  if (!grouped.length) return '';
  grouped.sort(function(a, b) { return (b.cnt || 0) - (a.cnt || 0); });
  var html = '<div class="cut-diagram">';
  grouped.forEach(function(g) {
    var sourceLabel = buildCutSourceLabel(slLen);
    var isRemnant = !isStdStockLength(slLen);
    html += '<div class="bar-vis' + (isRemnant ? ' remnant-source' : '') + '">';
    html += '<div class="bar-vis-label"><strong>' + sourceLabel + '</strong><span class="bar-count">× ' + g.cnt + 'セット</span>' + (isRemnant ? '<span class="source-chip">残材より</span>' : '') + '</div>';
    html += '<div class="bar-track">';
    var endHalf = (parseInt((document.getElementById('endloss') || {}).value, 10) || 150) / 2;
    html += '<div class="b-end" style="flex:' + endHalf + '"></div>';
    buildDisplaySegments(g.pat || []).forEach(function(segment, idx) {
      if (idx > 0) html += '<div class="bar-cutline" aria-hidden="true"></div>';
      html += '<div class="b-piece" style="flex:' + segment.total + '"><span>' + segment.label + '</span></div>';
    });
    if (g.loss > 0) html += '<div class="' + (g.loss >= 500 ? 'b-rem' : 'b-loss') + '" style="flex:' + g.loss + '">' + Number(g.loss).toLocaleString() + '</div>';
    html += '<div class="b-end" style="flex:' + endHalf + '"></div>';
    html += '</div>';
    html += '<div class="bar-pat">= ' + formatPatternSummary(g.pat) + (g.loss > 0 ? ' / 端材 ' + Number(g.loss).toLocaleString() + 'mm' : '') + '</div>';
    html += '</div>';
  });
  return html + '</div>';
}
