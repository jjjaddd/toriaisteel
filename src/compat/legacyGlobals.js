/**
 * legacyGlobals.js
 * ─────────────────────────────────────────────────────────
 * 旧コード（main.js / calc.js / weight.js / custom-materials.js 等）が
 * グローバル関数名で呼んでいた名残を、`window.Toriai.ui.*` 名前空間に
 * 橋渡しするための薄いブリッジ集。
 *
 * このファイルにロジックを書かない。新規実装は必ず元の責務ファイル
 * （main.js / storage.js / src/ui/* / src/calculation/* など）に直接書くこと。
 *
 * ここに新しいラッパーや上書きを追加してはいけない。既存ブリッジは
 * 呼び出し元を `Toriai.ui.X.foo()` 直書きに置き換えながら順次削除する。
 * ─────────────────────────────────────────────────────────
 */
(function(global) {
  'use strict';

  var ui = global.Toriai && global.Toriai.ui ? global.Toriai.ui : null;
  if (!ui) return;

  function bridge(name, target) {
    global[name] = function() {
      return target.apply(this, arguments);
    };
  }

  // inventory
  global.getSelectedInventoryRemnants = function() { return ui.inventory.getSelectedInventoryRemnants(); };
  global.saveSelectedInventoryRemnants = function(data) { return ui.inventory.saveSelectedInventoryRemnants(data); };
  global.getSelectedInventoryRemnantDetails = function() { return ui.inventory.getSelectedInventoryRemnantDetails(); };
  global.updateInventoryUseButton = function() { return ui.inventory.updateInventoryUseButton(); };
  global.buildInventoryDropdown = function() { return ui.inventory.buildInventoryDropdown(); };
  global.addFromInventory = function() { return ui.inventory.addFromInventory(); };
  global.removeRemnant = function(i) { return ui.inventory.removeRemnant(i); };
  global.saveRemnants = function() { return ui.inventory.saveRemnants(); };
  global.createInventoryRemnantRow = function(item, selectedQty) { return ui.inventory.createInventoryRemnantRow(item, selectedQty); };
  global.syncInventoryToRemnants = function() { return ui.inventory.syncInventoryToRemnants(); };
  global.getRemnants = function() { return ui.inventory.getRemnants(); };
  global.deleteInventoryGroup = function(groupKey) { return ui.inventory.deleteInventoryGroup(groupKey); };
  global.bindInventoryListActions = function() { return ui.inventory.bindInventoryListActions(); };
  global.bindRemnantQtyEnter = function() { return ui.inventory.bindRemnantQtyEnter(); };
  global.updateInventoryGroupNote = function(groupKey, value) { return ui.inventory.updateInventoryGroupNote(groupKey, value); };
  global.toggleInventoryGroupNoteEditor = function(groupKey, forceOpen) { return ui.inventory.toggleInventoryGroupNoteEditor(groupKey, forceOpen); };
  global.saveInventoryGroupNoteFromInput = function(groupKey) { return ui.inventory.saveInventoryGroupNoteFromInput(groupKey); };

  // history
  global.buildPrintSectionFromPayload = function(sectionIndex, spec, payload, endLoss) {
    return ui.history.buildPrintSectionFromPayload(sectionIndex, spec, payload, endLoss);
  };
  global.buildSinglePrintHtml = function(job, spec, payload, endLoss) {
    return ui.history.buildSinglePrintHtml(job, spec, payload, endLoss);
  };
  // cart
  global.getCartPurchaseSummary = function(cart) { return ui.cart.getCartPurchaseSummary(cart); };
  global.buildPurchaseMailto = function(summary, cart) { return ui.cart.buildPurchaseMailto(summary, cart); };
  global.buildPurchaseGmailUrl = function(summary, cart) { return ui.cart.buildPurchaseGmailUrl(summary, cart); };

  // contact
  global.buildFeedbackBody = function() { return ui.contact.buildFeedbackBody(); };
  global.buildFeedbackMailto = function() { return ui.contact.buildFeedbackMailto(); };
  global.buildFeedbackGmailUrl = function() { return ui.contact.buildFeedbackGmailUrl(); };
  global.openFeedbackMailDefault = function() { return ui.contact.openFeedbackMailDefault(); };
  global.openFeedbackMailGmail = function() { return ui.contact.openFeedbackMailGmail(); };
  global.submitFeedbackViaGAS = function() { return ui.contact.submitFeedbackViaGAS(); };

  // inventory overrides initialisation (sync inventory module's reassignment of legacy globals)
  if (ui.inventory && typeof ui.inventory.initializeOverrides === 'function') {
    ui.inventory.initializeOverrides();
  }
})(window);
