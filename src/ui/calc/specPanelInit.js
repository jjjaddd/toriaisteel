/**
 * src/ui/calc/specPanelInit.js
 * 規格選択パネルの DOM バインドを起動する初期化スクリプト。
 * → 旧バージョンでは buildSpec / selectKind を wrap していたが、
 *   両関数とも現在は未定義のため wrap は dead で削除済み。
 *   本ファイルは specPanelBehavior の DOM バインドだけを実行する。
 */
(function() {
  'use strict';

  var calcUiNs = window.Toriai && window.Toriai.ui && window.Toriai.ui.calc;
  if (!calcUiNs) return;

  if (typeof calcUiNs.initSpecPanelBehavior === 'function') {
    calcUiNs.initSpecPanelBehavior();
  }
})();
