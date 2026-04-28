function enterNext(e, nextId) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  var next = nextId ? document.getElementById(nextId) : null;
  if (next) { next.focus(); next.select(); }
}

/** 在庫定尺：直接入力・1未満で∞に戻す */

/** 在庫定尺：▲ 上限本数を増やす */
function stkUp(i) {
  var lbl = document.getElementById('sm_lbl' + i);
  var inp = document.getElementById('sm' + i);
  var cur = parseInt(inp.value) || 0;
  var next = cur + 1;
  inp.value = next;
  lbl.textContent = next;
  lbl.style.display = '';
  inp.style.display = 'none';
  saveSettings();
}

/** 在庫定尺：▼ 上限本数を減らす（1のとき∞に戻す） */
function stkDown(i) {
  var lbl = document.getElementById('sm_lbl' + i);
  var inp = document.getElementById('sm' + i);
  var cur = parseInt(inp.value) || 0;
  if (cur <= 1) {
    // ∞に戻す
    inp.value = '';
    lbl.textContent = '∞';
  } else {
    var next = cur - 1;
    inp.value = next;
    lbl.textContent = next;
  }
  lbl.style.display = '';
  inp.style.display = 'none';
  saveSettings();
}

/** 在庫定尺：ラベルクリックで直接入力モードに */
function stkEdit(i) {
  var lbl = document.getElementById('sm_lbl' + i);
  var inp = document.getElementById('sm' + i);
  lbl.style.display = 'none';
  inp.style.display = '';
  inp.focus();
  inp.select();
}

/** 在庫定尺：直接入力後にラベルに反映 */
function stkInputChange(i) {
  var lbl = document.getElementById('sm_lbl' + i);
  var inp = document.getElementById('sm' + i);
  var v = parseInt(inp.value);
  if (!v || v < 1) {
    inp.value = '';
    lbl.textContent = '∞';
  } else {
    lbl.textContent = v;
  }
  lbl.style.display = '';
  inp.style.display = 'none';
  saveSettings();
}
