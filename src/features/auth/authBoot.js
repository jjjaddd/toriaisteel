(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};

  function mountLoginEntry(container) {
    if (!container) return;
    container.innerHTML = '';
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'torg-switcher torg-login-btn';
    button.textContent = 'ログイン';
    button.addEventListener('click', function() {
      if (ns.authUI && typeof ns.authUI.openLogin === 'function') {
        ns.authUI.openLogin({ onSuccess: function() { global.location.reload(); } });
      }
    });
    container.appendChild(button);
  }

  function refreshScopedViews() {
    if (typeof global.renderInventoryPage === 'function') global.renderInventoryPage();
    if (ns.ui && ns.ui.inventory && typeof ns.ui.inventory.syncInventoryToRemnants === 'function') {
      ns.ui.inventory.syncInventoryToRemnants();
    }
    if (typeof global.updateInvDropdown === 'function') global.updateInvDropdown();
  }

  function mountSwitcherIfPossible(state) {
    var container = document.getElementById('toriaiOrgSwitcher');
    if (!container || !ns.authUI) return;
    if (state && state.loggedIn && typeof ns.authUI.mountSwitcher === 'function') {
      ns.authUI.mountSwitcher(container);
    } else {
      mountLoginEntry(container);
    }
  }

  function bootAuthOrgIntegration() {
    if (!ns.authUI || !ns.auth || !ns.org) return;
    ns.authUI.boot({
      requireAuth: false,
      onSuccess: function() { global.location.reload(); }
    }).then(mountSwitcherIfPossible).catch(function(error) {
      console.warn('[Toriai][auth] boot skipped:', error);
      mountLoginEntry(document.getElementById('toriaiOrgSwitcher'));
    });

    if (typeof ns.auth.onAuthStateChange === 'function') {
      ns.auth.onAuthStateChange(function(event) {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') global.location.reload();
      });
    }
  }

  global.addEventListener('toriai:active-org-changed', refreshScopedViews);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAuthOrgIntegration, { once: true });
  } else {
    bootAuthOrgIntegration();
  }

  ns.authBoot = {
    boot: bootAuthOrgIntegration,
    mountLoginEntry: mountLoginEntry,
    refreshScopedViews: refreshScopedViews
  };
})(window);
