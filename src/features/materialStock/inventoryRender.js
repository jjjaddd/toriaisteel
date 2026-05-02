function getInventoryForCurrentSpec() {
  var spec = document.getElementById('spec') ? document.getElementById('spec').value : '';
  var inv = getInventory().filter(function(item) {
    return item.kind === curKind && item.spec === spec;
  });
  var grouped = {};
  inv.forEach(function(item) {
    var key = [item.len, item.spec, item.kind, item.company || '', item.note || '', item.addedDate || ''].join('|');
    if (!grouped[key]) {
      grouped[key] = { len: item.len, spec: item.spec, kind: item.kind, qty: 0, date: item.addedDate || '', label: item.note || '', company: item.company || '', ids: [] };
    }
    grouped[key].qty += 1;
    grouped[key].ids.push(item.id);
  });
  return Object.values(grouped).sort(function(a, b) {
    return b.len - a.len || parseDateValue(b.date) - parseDateValue(a.date);
  });
}

function renderInventoryPage() {
  var cont = document.getElementById('invListCont');
  var empty = document.getElementById('invEmptyMsg');
  if (!cont) return;

  var kindF = ((document.getElementById('invFilterKind') || {}).value || '');
  var specF = ((document.getElementById('invFilterSpec') || {}).value || '');
  var keyword = (((document.getElementById('invKeyword') || {}).value) || '').toLowerCase();
  var dateFrom = ((document.getElementById('invDateFrom') || {}).value || '');
  var sort = ((document.getElementById('invSort') || {}).value || 'date_desc');
  var inv = getInventory().slice();
  updateInventorySummary(inv);

  if (kindF) inv = inv.filter(function(item) { return item.kind === kindF; });
  if (specF) inv = inv.filter(function(item) { return item.spec === specF; });
  if (keyword) inv = inv.filter(function(item) {
    return [item.spec, item.kind, item.company, item.note, item.len].join(' ').toLowerCase().indexOf(keyword) >= 0;
  });
  if (dateFrom) inv = inv.filter(function(item) { return parseDateValue(item.addedDate) >= parseDateValue(dateFrom); });

  inv.sort(function(a, b) {
    if (sort === 'len_asc') return (a.len || 0) - (b.len || 0);
    if (sort === 'spec_asc') return String(a.spec || '').localeCompare(String(b.spec || ''), 'ja');
    return parseDateValue(b.addedDate) - parseDateValue(a.addedDate);
  });

  if (!inv.length) {
    cont.innerHTML = '';
    if (empty) empty.style.display = 'block';
    var emptyCount = document.getElementById('invCountLabel');
    if (emptyCount) emptyCount.textContent = '0件';
    renderPager('invPagination', 1, 1, 'setInventoryPage');
    return;
  }
  if (empty) empty.style.display = 'none';

  // 規格×長さでグループ化
  var grouped = {};
  inv.forEach(function(item) {
    var key = [item.spec || '', item.len || 0].join('::');
    if (!grouped[key]) grouped[key] = { spec: item.spec || '', len: item.len || 0, items: [] };
    grouped[key].items.push(item);
  });

  var rows = Object.keys(grouped).map(function(key) {
    var group = grouped[key];
    var companies = group.items.map(function(item) { return item.company || ''; }).filter(Boolean);
    var notes = group.items.map(function(item) { return item.note || ''; }).filter(Boolean);
    var dates = group.items.map(function(item) { return item.addedDate || ''; }).filter(Boolean).sort(function(a, b) {
      return parseDateValue(b) - parseDateValue(a);
    });
    return {
      spec: group.spec,
      len: group.len,
      qty: group.items.length,
      ids: group.items.map(function(item) { return item.id; }),
      company: !companies.length ? '-' : (Array.from(new Set(companies)).length === 1 ? companies[0] : '複数'),
      note: !notes.length ? '-' : (Array.from(new Set(notes)).length === 1 ? notes[0] : '複数'),
      addedDate: dates[0] || ''
    };
  });

  var pageData = paginateItems(rows, inventoryPage, INVENTORY_PAGE_SIZE);
  inventoryPage = pageData.page;
  var specGroups = {};
  pageData.items.forEach(function(item) {
    if (!specGroups[item.spec]) specGroups[item.spec] = [];
    specGroups[item.spec].push(item);
  });

  var invCountLabel = document.getElementById('invCountLabel');
  if (invCountLabel) invCountLabel.textContent = rows.length.toLocaleString() + '件';
  cont.innerHTML = Object.keys(specGroups).sort().map(function(spec) {
    return specGroups[spec].map(function(item) {
      return '<div class="inv-card-new">' +
        '<div class="inv-len">' + Number(item.len || 0).toLocaleString() + '<span> mm</span></div>' +
        '<div class="inv-detail">' +
          '<div class="inv-spec-label">' + escapeHtml(spec) + '</div>' +
          '<div class="inv-meta">' + escapeHtml(item.company || '会社名なし') + ' / ' + escapeHtml(item.note || 'メモなし') + ' / ' + escapeHtml(item.addedDate || '') + '</div>' +
        '</div>' +
        '<span class="inv-qty-badge">' + item.qty + '本</span>' +
        '<button type="button" class="inv-del-btn" data-group-key="' + item.ids.join(',') + '">削除</button>' +
      '</div>';
    }).join('');
  }).join('');

  if (window.Toriai && window.Toriai.ui && window.Toriai.ui.inventory && typeof window.Toriai.ui.inventory.bindInventoryListActions === 'function') {
    window.Toriai.ui.inventory.bindInventoryListActions();
  }
  renderPager('invPagination', inventoryPage, pageData.totalPages, 'setInventoryPage');
}

function updateInventorySummary(inv) {
  var items = Array.isArray(inv) ? inv : [];
  var invSummaryCount = document.getElementById('invSummaryCount');
  var invSummaryWeight = document.getElementById('invSummaryWeight');
  if (!invSummaryCount && !invSummaryWeight) return;
  var totalQty = items.reduce(function(sum, item) {
    return sum + Math.max(1, parseInt(item && item.qty, 10) || 1);
  }, 0);
  var totalWeight = items.reduce(function(sum, item) {
    var qty = Math.max(1, parseInt(item && item.qty, 10) || 1);
    var len = parseInt(item && item.len, 10) || 0;
    var kgm = typeof getWeightKgmForSpec === 'function' ? getWeightKgmForSpec(item && item.kind, item && item.spec) : 0;
    return sum + ((len / 1000) * kgm * qty);
  }, 0);
  if (invSummaryCount) invSummaryCount.textContent = totalQty.toLocaleString() + '本';
  if (invSummaryWeight) invSummaryWeight.textContent = (Math.round(totalWeight * 10) / 10).toLocaleString() + ' kg';
}
