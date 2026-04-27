/**
 * src/ui/header/navOrder.js
 * ヘッダーナビゲーションの並び順を矯正する。
 * - 取り合い → 重量 → データ → 履歴 → お問い合わせ の順
 * - カートバッジは .hdr-right 側へ移動して文言整形
 * - DOM 変更を MutationObserver で監視して再適用
 * 旧 final-overrides.js から移植。
 */
(function() {
  'use strict';

  var observer = null;
  var ordering = false;

  function applyOrder() {
    if (ordering) return;
    var nav = document.querySelector('header nav');
    var right = document.querySelector('header .hdr-right');
    if (!nav) return;
    ordering = true;
    if (observer) observer.disconnect();
    var cartBadge = document.getElementById('cartBadge');
    var calc = document.getElementById('na');
    var hist = document.getElementById('nhist') || document.getElementById('nhi');
    var weight = document.getElementById('nw');
    var data = document.getElementById('nd');
    var inv = document.getElementById('ninv');
    var contact = document.getElementById('nco') || document.getElementById('nc') || document.getElementById('ncontact');
    [calc, weight, data, inv, hist, contact].forEach(function(node) {
      if (node && node.parentNode === nav) nav.appendChild(node);
    });
    if (cartBadge && right && cartBadge.parentNode !== right) {
      right.insertBefore(cartBadge, right.firstChild || null);
    }
    if (cartBadge) {
      var digits = String(cartBadge.textContent || '').replace(/[^\d]/g, '');
      cartBadge.textContent = 'カート ' + (digits || '0') + '件';
      cartBadge.classList.add('header-cart-btn');
    }
    if (contact) {
      contact.classList.add('header-contact-link');
    }
    if (observer) observer.observe(nav, { childList: true, subtree: false });
    ordering = false;
  }

  function bindObserver() {
    var nav = document.querySelector('header nav');
    if (!nav || observer) return;
    observer = new MutationObserver(function() {
      applyOrder();
    });
    observer.observe(nav, { childList: true, subtree: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyOrder, { once: true });
    document.addEventListener('DOMContentLoaded', bindObserver, { once: true });
  } else {
    applyOrder();
    bindObserver();
  }

  window.addEventListener('load', applyOrder);
  window.addEventListener('load', bindObserver);
  setTimeout(applyOrder, 0);
  setTimeout(applyOrder, 200);
  setTimeout(applyOrder, 800);
})();
