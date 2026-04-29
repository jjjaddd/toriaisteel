(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  var AUTH_ORG_UI_ENABLED = false;

  function mountLoginEntry(container) {
    if (!container) return;
    container.innerHTML = '';
    container.hidden = true;
    container.style.display = 'none';
  }

  function updateAuthMenuEntry(state) {
    if (!AUTH_ORG_UI_ENABLED) return;
    var button = document.getElementById('authMenuBtn');
    if (!button) return;
    var label = button.querySelector('.hm-txt') || button;
    label.textContent = state && state.loggedIn ? 'アカウント' : 'ログイン';
    button.hidden = false;
  }

  function openAuthMenuAction() {
    if (!AUTH_ORG_UI_ENABLED) return;
    if (!ns.authUI || !ns.auth) return;
    ns.auth.getSession().then(function(session) {
      if (session && typeof ns.authUI.mountSwitcher === 'function') {
        var activeOrg = ns.org && typeof ns.org.getActiveOrgId === 'function' ? ns.org.getActiveOrgId() : null;
        if (activeOrg && typeof ns.authUI.openMembers === 'function') {
          ns.authUI.openMembers(activeOrg);
        } else if (typeof ns.authUI.openFirstRun === 'function') {
          ns.authUI.openFirstRun();
        }
      } else if (typeof ns.authUI.openLogin === 'function') {
        ns.authUI.openLogin({ onSuccess: function() { global.location.reload(); } });
      }
    });
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
    if (!AUTH_ORG_UI_ENABLED) {
      mountLoginEntry(container);
      return;
    }
    if (state && state.loggedIn && typeof ns.authUI.mountSwitcher === 'function') {
      container.hidden = false;
      ns.authUI.mountSwitcher(container);
    } else {
      mountLoginEntry(container);
    }
  }

  function bootAuthOrgIntegration() {
    if (!AUTH_ORG_UI_ENABLED) {
      mountLoginEntry(document.getElementById('toriaiOrgSwitcher'));
      return;
    }
    if (!ns.authUI || !ns.auth || !ns.org) return;
    ns.authUI.boot({
      requireAuth: false,
      onSuccess: function() { global.location.reload(); }
    }).then(function(state) {
      updateAuthMenuEntry(state);
      mountSwitcherIfPossible(state);
    }).catch(function(error) {
      console.warn('[Toriai][auth] boot skipped:', error);
      updateAuthMenuEntry({ loggedIn: false });
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
    refreshScopedViews: refreshScopedViews,
    openAuthMenuAction: openAuthMenuAction
  };
  global.openAuthMenuAction = openAuthMenuAction;
})(window);
