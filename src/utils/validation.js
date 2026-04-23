(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.utils = ns.utils || {};

  function clampNumber(value, min, max, fallback) {
    var num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    if (typeof min === 'number' && num < min) return min;
    if (typeof max === 'number' && num > max) return max;
    return num;
  }

  function parsePositiveInteger(value, fallback) {
    var num = Number(value);
    if (!Number.isInteger(num) || num <= 0) return fallback;
    return num;
  }

  function sanitizeFreeText(value, maxLength) {
    var text = value == null ? '' : String(value).trim();
    if (typeof maxLength === 'number' && maxLength > 0) {
      text = text.slice(0, maxLength);
    }
    return text;
  }

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function normalizeLengthMm(value, fallback) {
    var normalized = clampNumber(value, 0, 1000000, fallback);
    return Number.isFinite(normalized) ? Math.round(normalized) : fallback;
  }

  ns.utils.validation = {
    clampNumber: clampNumber,
    parsePositiveInteger: parsePositiveInteger,
    sanitizeFreeText: sanitizeFreeText,
    isNonEmptyString: isNonEmptyString,
    normalizeLengthMm: normalizeLengthMm
  };
})(window);
