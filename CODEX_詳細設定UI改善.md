# 詳細設定タブ UIリニューアル指示

## 対象ファイル
- `index.html`
- `style.css`

---

## 概要

`id="sbPanel2"` の詳細設定タブ内のレイアウトを全面的に刷新する。  
現在のバラバラな見た目を、統一感のあるモダンなデザインに変える。  
**機能・ID・イベントハンドラは一切変更しない。**

---

## style.css の変更

既存の `.shd`・`.field`・`.r2` のスタイルは**変更しない**（基本タブで使用しているため）。

以下のクラスを **style.css に追記**する（既存クラスとの衝突なし）：

```css
/* ── 詳細設定タブ専用スタイル ── */

/* セクション */
.ds-section { margin-bottom: 18px; }
.ds-title {
  font-size: 10px;
  font-weight: 700;
  color: #1a1a2e;
  letter-spacing: .06em;
  text-transform: uppercase;
  margin-bottom: 8px;
  padding-bottom: 5px;
  border-bottom: 1.5px solid #f0f0f5;
}

/* フィールド */
.ds-field { margin-bottom: 8px; }
.ds-field label {
  font-size: 10px;
  color: #1a1a2e;
  display: block;
  margin-bottom: 3px;
  font-weight: 600;
  transition: .15s;
}
.ds-field input[type="number"],
.ds-field input[type="text"],
.ds-field input[type="date"],
.ds-field textarea {
  width: 100%;
  background: #f8f8fc;
  border: 1.5px solid #eee;
  border-radius: 6px;
  font-size: 12px;
  padding: 6px 8px;
  color: #1a1a2e;
  outline: none;
  font-family: inherit;
  transition: .15s;
  box-sizing: border-box;
}
.ds-field input[type="number"]:hover,
.ds-field input[type="text"]:hover,
.ds-field input[type="date"]:hover,
.ds-field textarea:hover,
.ds-field input[type="number"]:focus,
.ds-field input[type="text"]:focus,
.ds-field input[type="date"]:focus,
.ds-field textarea:focus {
  border-color: #eee;
  background: #faf5ff;
  outline: none;
  box-shadow: none;
}
.ds-field textarea {
  resize: none;
  height: 52px;
  line-height: 1.5;
}
.ds-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

/* セクションヘッダー（全体タップ可） */
.ds-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 4px 2px;
  border-radius: 6px;
  transition: .15s;
  user-select: none;
}
.ds-sec-head:hover { background: #f5f0ff; }
.ds-sec-head:hover .ds-title { color: #6d28d9; }
.ds-sec-head:hover .ds-toggle-icon { color: #6d28d9; }

/* ＋／－ アイコン */
.ds-toggle-icon {
  color: #bbb;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
  transition: .15s;
}

/* 在庫定尺・手持ち残材 追加ボタン */
.ds-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 6px;
  background: none;
  border: 1.5px dashed #ddd;
  border-radius: 6px;
  font-size: 11px;
  color: #aaa;
  font-weight: 700;
  cursor: pointer;
  transition: .15s;
  font-family: inherit;
  margin-top: 4px;
}
.ds-add-btn:hover {
  border-color: #6d28d9;
  color: #6d28d9;
  background: #faf5ff;
}

/* トグルスイッチエリア */
.ds-toggle-area {
  background: #f8f8fc;
  border-radius: 10px;
  overflow: hidden;
}
.ds-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  border-bottom: 1px solid #eee;
  transition: .15s;
  cursor: pointer;
}
.ds-toggle-row:last-child { border-bottom: none; }
.ds-toggle-row:hover { background: #faf5ff; }
.ds-toggle-row:hover .ds-toggle-label span { color: #6d28d9; }
.ds-toggle-label span {
  font-size: 11px;
  font-weight: 700;
  color: #1a1a2e;
  display: block;
  transition: .15s;
}
.ds-toggle-label small {
  font-size: 9px;
  color: #bbb;
  display: block;
  margin-top: 1px;
}

/* CSS トグルスイッチ本体 */
.ds-tog { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
.ds-tog input { opacity: 0; width: 0; height: 0; position: absolute; }
.ds-tog-track {
  position: absolute;
  inset: 0;
  background: #ddd;
  border-radius: 20px;
  cursor: pointer;
  transition: .2s;
}
.ds-tog input:checked + .ds-tog-track { background: #6d28d9; }
.ds-tog-track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transition: .2s;
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
}
.ds-tog input:checked + .ds-tog-track::after { left: 19px; }
```

