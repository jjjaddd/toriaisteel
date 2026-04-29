(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.features = ns.features || {};
  ns.features.calc = ns.features.calc || {};

  function getInventoryUi() {
    return ns.features.calc.state && ns.features.calc.state.getInventoryUi
      ? ns.features.calc.state.getInventoryUi()
      : null;
  }

  function initializeCalcPage() {
    rebuildStkList();

    var partList = document.getElementById('ptList');
    if (partList) partList.innerHTML = '';
    global.totalRows = 0;
    buildPartRows(global.ROWS);

    updKg();
    loadSettings();

    var inventoryUi = getInventoryUi();
    if (inventoryUi && typeof inventoryUi.syncInventoryToRemnants === 'function') {
      inventoryUi.syncInventoryToRemnants();
    }

    updKg();
    buildJobDatalist();
    updateCartBadge();

    var invSelect = document.getElementById('invSelect');
    if (invSelect && inventoryUi && typeof inventoryUi.updateInventoryUseButton === 'function') {
      invSelect.addEventListener('change', inventoryUi.updateInventoryUseButton);
    }

    var cartBulkPrintBtn = document.querySelector('#cartModal [onclick="cartPrintCutting()"]');
    if (cartBulkPrintBtn) cartBulkPrintBtn.classList.add('cart-bulk-print');
    if (inventoryUi && typeof inventoryUi.updateInventoryUseButton === 'function') {
      inventoryUi.updateInventoryUseButton();
    }

    var firstKind = getAppSteelKinds()[0];
    var firstRow = firstKind ? getAppSteelRows(firstKind)[0] : null;
    if (firstKind && firstRow) {
      cmdSelect({ kind: firstKind, spec: firstRow[0], kgm: firstRow[1] });
      var cmdInput = document.getElementById('cmdInput');
      if (cmdInput) cmdInput.value = '';
      var initKgm = document.getElementById('cmdKgm');
      if (initKgm) initKgm.textContent = '';
    }

    showCalcOnboardingIfNeeded();
  }

  ns.features.calc.init = initializeCalcPage;
  global.init = initializeCalcPage;
})(window);
