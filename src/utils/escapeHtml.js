// HTML エスケープ（旧来のグローバル名 `_escHtml` / `escapeHtml` を提供）
// namespace 版は `src/utils/html.js` の `Toriai.utils.html.escapeHtml`
function _escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeHtml(value) { return _escHtml(value); }
