
// ── 殴り書きメモ（絵文字なし） ────────────────────────────────
function renderDataNote(specName) {
  var el = document.getElementById('dataNoteArea');
  if (!el) return;
  el.style.display = 'block';
  var key = 'dnote_' + specName;
  var notes = [];
  try { notes = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
  var chatHtml = notes.length
    ? notes.map(function(n, idx) {
        return '<div class="dt-note-item" style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
          '<div><div class="dt-note-ts">' + n.ts + '</div>' +
          '<div class="dt-note-text">' + n.text.replace(/</g,'&lt;') + '</div></div>' +
          '<button onclick="dataNoteDelete(\'' + specName.replace(/'/g,"\\'") + '\',' + idx + ')" ' +
            'style="background:none;border:none;color:#ccc;cursor:pointer;font-size:13px;padding:0 2px;flex-shrink:0;line-height:1" title="削除">×</button>' +
          '</div>';
      }).join('')
    : '<div style="color:#aaa;font-size:12px">まだメモなし</div>';
  el.innerHTML =
    '<div class="dt-note-lbl">メモ（後日みんなで共有予定）</div>' +
    '<div class="dt-note-list">' + chatHtml + '</div>' +
    '<div class="dt-note-form">' +
      '<textarea id="dataNoteInput" placeholder="自由記入..."></textarea>' +
      '<button onclick="dataNotePost(\'' + specName.replace(/'/g,"\\'") + '\')">送信</button>' +
    '</div>';
}

function dataNoteDelete(specName, idx) {
  var key = 'dnote_' + specName;
  var notes = [];
  try { notes = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
  notes.splice(idx, 1);
  try { localStorage.setItem(key, JSON.stringify(notes)); } catch(e) {}
  renderDataNote(specName);
}

function dataNotePost(specName) {
  var input = document.getElementById('dataNoteInput');
  if (!input || !input.value.trim()) return;
  var key = 'dnote_' + specName;
  var notes = [];
  try { notes = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
  notes.push({ ts: new Date().toLocaleString('ja-JP'), text: input.value.trim() });
  try { localStorage.setItem(key, JSON.stringify(notes)); } catch(e) {}
  renderDataNote(specName);
}

/* スペック選択 */
function selectDataSpec(idx, kind) {
  if (kind && SECTION_DATA[kind]) _dataKind = kind;
  _dataSpecIdx = idx;
  renderDataKindTabs();
  renderDataSpecPicker();
  renderDataSpec();
  closeDataSpecDropdown();
}

function dataSelectSpec(idx) {
  selectDataSpec(idx);
}

// ===== 互換用の SECTION_DATA 同期 =====
// 実データ本体は data 側を正とし、旧 window.STEEL の常時再構築はやめる。
(function syncSectionDataToSteelRegistry() {
  var steelApi = window.Toriai && window.Toriai.data && window.Toriai.data.steel;
  if (!steelApi) return;
  steelApi._sectionData = SECTION_DATA;
})();

