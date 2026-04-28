function formatCalcToolbarField(value) {
  var text = String(value == null ? '' : value).trim();
  return text || '記載なし';
}

function syncCalcToolbarField(key, value) {
  var map = {
    customer: 'jobClient',
    projectName: 'jobName',
    deadline: 'jobDeadline',
    memo: 'jobWorker'
  };
  var targetId = map[key];
  if (!targetId) return;
  var el = document.getElementById(targetId);
  if (el) el.value = value || '';
  if (typeof saveSettings === 'function') saveSettings();
}

function buildCalcToolbarInput(label, key, value, type) {
  var htmlUtils = window.Toriai && window.Toriai.utils && window.Toriai.utils.html;
  var safeValue = htmlUtils && typeof htmlUtils.escapeAttribute === 'function'
    ? htmlUtils.escapeAttribute(value || '')
    : escapeHtml(value || '');
  var safeLabel = escapeHtml(label);
  var inputType = type || 'text';
  var placeholder = safeLabel === '納期' ? '' : '記載なし';
  return '<label class="calc-result-edit">' +
    '<span class="calc-result-cell-label">' + safeLabel + '</span>' +
    '<input class="calc-result-input" type="' + inputType + '" value="' + safeValue + '"' +
      (placeholder ? ' placeholder="' + placeholder + '"' : '') +
      ' oninput="syncCalcToolbarField(\'' + key + '\', this.value)">' +
  '</label>';
}

function buildCalcProjectToolbar(summary) {
  summary = summary || {};
  return '<div class="calc-result-toolbar">' +
    '<div class="calc-result-toolbar-main">' +
      '<div class="calc-result-cell">' +
        '<div class="calc-result-title">作業情報</div>' +
      '</div>' +
      buildCalcToolbarInput('顧客情報', 'customer', summary.customer, 'text') +
      buildCalcToolbarInput('工事名', 'projectName', summary.projectName, 'text') +
      buildCalcToolbarInput('納期', 'deadline', summary.deadline, 'date') +
      buildCalcToolbarInput('メモ', 'memo', summary.memo, 'text') +
    '</div>' +
    '<button id="calcCartBadge" class="cart-badge calc-toolbar-cart empty" data-cart-scope="cut" onclick="openCartModal()">カート 0件</button>' +
  '</div>';
}


function buildCardActionButtons(cardId, includeAdd) {
  var html = '';
  if (includeAdd) {
    html += '<button class="cc-btn-add" id="add_' + cardId + '" onclick="cartAdd(\'' + cardId + '\',this)">＋</button>';
  }
  html += '<button class="cc-btn-mini" type="button" onclick="printCard(\'' + cardId + '\')" aria-label="印刷">🖨</button>';
  return html;
}