---

## index.html の変更

`id="sbPanel2"` の中身を**まるごと**以下で置き換える。  
**IDとイベントハンドラは現状を完全に維持する。**

```html
<div class="sb-panel" id="sbPanel2">

  <!-- 設定 -->
  <div class="ds-section">
    <div class="ds-sec-head" onclick="toggleSection('settingBody','settingToggleBtn','')">
      <div class="ds-title" style="margin-bottom:0;border-bottom:none;flex:1">設定</div>
      <span id="settingToggleBtn" class="ds-toggle-icon">＋</span>
    </div>
    <div style="height:1.5px;background:#f0f0f5;margin:2px 0 8px"></div>
    <div id="settingBody" style="display:none">
      <div class="ds-grid">
        <div class="ds-field">
          <label>刃厚 (mm)</label>
          <input type="number" id="blade" onkeydown="enterNext(event,'endloss')" value="3" min="1" oninput="saveSettings()">
        </div>
        <div class="ds-field">
          <label>端部ロス (mm)</label>
          <input type="number" id="endloss" onkeydown="enterNext(event,'minRemnantLen')" value="150" min="0" oninput="saveSettings()">
        </div>
      </div>
      <div class="ds-field">
        <label>端材 最小有効長さ (mm)</label>
        <input type="number" id="minRemnantLen" onkeydown="enterNext(event,'kgm')" value="500" min="0" placeholder="例:500" oninput="saveSettings()">
      </div>
    </div>
  </div>

  <!-- 作業情報 -->
  <div class="ds-section">
    <div class="ds-sec-head" onclick="toggleSection('jobBody','jobToggleBtn','')">
      <div class="ds-title" style="margin-bottom:0;border-bottom:none;flex:1">作業情報</div>
      <span id="jobToggleBtn" class="ds-toggle-icon">＋</span>
    </div>
    <div style="height:1.5px;background:#f0f0f5;margin:2px 0 8px"></div>
    <div id="jobBody" style="display:none">
      <div class="ds-field">
        <label>顧客名</label>
        <input type="text" id="jobClient" onkeydown="enterNext(event,'jobName')" oninput="saveSettings()" list="clientHistList" autocomplete="off">
        <datalist id="clientHistList"></datalist>
      </div>
      <div class="ds-field">
        <label>工事名</label>
        <input type="text" id="jobName" onkeydown="enterNext(event,'jobDeadline')" oninput="saveSettings()" list="nameHistList" autocomplete="off">
        <datalist id="nameHistList"></datalist>
      </div>
      <div class="ds-grid">
        <div class="ds-field">
          <label>納期</label>
          <input type="date" id="jobDeadline" onkeydown="enterNext(event,'jobWorker')" oninput="saveSettings()">
        </div>
        <div class="ds-field">
          <label>メモ</label>
          <input type="text" id="jobWorker" onkeydown="enterNext(event,'pl0')" oninput="saveSettings()">
        </div>
      </div>
    </div>
  </div>

  <!-- 在庫定尺 -->
  <div class="ds-section">
    <div class="ds-sec-head" onclick="toggleSection('stockBody','stockToggleBtn','var(--br)')">
      <div class="ds-title" style="margin-bottom:0;border-bottom:none;flex:1">在庫定尺</div>
      <span id="stockToggleBtn" class="ds-toggle-icon">＋</span>
    </div>
    <div style="height:1.5px;background:#f0f0f5;margin:2px 0 8px"></div>
    <div id="stockBody" style="display:none">
      <div id="stkList"></div>
      <div style="font-size:10px;color:#8888a8;margin-top:3px">☑ 対象　右=上限本数</div>
    </div>
  </div>

  <!-- 手持ち残材 -->
  <div class="ds-section">
    <div class="ds-sec-head" onclick="toggleSection('remnantBody','remnantToggleBtn','var(--cy)');updateInvDropdown()">
      <div class="ds-title" style="margin-bottom:0;border-bottom:none;flex:1">手持ち残材</div>
      <span id="remnantToggleBtn" class="ds-toggle-icon">＋</span>
    </div>
    <div style="height:1.5px;background:#f0f0f5;margin:2px 0 8px"></div>
    <div id="remnantBody" style="display:none">
      <div id="invDropCont" style="display:block;margin-bottom:8px;padding:8px;background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.2);border-radius:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span id="invBadge" style="font-size:10px;font-weight:700;color:var(--cy);background:rgba(34,211,238,.12);padding:2px 8px;border-radius:20px;border:1px solid var(--cy)">在庫 0本</span>
        </div>
        <div class="remnant-inventory-picker">
          <select id="invSelect" style="flex:1;font-size:11px;background:#f8f8fc;border:1px solid #d4d4dc;color:#2a2a3e;border-radius:6px;padding:4px 6px">
            <option value="">── 在庫から残材に追加 ──</option>
          </select>
          <button id="invUseBtn" onclick="addFromInventory()" style="font-size:11px;padding:5px 10px;background:transparent;color:#16a34a;border:1.5px solid #16a34a;border-radius:8px;cursor:pointer;font-weight:700;white-space:nowrap;font-family:inherit;transition:all .15s">＋ 計算に使う</button>
        </div>
      </div>
      <div class="remnant-area">
        <div class="remnant-head">
          <span>計算に使う残材</span>
        </div>
        <div id="remnantList"></div>
      </div>
    </div>
  </div>

  <!-- オプション（トグルスイッチ） -->
  <div class="ds-toggle-area">
    <div class="ds-toggle-row" onclick="document.getElementById('useKuiku').click()">
      <div class="ds-toggle-label">
        <span>工区を入力する</span>
        <small>チェックで部材リストに工区欄が表示されます</small>
      </div>
      <label class="ds-tog" onclick="event.stopPropagation()">
        <input type="checkbox" id="useKuiku" onchange="saveSettings()">
        <span class="ds-tog-track"></span>
      </label>
    </div>
    <div class="ds-toggle-row" onclick="document.getElementById('noAutoRegister').click()">
      <div class="ds-toggle-label">
        <span>印刷時に在庫登録しない</span>
        <small>印刷・カート追加時に端材が自動登録されません</small>
      </div>
      <label class="ds-tog" onclick="event.stopPropagation()">
        <input type="checkbox" id="noAutoRegister" onchange="saveSettings()">
        <span class="ds-tog-track"></span>
      </label>
    </div>
  </div>

</div>
```

