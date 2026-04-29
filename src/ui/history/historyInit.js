/**
 * src/ui/history/historyInit.js
 * 履歴UI のグローバル名 renderHistory を Toriai.ui.history.renderHistory で上書き。
 * 旧グローバル呼び出しを残す箇所があるため、history renderer 読み込み後にロードする。
 * 旧 final-overrides.js の enforceHistoryNewestFirst IIFE から移植。
 */
(function() {
  'use strict';
  if (!(window.Toriai && window.Toriai.ui && window.Toriai.ui.history)) return;
  renderHistory = function() {
    return window.Toriai.ui.history.renderHistory();
  };
})();
