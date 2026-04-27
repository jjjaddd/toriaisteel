(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns) return;

  ns.ui = ns.ui || {};
  ns.ui.calc = ns.ui.calc || {};

  var DEFAULT_RUN_LABEL = '計算を実行する <span class="arr">→</span><span class="run-hint">Ctrl + Enter</span>';
  var BUSY_RUN_LABEL = '<span class="sp"></span> 計算中...';

  function getRunButton() {
    return document.getElementById('runBtn');
  }

  function setRunButtonBusy() {
    var button = getRunButton();
    if (!button) return null;
    button.innerHTML = BUSY_RUN_LABEL;
    button.disabled = true;
    return button;
  }

  function resetRunButton() {
    var button = getRunButton();
    if (!button) return;
    button.innerHTML = DEFAULT_RUN_LABEL;
    button.disabled = false;
  }

  function failCalcRun(message) {
    if (message) alert(message);
    resetRunButton();
    if (typeof global.hideCalcLoadingOverlay === 'function') {
      global.hideCalcLoadingOverlay();
    }
  }

  function completeCalcRun() {
    resetRunButton();
    if (typeof global.hideCalcLoadingOverlay === 'function') {
      global.hideCalcLoadingOverlay();
    }
  }

  function runSequentialModes(runWorkerMode, scheduleCalcIdle, baseMsg) {
    var results = {};
    return runWorkerMode('yield', baseMsg).then(function(res) {
      results.yield = res || {};
      return new Promise(function(resolve) {
        scheduleCalcIdle(function() {
          runWorkerMode('patA', baseMsg).then(function(r) {
            results.patA = r || {};
            resolve();
          });
        });
      });
    }).then(function() {
      return new Promise(function(resolve) {
        scheduleCalcIdle(function() {
          runWorkerMode('patB', baseMsg).then(function(r) {
            results.patB = r || {};
            resolve();
          });
        });
      });
    }).then(function() {
      return results;
    });
  }

  ns.ui.calc.DEFAULT_RUN_LABEL = DEFAULT_RUN_LABEL;
  ns.ui.calc.BUSY_RUN_LABEL = BUSY_RUN_LABEL;
  ns.ui.calc.setRunButtonBusy = setRunButtonBusy;
  ns.ui.calc.resetRunButton = resetRunButton;
  ns.ui.calc.failCalcRun = failCalcRun;
  ns.ui.calc.completeCalcRun = completeCalcRun;
  ns.ui.calc.runSequentialModes = runSequentialModes;
})(window);
