function createManualRemnantRow(seed) {
  var list = document.getElementById('remnantList');
  if (!list) return null;
  var data = seed || {};
  var i = remnantCount++;
  var row = document.createElement('div');
  row.className = 'rem-row';
  row.id = 'remRow' + i;
  row.dataset.source = 'manual';

  var lenInput = document.createElement('input');
  lenInput.type = 'number';
  lenInput.className = 'rem-len';
  lenInput.id = 'remLen' + i;
  lenInput.min = '1';
  lenInput.placeholder = '長さ(mm)';
  lenInput.value = data.len || '';
  lenInput.addEventListener('change', saveRemnants);

  var qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.className = 'rem-qty';
  qtyInput.id = 'remQty' + i;
  qtyInput.min = '1';
  qtyInput.value = data.qty || 1;
  qtyInput.addEventListener('change', saveRemnants);

  var memoInput = document.createElement('input');
  memoInput.type = 'text';
  memoInput.className = 'rem-memo';
  memoInput.id = 'remMemo' + i;
  memoInput.placeholder = 'メモ';
  memoInput.value = data.memo || '';
  memoInput.addEventListener('input', saveRemnants);

  var addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'rem-add-inline';
  addBtn.textContent = '＋';
  addBtn.addEventListener('click', function() {
    addRemnant();
  });

  var delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'rem-del';
  delBtn.textContent = '×';
  delBtn.addEventListener('click', function() {
    removeRemnant(i);
  });

  row.appendChild(lenInput);
  row.appendChild(qtyInput);
  row.appendChild(memoInput);
  row.appendChild(addBtn);
  row.appendChild(delBtn);
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


