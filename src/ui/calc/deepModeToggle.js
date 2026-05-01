/**
 * src/ui/calc/deepModeToggle.js
 * Phase 2-2: 長考モードトグル
 *
 * - localStorage に状態保存（次回も覚えてる）
 * - グローバル window.__toriaiDeepMode を露出
 * - orchestration.js の baseMsg.calcMode に反映される
 */
(function(global) {
  'use strict';
  var STORAGE_KEY = 'toriai_deep_mode';

  function readStored() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (_e) { return false; }
  }

  function saveStored(on) {
    try {
      localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    } catch (_e) {}
  }

  function getCurrentMode() {
    var cb = document.getElementById('deepModeToggle');
    if (cb) return cb.checked ? 'deep' : 'normal';
    return readStored() ? 'deep' : 'normal';
  }

  function init() {
    var cb = document.getElementById('deepModeToggle');
    if (!cb) return;
    cb.checked = readStored();
    global.__toriaiDeepMode = cb.checked;
    cb.addEventListener('change', function() {
      saveStored(cb.checked);
      global.__toriaiDeepMode = cb.checked;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 公開 API
  global.toriaiGetCalcMode = getCurrentMode;
})(typeof window !== 'undefined' ? window : globalThis);
