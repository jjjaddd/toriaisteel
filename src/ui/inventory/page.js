(function(global) {
  'use strict';

  var ns = global.Toriai.ui.inventory = global.Toriai.ui.inventory || {};

  ns.deleteInventoryGroup = function deleteInventoryGroup(groupKey) {
    var ids = String(groupKey || '').split(',').map(function(id) {
      return String(id || '').trim();
    }).filter(Boolean);
    if (!ids.length || typeof global.saveInventory !== 'function' || typeof global.getInventory !== 'function') return;
    if (!confirm('この在庫を削除しますか？')) return;
    global.saveInventory(global.getInventory().filter(function(item) {
      return ids.indexOf(String(item.id)) === -1;
    }));
    ns.syncInventoryToRemnants();
    global.updateInvDropdown();
    global.renderInventoryPage();
  };

  ns.bindInventoryListActions = function bindInventoryListActions() {
    var cont = document.getElementById('invListCont');
    if (!cont || cont.dataset.actionsBound === '1') return;
    cont.dataset.actionsBound = '1';
    cont.addEventListener('click', function(e) {
      var editBtn = e.target.closest('.inv-note-badge[data-group-key]');
      if (editBtn) {
        e.preventDefault();
        e.stopPropagation();
        ns.toggleInventoryGroupNoteEditor(editBtn.dataset.groupKey || '', true);
        return;
      }
      var saveBtn = e.target.closest('.inv-note-save[data-group-key]');
      if (saveBtn) {
        e.preventDefault();
        e.stopPropagation();
        ns.saveInventoryGroupNoteFromInput(saveBtn.dataset.groupKey || '');
      }
    });
  };

  ns.focusFirstPieceRow = function focusFirstPieceRow() {
    var target = null;
    for (var i = 0; typeof global.totalRows !== 'undefined' && i < global.totalRows; i++) {
      var input = document.getElementById('pl' + i);
      if (!input) continue;
      if (!String(input.value || '').trim()) {
        target = input;
        break;
      }
      if (!target) target = input;
    }
    if (target) {
      target.focus();
      if (typeof target.select === 'function') target.select();
    }
  };

  ns.bindRemnantQtyEnter = function bindRemnantQtyEnter() {
    var list = document.getElementById('remnantList');
    if (!list || list.dataset.enterBound === '1') return;
    list.dataset.enterBound = '1';
    list.addEventListener('keydown', function(e) {
      var target = e.target;
      if (!target || !target.classList || !target.classList.contains('rem-qty')) return;
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (typeof global.saveRemnants === 'function') global.saveRemnants();
      ns.focusFirstPieceRow();
    });
  };

  ns.updateInventoryGroupNote = function updateInventoryGroupNote(groupKey, value) {
    var ids = String(groupKey || '').split(',').map(function(id) {
      return String(id || '').trim();
    }).filter(Boolean);
    if (!ids.length || typeof global.saveInventory !== 'function' || typeof global.getInventory !== 'function') return;
    var note = String(value == null ? '' : value).trim();
    var inv = global.getInventory().map(function(item) {
      if (ids.indexOf(String(item.id)) === -1) return item;
      return Object.assign({}, item, { note: note });
    });
    global.saveInventory(inv);
    ns.syncInventoryToRemnants();
    global.updateInvDropdown();
    global.renderInventoryPage();
  };

  ns.toggleInventoryGroupNoteEditor = function toggleInventoryGroupNoteEditor(groupKey, forceOpen) {
    var root = document.querySelector('.inv-note-cell[data-group-key="' + String(groupKey || '') + '"]');
    if (!root) return;
    var display = root.querySelector('.inv-note-display');
    var editor = root.querySelector('.inv-note-editor');
    var shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !(editor && editor.style.display !== 'none');
    if (display) display.style.display = shouldOpen ? 'none' : 'flex';
    if (editor) editor.style.display = shouldOpen ? 'flex' : 'none';
    if (shouldOpen) {
      var input = root.querySelector('.inv-note-input');
      if (input) {
        input.focus();
        input.select();
      }
    }
  };

  ns.saveInventoryGroupNoteFromInput = function saveInventoryGroupNoteFromInput(groupKey) {
    var root = document.querySelector('.inv-note-cell[data-group-key="' + String(groupKey || '') + '"]');
    if (!root) return;
    var input = root.querySelector('.inv-note-input');
    ns.updateInventoryGroupNote(groupKey, input ? input.value : '');
  };

  // renderInventoryPage 本体は materialStock/inventoryRender.js に集約済み。

  ns.initializeOverrides = function initializeOverrides() {
    function bind() {
      var sel = document.getElementById('invSelect');
      var btn = document.getElementById('invUseBtn');

      if (sel && !sel.dataset.finalBound) {
        sel.dataset.finalBound = '1';
        sel.addEventListener('change', global.updateInventoryUseButton);
      }
      if (btn && !btn.dataset.finalBound) {
        btn.dataset.finalBound = '1';
        btn.addEventListener('click', global.addFromInventory);
      }

      global.buildInventoryDropdown();
      global.syncInventoryToRemnants();
      ns.bindRemnantQtyEnter();
      global.cleanCartChrome();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bind, { once: true });
    } else {
      bind();
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
