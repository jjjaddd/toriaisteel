# CODEX指示: ヘッダー ☰ 設定メニュー実装

## 概要
ヘッダー右端の「カート 0件」ボタンのさらに右に ☰ ボタンを追加し、クリックでドロップダウンメニューを表示する。メニュー内には ダークモード・エクスポート・インポート・バージョン管理・使い方・お問い合わせ を格納する。既存のレイアウト・機能には一切手を加えない。

---

## 1. index.html の変更

### 1-1. ヘッダー右端に ☰ ボタンを追加

現在のヘッダー右側にある `id="cartBtn"`（カートボタン）の直後に以下を追加する。

```html
<!-- ☰ 設定メニューボタン -->
<div id="hamBtn" class="ham-btn" onclick="hamToggle()">
  <span class="ham-line"></span>
  <span class="ham-line"></span>
  <span class="ham-line"></span>
</div>

<!-- 設定ドロップダウン -->
<div id="hamMenu" class="ham-menu">

  <!-- 表示 -->
  <div class="hm-section">
    <div class="hm-row" onclick="hamDarkMode()">
      <span class="hm-txt">ダークモード</span>
      <span class="hm-tog" id="dmToggle"></span>
    </div>
  </div>

  <!-- データ -->
  <div class="hm-section">
    <div class="hm-row" onclick="hamExport()">
      <span class="hm-txt">データ書き出し</span>
      <span class="hm-arr">›</span>
    </div>
    <div class="hm-row" onclick="hamImport()">
      <span class="hm-txt">データ読み込み</span>
      <span class="hm-arr">›</span>
    </div>
    <div class="hm-row" onclick="hamVersion()">
      <span class="hm-txt">バージョン管理</span>
      <span class="hm-ver" id="hamVerLabel">v1.0.0</span>
    </div>
  </div>

  <!-- ヘルプ -->
  <div class="hm-section">
    <div class="hm-row" onclick="hamGuide()">
      <span class="hm-txt">使い方ガイド</span>
      <span class="hm-arr">›</span>
    </div>
    <div class="hm-row" onclick="goPage('contact')">
      <span class="hm-txt">お問い合わせ</span>
      <span class="hm-arr">›</span>
    </div>
  </div>

</div><!-- /hamMenu -->

<!-- 外クリック閉じ用オーバーレイ -->
<div id="hamOverlay" class="ham-overlay" onclick="hamClose()"></div>
```

**配置の注意**: `id="hamBtn"` と `id="hamMenu"` と `id="hamOverlay"` は、カートボタンの入っている親要素（ヘッダー右端のコンテナ）の中に追加する。カートボタン自体には触らない。

---

## 2. style.css の変更

末尾に以下を追加する。

```css
/* ═══════════════════════════
   ☰ 設定メニュー
═══════════════════════════ */

/* ボタン本体 */
.ham-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .15s;
}
.ham-btn:hover {
  background: #faf5ff;
}
.ham-btn.open {
  background: #ede9fe;
}
.ham-line {
  display: block;
  width: 14px;
  height: 2px;
  background: #6b7280;
  border-radius: 1px;
}

/* ドロップダウン */
.ham-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  background: #fff;
  border: 1px solid #ede9fe;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(109,40,217,.08), 0 2px 8px rgba(0,0,0,.05);
  overflow: hidden;
  z-index: 500;
  /* 初期状態: 非表示 */
  opacity: 0;
  pointer-events: none;
  transform: translateY(-8px) scale(.97);
  transform-origin: top right;
  transition: opacity .18s, transform .18s cubic-bezier(.32,.72,0,1);
}
.ham-menu.show {
  opacity: 1;
  pointer-events: all;
  transform: translateY(0) scale(1);
}

/* セクション区切り */
.hm-section {
  padding: 6px 0;
}
.hm-section + .hm-section {
  border-top: 1px solid #f5f3ff;
}

/* 行 */
.hm-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
  cursor: pointer;
  transition: background .1s;
}
.hm-row:hover {
  background: #faf5ff;
}
.hm-txt {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}
.hm-arr {
  font-size: 14px;
  color: #c4b5fd;
}
.hm-ver {
  font-size: 11px;
  color: #a78bfa;
}

/* ダークモードトグル */
.hm-tog {
  display: inline-block;
  width: 34px;
  height: 19px;
  background: #ede9fe;
  border-radius: 10px;
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
  transition: background .2s;
}
.hm-tog.on {
  background: #8b5cf6;
}
.hm-tog::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 15px;
  height: 15px;
  background: #fff;
  border-radius: 8px;
  transition: transform .2s;
  box-shadow: 0 1px 3px rgba(0,0,0,.15);
}
.hm-tog.on::after {
  transform: translateX(15px);
}

/* 外クリック閉じオーバーレイ */
.ham-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 499;
}
.ham-overlay.show {
  display: block;
}
```

