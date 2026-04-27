// 汎用 UI ヘルパー（ページネーション、長さ判定、DOM 生成）
function paginateItems(items, page, size) {
  var total = items.length;
  var totalPages = Math.max(1, Math.ceil(total / size));
  var p = Math.min(Math.max(1, page || 1), totalPages);
  var start = (p - 1) * size;
  return { items: items.slice(start, start + size), page: p, totalPages: totalPages, total: total };
}

// 切断図の色分け用：長さ区分（small / medium / high）
function lc(v) { return v < 200 ? 'll' : v < 800 ? 'lm' : 'lh'; }

// DOM 要素生成ヘルパー
function mk(tag, cls) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}
