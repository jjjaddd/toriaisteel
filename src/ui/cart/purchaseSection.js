(function(global) {
  'use strict';

  var ns = global.Toriai.ui.cart = global.Toriai.ui.cart || {};

  ns.getCartPurchaseSummary = function getCartPurchaseSummary(cart) {
    var grouped = {};
    (cart || []).forEach(function(item) {
      var data = item && item.data ? item.data : {};
      var spec = data.spec || '';
      (data.bars || []).forEach(function(bar) {
        var sl = parseInt(bar && bar.sl, 10) || 0;
        if (!sl || (typeof global.isStdStockLength === 'function' && !global.isStdStockLength(sl))) return;
        var key = spec + '::' + sl;
        if (!grouped[key]) grouped[key] = { spec: spec, sl: sl, qty: 0 };
        grouped[key].qty += 1;
      });
    });
    return Object.keys(grouped).map(function(key) { return grouped[key]; }).sort(function(a, b) {
      if (a.spec !== b.spec) return String(a.spec).localeCompare(String(b.spec), 'ja');
      return b.sl - a.sl;
    });
  };

  ns.buildPurchaseMailto = function buildPurchaseMailto(summary, cart) {
    if (!summary.length) return '';
    var first = cart && cart[0] && cart[0].data ? cart[0].data : {};
    var job = first.job || {};
    var lines = [
      'お世話になっております。',
      '',
      '下記鋼材の手配をお願いいたします。',
      '',
      '案件名: ' + (job.name || ''),
      '希望納期: ',
      '',
      '【発注明細】'
    ];
    summary.forEach(function(item) {
      lines.push('・' + (item.spec || '規格未設定') + ' / ' + Number(item.sl || 0).toLocaleString() + 'mm × ' + item.qty + '本');
    });
    lines.push('');
    lines.push('よろしくお願いいたします。');
    return 'mailto:?subject=' + encodeURIComponent('') + '&body=' + encodeURIComponent(lines.join('\n'));
  };

  ns.buildPurchaseGmailUrl = function buildPurchaseGmailUrl(summary, cart) {
    if (!summary.length) return '';
    var first = cart && cart[0] && cart[0].data ? cart[0].data : {};
    var job = first.job || {};
    var lines = [
      'お世話になっております。',
      '',
      '下記鋼材の手配をお願いいたします。',
      '',
      '案件名: ' + (job.name || ''),
      '希望納期: ',
      '',
      '【発注明細】'
    ];
    summary.forEach(function(item) {
      lines.push('・' + (item.spec || '規格未設定') + ' / ' + Number(item.sl || 0).toLocaleString() + 'mm × ' + item.qty + '本');
    });
    lines.push('');
    lines.push('よろしくお願いいたします。');
    var params = [
      'view=cm',
      'fs=1',
      'to=' + encodeURIComponent('konoshima@inoue-kouzai.co.jp'),
      'su=' + encodeURIComponent(''),
      'body=' + encodeURIComponent(lines.join('\n'))
    ];
    return 'https://mail.google.com/mail/?' + params.join('&');
  };

  ns.enhanceRenderCartModal = function enhanceRenderCartModal(baseRenderCartModal) {
    return function enhancedRenderCartModal() {
      var out = baseRenderCartModal ? baseRenderCartModal.apply(this, arguments) : undefined;
      var body = document.getElementById('cartModalBody');
      if (!body) return out;
      var cart = typeof global.getCart === 'function' ? global.getCart() : [];
      if (!cart.length) return out;
      var summary = ns.getCartPurchaseSummary(cart);
      var existing = document.getElementById('cartPurchaseSection');
      if (existing) existing.remove();
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
              '<button type="button" class="cart-purchase-mail" onclick="window.location.href=\'' + ns.buildPurchaseMailto(summary, cart).replace(/'/g, '%27') + '\'">既定のメールで開く</button>' +
              '<button type="button" class="cart-purchase-mail" onclick="window.open(\'' + ns.buildPurchaseGmailUrl(summary, cart).replace(/'/g, '%27') + '\', \'_blank\')">Gmailで開く</button>' +
            '</div>'
          : '<div class="cart-purchase-empty">今回発注が必要な定尺材はありません。</div>');
      body.appendChild(section);
      return out;
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
