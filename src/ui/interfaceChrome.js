function normalizeInterfaceChrome() {
  document.title = 'TORIAIー鋼材取り合い計算ツールー';
  var head = document.querySelector('.remnant-head');
  if (head) {
    var addBtn = head.querySelector('.rem-add-btn');
    if (addBtn) addBtn.remove();
  }

  var labelMap = [
    ['#histModal div[style*="font-size:14px;font-weight:700"]', '入力履歴'],
    ['#cartModal .cart-modal-hd span[style*="font-size:15px"]', '印刷カート'],
    ['#histPreviewModal div[style*="font-size:14px;font-weight:700;color:#1a1a2e"]', '作業指示書プレビュー']
  ];
  labelMap.forEach(function(entry) {
    var el = document.querySelector(entry[0]);
    if (el) el.textContent = entry[1];
  });

  var remHead = document.querySelector('.remnant-head span');
  if (remHead) remHead.textContent = '計算に使う残材';
  var invBtn = document.getElementById('invUseBtn');
  if (invBtn) invBtn.textContent = '追加';
  var invSelect = document.getElementById('invSelect');
  if (invSelect && invSelect.options.length) {
    invSelect.options[0].textContent = '在庫から使いたい残材を選択';
  }

  ['#cartModal button[onclick="cartPrintCutting()"]', '#histPreviewModal button[onclick="printHistoryPreview()"]'].forEach(function(sel) {
    var el = document.querySelector(sel);
    if (el) {
      el.textContent = sel.indexOf('#cartModal') === 0 ? '切断指示書を印刷' : '印刷';
      if (sel.indexOf('#histPreviewModal') === 0) el.classList.add('preview-action-btn');
    }
  });
  ['#cartModal button[onclick="closeCartModal()"]', '#histPreviewModal button[onclick*="histPreviewModal"]', '#histModal button[onclick*="histModal"]'].forEach(function(sel) {
    var el = document.querySelector(sel);
    if (el) el.textContent = '閉じる';
  });
  var clearBtn = document.querySelector('#cartModal button[onclick="cartClearAll()"]');
  if (clearBtn) {
    clearBtn.textContent = '全クリア';
    clearBtn.classList.add('cart-danger-btn');
  }
  var cartCloseBtn = document.querySelector('#cartModal button[onclick="closeCartModal()"]');
  if (cartCloseBtn) cartCloseBtn.classList.add('cart-danger-btn');
  var previewModal = document.getElementById('histPreviewModal');
  if (previewModal && !previewModal.dataset.outsideCloseBound) {
    previewModal.dataset.outsideCloseBound = '1';
    previewModal.addEventListener('click', function(e) {
      if (e.target === previewModal) previewModal.style.display = 'none';
    });
  }
}
