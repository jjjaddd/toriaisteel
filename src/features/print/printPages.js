function buildPrintSection(secIdx, secData) {
  var html = '<div class="sec">';

  // セクションヘッダー
  html += '<div class="sec-hd">';
  html += '<span class="badge">' + secIdx + '</span>';
  if (secData.spec) html += '<span style="font-size:11px;font-weight:700">' + secData.spec + '</span>';
  if (secData.motherSummary) html += '<span style="font-size:10px;margin-left:4px;color:#333">' + secData.motherSummary + '</span>';
  html += '</div>';

  html += '<div class="sec-body">';

  // 左：切断リスト
  html += '<div class="sec-left">';
  html += '<div style="font-size:8px;font-weight:700;letter-spacing:.05em;margin-bottom:3px">切断リスト</div>';
  var sortedLens = sortStockLengthsForDisplay(Object.keys(secData.sumMap).map(Number));
  if (sortedLens.length) {
    html += '<table class="cut-tbl"><tbody>';
    sortedLens.forEach(function(len) {
      html += '<tr><td>' + len.toLocaleString() + ' mm</td><td class="num">' + secData.sumMap[len] + '</td></tr>';
    });
    html += '</tbody></table>';
  }
  // 端材
  html += '<div style="margin-top:5px;padding-top:4px;border-top:1px solid #ddd">';
  html += '<div style="font-size:8px;color:#666;margin-bottom:2px">端材（500mm以上）</div>';
  if (secData.remTags && secData.remTags.length) {
    secData.remTags.forEach(function(t){ html += '<span class="r-tag">' + t + '</span>'; });
  } else {
    html += '<span style="font-size:9px;color:#aaa">なし</span>';
  }
  html += '</div>';
  html += '</div>'; // sec-left

  // 右：切断図
  html += '<div class="sec-right">';
  html += '<div style="font-size:8px;font-weight:700;margin-bottom:4px">&#9986; 切断図</div>';
  if (secData.bars && secData.bars.length) {
    html += buildPrintBarHtml(secData.bars, secData.sl, secData.endLoss || 150);
  } else if (secData.barHtml) {
    html += secData.barHtml;
  } else {
    html += '<div style="font-size:9px;color:#aaa">切断図を展開してからカートに追加してください</div>';
  }
  html += '</div>'; // sec-right
  html += '</div>'; // sec-body
  html += '</div>'; // sec
  return html;
}

/** 複数セクションを4件ごとにページ分割してHTML生成 */
function buildPrintPages(job, sections) {
  var SECS_PER_PAGE = 4;
  var totalPages = Math.ceil(sections.length / SECS_PER_PAGE);
  var html = '';

  for (var p = 0; p < totalPages; p++) {
    var pageNum = p + 1;
    var pageInfo = pageNum + ' / ' + totalPages;
    var secSlice = sections.slice(p * SECS_PER_PAGE, (p+1) * SECS_PER_PAGE);
    var isLast = (pageNum === totalPages);

    // ヘッダー
    if (p === 0) {
      html += buildPrintHeaderFull(job, pageInfo);
    } else {
      html += buildPrintHeaderMini(job, pageInfo);
    }

    // セクション
    secSlice.forEach(function(sec) {
      html += sec.customHtml || buildPrintSection(sec.idx, sec);
    });

    // フッター
    html += '<div class="print-footer">';
    html += '<span>全 ' + sections.length + ' 鋼材　' + (isLast ? '以上' : '/ ' + pageNum + '枚目') + '</span>';
    html += '<span></span>';
    html += '</div>';

    if (!isLast) html += '<div style="page-break-after:always"></div>';
  }
  return html;
}

/** 印刷ウィンドウを開いて印刷 */
function openOutputWindow(html, opts) {
  opts = opts || {};
  var title = opts.title || '作業指示書';
  var win = window.open('', '_blank', 'width=1050,height=750');
  if (!win) return null;
  win.document.write(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + title + '</title>' +
    '<style>' + PRINT_CSS + '</style></head>' +
    '<body>' + html + '</body></html>'
  );
  win.document.close();
  win.focus();
  if (opts.print) {
    if (opts.closeAfterPrint) {
      win.onafterprint = function() {
        try { win.close(); } catch (e) {}
      };
    }
    setTimeout(function(){ win.print(); }, 700);
  }
  return win;
}

function openPrintWindow(html) {
  openOutputWindow(html, { title: '作業指示書', print: true, closeAfterPrint: true });
}
