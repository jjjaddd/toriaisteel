function showToast(msg) {
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--br);color:var(--bk);font-family:"Space Grotesk",sans-serif;font-size:11px;font-weight:700;letter-spacing:.05em;padding:8px 18px;z-index:9999;animation:fi .2s ease';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, 2500);
}
