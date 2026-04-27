/**
 * src/ui/cart/chromeCleanup.js
 * カートモーダルのタイトル・アイコン・ボタン文言を整える。
 * 旧 final-overrides.js から移植。inventory/page.js から global 名で呼ばれる。
 */
(function(global) {
  'use strict';

  function cleanCartChrome() {
    var cartTitle = document.querySelector('#cartModal .cart-modal-hd span[style*="font-size:15px"]');
    if (cartTitle) cartTitle.textContent = '出力カート';
    var cartIcon = document.querySelector('#cartModal .cart-modal-hd span[style*="font-size:16px"]');
    if (cartIcon) cartIcon.remove();

    var closeBtn = document.querySelector('#cartModal button[onclick="closeCartModal()"]');
    if (closeBtn) closeBtn.textContent = '閉じる';

    var clearBtn = document.querySelector('#cartModal button[onclick="cartClearAll()"]');
    if (clearBtn) clearBtn.textContent = '全クリア';
  }

  global.cleanCartChrome = cleanCartChrome;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
