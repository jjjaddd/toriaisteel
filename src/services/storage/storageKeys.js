// LocalStorage キー定数 + モジュール状態
// 他の storage 系ファイルが参照するため、最初にロードする。

var _storageKeys = window.Toriai && window.Toriai.storage && window.Toriai.storage.keys ? window.Toriai.storage.keys : {};
var _localStore = window.Toriai && window.Toriai.storage && window.Toriai.storage.localStore ? window.Toriai.storage.localStore : null;

var LS_SETTINGS  = _storageKeys.settings  || 'so_settings';
var LS_REMNANTS  = _storageKeys.remnants  || 'so_remnants';
var LS_HISTORY   = _storageKeys.history   || 'so_history';
var LS_CUT_HIST  = _storageKeys.cutHistory || 'so_cut_hist_v2';
var LS_INVENTORY = _storageKeys.inventory || 'so_inventory_v2';
var LS_CART      = 'so_print_cart';
var LS_WORK_HIST = 'so_cut_hist_v2';

var LS_MAX_HIST = 10;
var LS_MAX_CUT  = 500;

// 最後の計算結果（印刷時の自動登録用）
var _lastCalcResult = null;
var _lastAllDP = [];
var _lastPatA = null;
var _lastPatB = null;
