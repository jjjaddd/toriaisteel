/** カートモーダルを開く */
function openCartModal() {
  renderCartModal();
  document.getElementById('cartModal').style.display = 'block';
}

/** カートモーダルを閉じる */
function closeCartModal() {
  document.getElementById('cartModal').style.display = 'none';
}

/** カートモーダルの中身を描画 */
function renderCartModal() {
  var cart = getCart();
  var body = document.getElementById('cartModalBody');
  var cutList = document.getElementById('cartCutList');
  var cutSection = document.getElementById('cartSectionCut');
  if (!body || !cutList) return;

  // 件数バッジ
  var countEl = document.getElementById('cartModalCount');
  if (countEl) countEl.textContent = cart.length ? cart.length + '件' : '';

  // 既存の材料手配セクションは毎回作り直す
  var existingPurchase = document.getElementById('cartPurchaseSection');
  if (existingPurchase) existingPurchase.remove();

  if (!cart.length) {
    cutList.innerHTML = '<div style="padding:32px;text-align:center;color:#aaa;font-size:13px">' +
      'カートは空です。各カードの「＋」を押してください。</div>';
    if (cutSection) cutSection.classList.add('cart-section--empty');
    return;
  }
  if (cutSection) cutSection.classList.remove('cart-section--empty');

  // カート項目リスト
  cutList.innerHTML = cart.map(function(item) {
    var d = item.data;
    return '<div class="cart-item">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:2px">' +
          (d.isYield ? '歩留まり最大' : '取り合いパターン') +
          ' — ' + d.title +
        '</div>' +
        '<div style="font-size:11px;color:#8888a8">' +
          d.spec + '　' + (d.job.client || '') + '　' + (d.job.name || '') +
        '</div>' +
      '</div>' +
      '<button class="cart-item-del" onclick="cartRemoveItem(\'' + item.id + '\')">✕ 削除</button>' +
    '</div>';
  }).join('');

  // 材料手配セクション（cartSectionCut の後ろに追加）
  var summary = typeof getCartPurchaseSummary === 'function' ? getCartPurchaseSummary(cart) : [];
  var section = document.createElement('div');
  section.id = 'cartPurchaseSection';
  section.className = 'cart-purchase-section';
  section.innerHTML =
    '<div class="cart-purchase-title">材料手配</div>' +
    (summary.length
      ? '<div class="cart-purchase-list">' + summary.map(function(item) {
          return '<div class="cart-purchase-row"><span class="cart-purchase-spec">' + escapeHtml(item.spec || '規格未設定') + '</span><span class="cart-purchase-stock">' + Number(item.sl || 0).toLocaleString() + 'mm × ' + item.qty + '本</span></div>';
        }).join('') + '</div>' +
        '<div class="cart-purchase-actions">' +
          '<button type="button" class="cart-purchase-mail" onclick="window.location.href=\'' + buildPurchaseMailto(summary, cart).replace(/'/g, '%27') + '\'">既定のメールで開く</button>' +
          '<button type="button" class="cart-purchase-mail" onclick="window.open(\'' + buildPurchaseGmailUrl(summary, cart).replace(/'/g, '%27') + '\', \'_blank\')">Gmailで開く</button>' +
        '</div>'
      : '<div class="cart-purchase-empty">今回発注が必要な定尺材はありません。</div>');
  body.appendChild(section);
}

/** カートからアイテムを削除 */
function cartRemoveItem(id) {
  removeFromCart(id);
  updateCartBadge();
  renderCartModal();
  // 対応するボタンを元に戻す
  var cart_item = getCart(); // 削除後
  // 対応するaddボタンを探してリセット
  document.querySelectorAll('.cc-btn-add.added').forEach(function(btn) {
    var cardId = btn.id.replace('add_', '');
    var stillInCart = getCart().some(function(x){ return x.data.cardId === cardId; });
    if (!stillInCart) {
      btn.textContent = '＋';
      btn.classList.remove('added');
      btn.disabled = false;
    }
  });
}

/** カートを全クリア */
function cartClearAll() {
  if (!confirm('カートを全クリアしますか？')) return;
  clearCart();
  updateCartBadge();
  renderCartModal();
  // 全addボタンをリセット
  document.querySelectorAll('.cc-btn-add.added').forEach(function(btn) {
    btn.textContent = '＋';
    btn.classList.remove('added');
    btn.disabled = false;
  });
  closeCartModal();
}
function updateCartBadge() {
  var cart = getCart();
  var cutN = cart.filter(function(x) { return !x.data.isWeight; }).length;
  var badges = [
    document.getElementById('cartBadge'),
    document.getElementById('calcCartBadge')
  ].filter(Boolean);
  badges.forEach(function(badge) {
    var count = cutN;
    badge.textContent = 'カート ' + count + '件';
    badge.classList.toggle('empty', count === 0);
  });
  document.body.classList.toggle('has-calc-cart', cutN > 0 && !!document.getElementById('calcCartBadge'));
}
