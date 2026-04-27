(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.ui = ns.ui || {};
  ns.ui.calc = ns.ui.calc || {};

  function syncCalcResultState(result, meta) {
    global._lastCalcResult = {
      allDP: result.allDP || [],
      patA: result.patA || null,
      patB: result.patB || null,
      patC: result.patC || null,
      meta: meta || {}
    };
    global._lastAllDP = result.allDP || [];
    global._lastPatA = result.patA || null;
    global._lastPatB = result.patB || null;
    if (typeof global.autoSyncResultRemnants === 'function') {
      global.autoSyncResultRemnants(global._lastCalcResult);
    }
  }

  function renderCutDoneBanner() {
    var rp = global.document && global.document.getElementById('result');
    if (!rp) return;

    var existing = global.document.getElementById('cutDoneBanner');
    if (existing) existing.remove();

    var wrap = global.document.createElement('div');
    wrap.id = 'cutDoneBanner';
    wrap.style.cssText = 'padding:8px 0 4px;';

    var btn = global.document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = 'width:100%;background:rgba(167,139,250,.15);border:1px solid var(--br);color:var(--br);border-radius:10px;padding:10px;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:.05em';
    btn.textContent = '切断済み部材・残材を在庫に登録する';
    btn.addEventListener('click', function() {
      if (typeof global.showCutDoneModal === 'function') {
        global.showCutDoneModal(global._lastAllDP, global._lastPatA, global._lastPatB, null);
      }
    });

    wrap.appendChild(btn);
    if (rp.firstChild) rp.insertBefore(wrap, rp.firstChild);
    else rp.appendChild(wrap);
  }

  function applyCalcResultView(result, options) {
    options = options || {};
    if (typeof global.render === 'function') {
      global.render(
        result.single || [],
        [],
        result.chgPlans || [],
        options.endLoss || 0,
        result.remnantBars || [],
        options.kgm || 0,
        result.allDP || [],
        result.calcPieces || [],
        result.bundlePlan || null,
        result.patA || null,
        result.patB || null,
        result.patC || null,
        result.yieldCard1 || null,
        null
      );
    }
    renderCutDoneBanner();
  }

  function applyCalcResultState(result, options) {
    options = options || {};
    syncCalcResultState(result, options.meta || {});
    applyCalcResultView(result, options);
  }

  ns.ui.calc.syncCalcResultState = syncCalcResultState;
  ns.ui.calc.renderCutDoneBanner = renderCutDoneBanner;
  ns.ui.calc.applyCalcResultView = applyCalcResultView;
  ns.ui.calc.applyCalcResultState = applyCalcResultState;
})(window);