---

## 3. main.js の変更

### 3-1. ヘッダーの親要素に `position:relative` が必要
ヘッダー右端のコンテナ（カートボタンを囲むdiv）に `style="position:relative"` を追加するか、CSSで `position: relative` を付与する。

### 3-2. 以下の関数を main.js に追加

```javascript
/* ═══════════════════════════
   ☰ 設定メニュー
═══════════════════════════ */
let _hamOpen = false;
let _dmOn = false;

function hamToggle() {
  _hamOpen ? hamClose() : hamOpen();
}

function hamOpen() {
  _hamOpen = true;
  document.getElementById('hamBtn').classList.add('open');
  document.getElementById('hamMenu').classList.add('show');
  document.getElementById('hamOverlay').classList.add('show');
}

function hamClose() {
  _hamOpen = false;
  document.getElementById('hamBtn').classList.remove('open');
  document.getElementById('hamMenu').classList.remove('show');
  document.getElementById('hamOverlay').classList.remove('show');
}

/* ダークモード（側だけ・将来実装） */
function hamDarkMode() {
  _dmOn = !_dmOn;
  document.getElementById('dmToggle').classList.toggle('on', _dmOn);
  // TODO: ダークモード実装時にここに処理を追加
}

/* エクスポート（側だけ・将来実装） */
function hamExport() {
  hamClose();
  alert('データ書き出し機能は準備中です');
}

/* インポート（側だけ・将来実装） */
function hamImport() {
  hamClose();
  alert('データ読み込み機能は準備中です');
}

/* バージョン管理（側だけ・将来実装） */
function hamVersion() {
  hamClose();
  alert('バージョン管理機能は準備中です');
}

/* 使い方ガイド（側だけ・将来実装） */
function hamGuide() {
  hamClose();
  alert('使い方ガイドは準備中です');
}
```

---

## 4. 変更ファイルまとめ

| ファイル | 操作 | 内容 |
|---|---|---|
| `index.html` | **変更** | カートボタン直後に `#hamBtn`, `#hamMenu`, `#hamOverlay` を追加 |
| `style.css` | **追加** | `.ham-btn`, `.ham-menu`, `.hm-*`, `.ham-overlay` の CSS |
| `main.js` | **追加** | `hamToggle()`, `hamOpen()`, `hamClose()`, `hamDarkMode()` 等 |

---

## 注意事項
- 既存のカートボタン・ナビタブ・サイドバー・計算ロジックには一切手を加えない
- メニュー内に絵文字アイコンは使用しない（テキストのみ）
- ボタン・ホバーは薄紫（`#faf5ff` / `#ede9fe`）のみ。ソリッドな紫は使わない
- エクスポート・インポート・バージョン管理・使い方の各機能は **alert で「準備中」** と表示するだけでよい（中身は将来実装）
- お問い合わせは既存の `goPage('contact')` を呼ぶ
- `hamClose()` 後も `goPage()` は正常に動作する（z-index の干渉なし）
