(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.utils = ns.utils || {};

  function toSafeString(value) {
    return value == null ? '' : String(value);
  }

  function escapeHtml(value) {
    return toSafeString(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function setText(el, value) {
    if (!el) return;
    el.textContent = toSafeString(value);
  }

  ns.utils.html = {
    toSafeString: toSafeString,
    escapeHtml: escapeHtml,
    escapeAttribute: escapeAttribute,
    setText: setText
  };
})(window);
