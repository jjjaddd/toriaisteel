function createManualRemnantRow(seed) {
  var list = document.getElementById('remnantList');
  if (!list) return null;
  var data = seed || {};
  var i = remnantCount++;
  var row = document.createElement('div');
  row.className = 'rem-row';
  row.id = 'remRow' + i;
  row.dataset.source = 'manual';
  row.innerHTML =
    '<input type="number" class="rem-len" id="remLen' + i + '" min="1" placeholder="長さ(mm)" value="' + (data.len || '') + '" onchange="saveRemnants()">' +
    '<input type="number" class="rem-qty" id="remQty' + i + '" min="1" value="' + (data.qty || 1) + '" onchange="saveRemnants()">' +
    '<input type="text" class="rem-memo" id="remMemo' + i + '" placeholder="メモ" value="' + escapeHtml(data.memo || '') + '" oninput="saveRemnants()">' +
    '<button type="button" class="rem-add-inline" onclick="addRemnant()">＋</button>' +
    '<button type="button" class="rem-del" onclick="removeRemnant(' + i + ')">×</button>';
  list.appendChild(row);
  return row;
}

function addRemnant(seed) {
  var row = createManualRemnantRow(seed);
  if (row) {
    saveRemnants();
    var lenEl = row.querySelector('.rem-len');
    if (lenEl) lenEl.focus();
  }
}



