// weight.js - weight simulator
// Gradually moving from STEEL global to data-driven getters.

// ── グローバル変数 ─────────────────────────────────────────────
var _wInited    = false;
var _wRows      = [];
var _wUndoStack = [];
var _wRedoStack = [];
var _wOpts      = { price: false, name: false, rev: false, paint: false, m2: false, co2: false };
var _wEditIdx   = -1;
var _wCartAdded = false;
var _wSelected     = [];   // 一括編集用選択インデックス
var _wLastClickIdx = -1;   // Shift範囲選択用・最後にクリックした行
var _wStore = (window.Toriai && window.Toriai.storage && window.Toriai.storage.weightStore) || null;
var _wPersistedState = _wStore && typeof _wStore.loadState === 'function'
  ? _wStore.loadState()
  : { savedCalcs: [], jobName: '', jobClient: '', docTitle: '', notes: {} };
var _wSavedCalcs = Array.isArray(_wPersistedState.savedCalcs) ? _wPersistedState.savedCalcs : [];
var _wJobName = _wPersistedState.jobName || '';
var _wJobClient = _wPersistedState.jobClient || '';
var _wDocTitle = _wPersistedState.docTitle || '';

// コマンドパレット
var _wCmdAll = [];
var _wCmdIdx = -1;

// ── スタイル定数 ───────────────────────────────────────────────
var _tdL = 'padding:8px 10px;text-align:left;white-space:nowrap;';
var _tdR = 'padding:8px 10px;text-align:right;white-space:nowrap;font-family:monospace;';

// ── ヘルパー ──────────────────────────────────────────────────
function _wSpecName(row) { return row[0]; }
function _wSpecKgm(row)  { return row[1]; }
function _wKinds() {
  if (window.Toriai && window.Toriai.data && window.Toriai.data.steel && typeof window.Toriai.data.steel.getAllKinds === 'function') {
    return window.Toriai.data.steel.getAllKinds();
  }
  if (typeof getCalcEnabledKinds === 'function') return getCalcEnabledKinds();
  return [];
}
function _wRowsByKind(kind) {
  if (window.Toriai && window.Toriai.data && window.Toriai.data.steel && typeof window.Toriai.data.steel.getRowsByKind === 'function') {
    return window.Toriai.data.steel.getRowsByKind(kind);
  }
  if (typeof getSteelRowsForKind === 'function') return getSteelRowsForKind(kind);
  return [];
}

function _wEnsureCatalogReady() {
  var kinds = _wKinds();
  if (Array.isArray(kinds) && kinds.length) return kinds;

  kinds = _wKinds();
  return Array.isArray(kinds) ? kinds : [];
}

// jisRound / jisRoundKg は src/utils/jisRound.js が提供（main より前にロード）

function _wFmt(v, dec) {
  var rounded = jisRound(v, dec);
  return rounded.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function _wFmtKg(kg) {
  var rounded = jisRoundKg(kg);
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function _escAttr(s) {
  return '\'' + String(s).replace(/\\/g,'\\\\').replace(/'/g,'\\\'').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '\'';
}

