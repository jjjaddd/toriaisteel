function toggleDiag(id, btn) {
  var el = document.getElementById(id);
  if (!el) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  btn.textContent = open ? '✂ 切断図を表示 ▼' : '✂ 切断図を閉じる ▲';
  btn.classList.toggle('open', !open);
}

function resetCalcResultPlaceholder() {
  var rp = document.getElementById('rp');
  if (!rp) return;
  while (rp.firstChild) rp.removeChild(rp.firstChild);
  var ph = document.createElement('div');
  ph.className = 'ph';
  ph.id = 'ph';
  ph.innerHTML =
    '<p>鋼材を選択し長さ、数量を入力して「計算を実行する」を押してください</p>' +
    '<small>右下設定マークから刃厚・端部ロス・使用する定尺を設定できます。</small>';
  rp.appendChild(ph);
}



// changelog / calcOnboarding / headerMenu は src/features/changelogModal/changelogModal.js, src/features/calcOnboarding/calcOnboarding.js, src/ui/header/headerMenu.js に分離


// ── 初期化 ──────────────────────────────────────────────

// ══════════════════════════════════════════════════════
// 🛒 カート機能
// ══════════════════════════════════════════════════════

/** カートバッジを更新 */

/** カードの情報を収集してカートに追加 */


/** カート内容をまとめて印刷 */

/** カートの内容で作業指示書を印刷 */

// ── 共通印刷ヘルパー（cartDoPrint / showHistPreview 共用）──────────────

var PRINT_CSS = [
  'body{font-family:sans-serif;padding:14px;background:#fff;color:#000;font-size:11px}',
  '@page{margin:8mm 10mm;size:A4 landscape}',
  '.ph-full{display:grid;grid-template-columns:1fr auto;gap:8px;padding-bottom:8px;border-bottom:2px solid #000;margin-bottom:12px;align-items:start}',
  '.ph-mini{display:grid;grid-template-columns:1fr auto;gap:8px;padding:4px 8px;background:#f0f0f0;border-left:3px solid #000;margin-bottom:10px;align-items:center;border-radius:0 4px 4px 0}',
  '.sec{border:1px solid #999;border-radius:6px;overflow:hidden;margin-bottom:8px;page-break-inside:avoid}',
  '.sec-hd{background:#e8e8e8;padding:5px 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #999}',
  '.sec-body{display:grid;grid-template-columns:145px 1fr}',
  '.sec-left{padding:7px 10px;border-right:1px solid #ccc;font-size:10px}',
  '.sec-right{padding:7px 10px}',
  '.badge{background:#000;color:white;font-size:9px;font-weight:700;padding:1px 7px;border-radius:3px;flex-shrink:0}',
  '.cut-tbl{width:100%;border-collapse:collapse;font-size:11px}',
  '.cut-tbl th{padding:3px 4px;border-bottom:1.5px solid #000;font-weight:700;font-size:10px;text-align:left;background:#f0f0f0}',
  '.cut-tbl td{padding:3px 4px;border-bottom:1px solid #e8e8e8}',
  '.cut-tbl td.num{text-align:center;font-weight:700}',
  '.bar-block{margin-bottom:6px}',
  '.bar-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:2px}',
  '.bar-pat{font-size:10px;font-weight:700;color:#222;margin-bottom:3px}',
  '.bar-track{display:flex;height:30px;border:1.5px solid #555;border-radius:3px;overflow:hidden;background:#fff}',
  '.b-blade{width:1.5px;background:#555;flex-shrink:0}',
  '.b-end{flex-shrink:0;background:#d8d8d8}',
  '.b-piece{display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#000;overflow:hidden;background:#d8d8d8;border-left:1px solid #555}',
  '.b-piece:first-of-type{border-left:none}',
  '.b-rem{background:repeating-linear-gradient(-45deg,#224488,#224488 2px,#c0d0ee 2px,#c0d0ee 6px);display:flex;align-items:center;justify-content:center;font-size:9px;color:#002;font-weight:700;border-left:3px solid #224488}',
  '.b-loss{background:repeating-linear-gradient(-45deg,#ccc,#ccc 1px,#fff 1px,#fff 4px);display:flex;align-items:center;justify-content:center;font-size:9px;color:#888;border-left:2px solid #aaa}',
  '.cnt-badge{background:#fff;color:#555;font-size:11px;font-weight:700;padding:2px 12px;border-radius:12px;letter-spacing:.04em;border:2px solid #555}',
  '.r-tag{font-size:9px;border:1px solid #bbb;padding:1px 5px;border-radius:3px;display:inline-block;margin:1px}',
  '.print-footer{display:flex;justify-content:space-between;font-size:9px;color:#888;margin-top:8px;padding-top:6px;border-top:1px solid #ddd}',
].join('\n');

/** フルヘッダーHTML生成 */

/** ミニヘッダーHTML生成（2枚目以降）*/

/**
 * 切断図バーHTML生成
 * @param {Array} bars - [{pat:[長さ,...], loss, sl}]
 * @param {number} sl - 定尺長さ
 * @param {number} endLoss - 端部ロス
 */

/**
 * セクションHTML生成（1鋼材分）
 * @param {number} secIdx - 番号（1始まり）
 * @param {Object} secData - {spec, kind, motherSummary, sumMap, remTags, bars, sl, endLoss}
 */

// ── 初期化 ──────────────────────────────────────────────

/** 汎用Enterキー：次のinputへフォーカス移動 */
