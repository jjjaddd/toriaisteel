(function(global) {
  'use strict';

  var ns = global.Toriai.ui.calc = global.Toriai.ui.calc || {};

  function bindSpecPanelBehavior() {
    var panel = document.getElementById('specPanel');
    var selected = document.getElementById('specSelected');
    var list = document.getElementById('specList');
    if (!panel || !selected || !list) return;

    if (selected.dataset.dropdownBound !== '1') {
      selected.dataset.dropdownBound = '1';
      selected.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        list.style.display = list.style.display === 'block' ? 'none' : 'block';
      });
    }

    if (panel.dataset.dropdownBound !== '1') {
      panel.dataset.dropdownBound = '1';
      panel.addEventListener('click', function(e) {
        if (!list.contains(e.target) && !selected.contains(e.target)) {
          list.style.display = 'block';
        }
        e.stopPropagation();
      });
      document.addEventListener('click', function(e) {
        if (!panel.contains(e.target)) list.style.display = 'none';
      });
    }

    if (list.dataset.forceOpen === '1') {
      list.style.display = 'block';
      list.dataset.forceOpen = '0';
    } else {
      list.style.display = 'none';
    }
  }

  ns.bindSpecPanelBehavior = bindSpecPanelBehavior;

  ns.initSpecPanelBehavior = function initSpecPanelBehavior() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindSpecPanelBehavior, { once: true });
    } else {
      bindSpecPanelBehavior();
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
