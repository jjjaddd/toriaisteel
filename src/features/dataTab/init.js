
function buildSelectorBar() {
  var bar = document.getElementById('dtSelectors');
  if (!bar) return;
  // ラベル("規格を選択")は index.html の eyebrow 側で出しているのでここでは出さない。
  // +ボタンもチップバー末尾の .dt-spec-add で出すのでここでは付けない。
  // renderDataSpecPicker() が中身を書き込むための空スロットだけ用意する。
  bar.style.cssText = '';
  bar.innerHTML = '<div id="dataSpecPicker"></div>';
}

function dataInit() {
  buildSelectorBar();          // セレクターバーをJSで完全生成
  mountSidebarSearch();        // Phase 2: 左サイドバー検索ボックス
  renderDataKindTabs();        // 鋼種の選択肢を描画
  renderDataSpecPicker();      // サイズピッカーを描画
  renderDataSpec();
  if (typeof renderCustomMaterialsPanel === 'function') renderCustomMaterialsPanel();
}

function dtCustomOpen() {
  if (typeof renderCustomMaterialsPanel === 'function') renderCustomMaterialsPanel();
  var m = document.getElementById('dtCustomModal');
  if (m) m.style.display = 'flex';
}
function dtCustomClose() {
  var m = document.getElementById('dtCustomModal');
  if (m) m.style.display = 'none';
}