---

## グローバルデザインルール（今後すべての変更に適用）

- **細い紫の枠（focus ring / box-shadow）は全廃する** — `box-shadow: 0 0 0 Xpx rgba(109,40,217,...)` はどこにも使わない
- **input / select / textarea にフォーカスまたはホバーした際は、背景を薄紫（#faf5ff）にするだけ** — border-color の変化・outline・box-shadow はすべて不要。枠線の色は変えない
- **セクションの開閉はヘッダーバー全体をタップして行う** — ＋ボタンだけ当たり判定にしない
- これらのルールはこのファイル以外の変更でも必ず守ること

---

## 注意事項

- `id="blade"`, `id="endloss"`, `id="minRemnantLen"`, `id="jobClient"`, `id="jobName"`, `id="jobDeadline"`, `id="jobWorker"`, `id="stkList"`, `id="remnantList"`, `id="invSelect"`, `id="invBadge"`, `id="invDropCont"`, `id="useKuiku"`, `id="noAutoRegister"` — これらのIDは**変更禁止**
- `settingBody`, `jobBody`, `stockBody`, `remnantBody` の折りたたみ動作（`toggleSection()`）はそのまま維持
- `saveSettings()`, `enterNext()`, `updateInvDropdown()`, `addFromInventory()` など既存関数は呼び出しをそのまま維持
- 他のタブ（基本タブ `id="sbPanel1"`）は**一切触らない**
- style.cssの既存クラス（`.shd`, `.field`, `.r2`, `.stk-row`など）は**変更しない**
