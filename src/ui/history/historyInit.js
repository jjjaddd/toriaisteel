/**
 * src/ui/history/historyInit.js
 * 履歴UI のグローバル名 renderHistory を Toriai.ui.history.renderHistory で上書き。
 * → main.js より後にロードする必要がある (main.js の関数宣言ホイスティングに負けないため)。
 * 旧 final-overrides.js の enforceHistoryNewestFirst IIFE から移植。
 */
(function() {
  'use strict';
  if (!(window.Toriai && window.Toriai.ui && window.Toriai.ui.history)) return;
  renderHistory = function() {
    return window.Toriai.ui.history.renderHistory();
  };
})();
