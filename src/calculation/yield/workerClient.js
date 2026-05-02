(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns) return;

  ns.calculation.yield = ns.calculation.yield || {};

  function getExternalWorkerUrl() {
    return 'src/calculation/workers/yieldWorker.js?v=phase3';
  }

  function createBlobWorker(workerBase64) {
    if (!workerBase64) return null;
    var workerCode = atob(workerBase64);
    var blob = new Blob([workerCode], { type: 'application/javascript' });
    var url = URL.createObjectURL(blob);
    return {
      worker: new Worker(url),
      cleanup: function() {
        URL.revokeObjectURL(url);
      },
      source: 'blob'
    };
  }

  function createCalcWorker(workerBase64) {
    try {
      return {
        worker: new Worker(getExternalWorkerUrl()),
        cleanup: function() {},
        source: 'external'
      };
    } catch (externalError) {
      return createBlobWorker(workerBase64);
    }
  }

  function runWorkerMode(mode, baseMsg, workerBase64) {
    return new Promise(function(resolve) {
      function start(handle, canFallback) {
        if (!handle || !handle.worker) {
          resolve({});
          return;
        }

        handle.worker.onmessage = function(e) {
          handle.worker.terminate();
          handle.cleanup();
          if (e.data && e.data.ok) resolve(e.data.result || {});
          else resolve({});
        };

        handle.worker.onerror = function() {
          handle.worker.terminate();
          handle.cleanup();
          if (canFallback && handle.source === 'external') {
            start(createBlobWorker(workerBase64), false);
            return;
          }
          resolve({});
        };

        handle.worker.postMessage(Object.assign({}, baseMsg, { mode: mode }));
      }

      start(createCalcWorker(workerBase64), true);
    });
  }

  ns.calculation.yield.createCalcWorker = createCalcWorker;
  ns.calculation.yield.runWorkerMode = runWorkerMode;
})(window);
