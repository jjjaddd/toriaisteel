/**
 * utils.js — 純粋ユーティリティ関数
 * ─────────────────────────────────────────────────────────
 * このファイルは main.js より前に読み込まれる。
 * main.js に同名関数が残っているが、将来的にそちらを削除する予定。
 *
 * 【含まれる関数】
 *   jisRound, jisRoundKg       — JIS丸め
 *   _escHtml, escapeHtml       — HTMLエスケープ（名前統一）
 *   parseDateValue, toLocalYMD, normDateStr — 日付ユーティリティ
 *   paginateItems              — ページネーション
 *   lc                         — 長さクラス判定
 *   mk                         — DOM要素生成ヘルパー
 *
 * 【Phase 2 で行うこと】
 *   main.js の同名関数を削除し、このファイルを唯一の実装にする。
 * ─────────────────────────────────────────────────────────
 */

// ── JIS丸め ─────────────────────────────────────────────
function jisRound(value, decimals) {
  var factor = Math.pow(10, decimals);
  var shifted = value * factor;
  var floor = Math.floor(shifted);
  var diff = shifted - floor;
  if (Math.abs(diff - 0.5) < 1e-10) {
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }
  return Math.round(shifted) / factor;
}

function jisRoundKg(kg) {
  if (kg <= 0) return 0;
  return jisRound(kg, 0);
}

// ── HTMLエスケープ ───────────────────────────────────────
// _escHtml と escapeHtml の2名称が混在しているため両方定義
// Phase 2 で escapeHtml に統一予定
function _escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
// ※ final-overrides.js が後から escapeHtml を再定義するため
//   ここでは定義のみ（上書きされても _escHtml は残る）
function escapeHtml(value) { return _escHtml(value); }

// ── 日付ユーティリティ ───────────────────────────────────
function parseDateValue(value) {
  if (!value) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value + 'T00:00:00').getTime();
  var parsed = new Date(value).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function toLocalYMD(d) {
  if (!(d instanceof Date)) d = new Date(d);
  if (isNaN(d.getTime())) return '';
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function normDateStr(value) {
  if (!value) return '';
  var s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var m = s.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (m) return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0');
  return s;
}

// ── ページネーション ────────────────────────────────────
function paginateItems(items, page, size) {
  var total = items.length;
  var totalPages = Math.max(1, Math.ceil(total / size));
  var p = Math.min(Math.max(1, page || 1), totalPages);
  var start = (p - 1) * size;
  return { items: items.slice(start, start + size), page: p, totalPages: totalPages, total: total };
}

// ── 長さクラス判定（切断図の色分けに使用） ──────────────
function lc(v) { return v < 200 ? 'll' : v < 800 ? 'lm' : 'lh'; }

// ── DOM要素生成ヘルパー ──────────────────────────────────
function mk(tag, cls) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}
