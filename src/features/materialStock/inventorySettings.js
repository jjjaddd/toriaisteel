(function(global) {
  'use strict';

  function getMinValue() {
    var hidden = document.getElementById('minRemnantLen');
    var value = parseInt(hidden && hidden.value, 10);
    return Number.isFinite(value) && value >= 0 ? value : 500;
  }

  function setDisplay(value) {
    var hidden = document.getElementById('minRemnantLen');
    var label = document.getElementById('minRemnantLenValue');
    var input = document.getElementById('minRemnantLenInput');
    var safeValue = parseInt(value, 10);
    if (!Number.isFinite(safeValue) || safeValue < 0) safeValue = 500;
    if (hidden) hidden.value = String(safeValue);
    if (label) label.textContent = safeValue.toLocaleString();
    if (input) input.value = String(safeValue);
  }

  function invMinRemnantBeginEdit() {
    var view = document.getElementById('minRemnantLenView');
    var edit = document.getElementById('minRemnantLenEdit');
    var input = document.getElementById('minRemnantLenInput');
    setDisplay(getMinValue());
    if (view) view.style.display = 'none';
    if (edit) edit.style.display = 'flex';
    if (input) {
      input.focus();
      input.select();
    }
  }

  function invMinRemnantConfirm() {
    var input = document.getElementById('minRemnantLenInput');
    var value = parseInt(input && input.value, 10);
    if (!Number.isFinite(value) || value < 0) value = 500;
    setDisplay(value);
    var view = document.getElementById('minRemnantLenView');
    var edit = document.getElementById('minRemnantLenEdit');
    if (edit) edit.style.display = 'none';
    if (view) view.style.display = 'flex';
    if (typeof global.saveSettings === 'function') global.saveSettings();
  }

  function syncMinRemnantDisplay() {
    setDisplay(getMinValue());
  }

  global.invMinRemnantBeginEdit = invMinRemnantBeginEdit;
  global.invMinRemnantConfirm = invMinRemnantConfirm;
  global.syncMinRemnantDisplay = syncMinRemnantDisplay;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncMinRemnantDisplay, { once: true });
  } else {
    syncMinRemnantDisplay();
  }
})(window);
