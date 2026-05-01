// ヘッダーのハンバーガーメニュー開閉

function toggleHeaderMenu() {
  var btn = document.getElementById('hamBtn');
  var menu = document.getElementById('hamMenu');
  var overlay = document.getElementById('ddOverlay');
  if (!btn || !menu || !overlay) return;
  var open = !menu.classList.contains('show');
  btn.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  menu.classList.toggle('show', open);
  overlay.classList.toggle('show', open);
}

function closeHeaderMenu() {
  var btn = document.getElementById('hamBtn');
  var menu = document.getElementById('hamMenu');
  var overlay = document.getElementById('ddOverlay');
  if (btn) {
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }
  if (menu) menu.classList.remove('show');
  if (overlay) overlay.classList.remove('show');
}

function openUsageGuideExternal() {
  var url = 'https://note.com/tender_kiwi2595/n/n1555f0856d9d?app_launch=false';
  if (!confirm('外部サイト（note）に移動します。よろしいですか？')) return;
  closeHeaderMenu();
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openPerformanceArticleExternal() {
  var url = 'https://qiita.com/toriaiapp/items/6322f6c1326d22efc5e8';
  if (!confirm('外部サイト（Qiita）に移動します。よろしいですか？')) return;
  closeHeaderMenu();
  window.open(url, '_blank', 'noopener,noreferrer');
}
