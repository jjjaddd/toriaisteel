# 外枠・プレースホルダーUI実装指示

## 対象ファイル
- `index.html`
- `main.js`
- `style.css`（追記のみ）

---

## 概要

まだ実装されていない機能の「外枠だけ」を先に作る。  
中身は空でよいが、「まだ使えない」ことがひひと見てわかるデザインにする。

---

## style.css に追記するスタイル

```css
/* ── 準備中バッジ ── */
.wip-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #ea580c;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  letter-spacing: .04em;
  vertical-align: middle;
  margin-left: 6px;
}

/* ── 準備中セクション（薄く・操作不可） ── */
.wip-block {
  opacity: 0.45;
  pointer-events: none;
  user-select: none;
  position: relative;
}
.wip-block::after {
  content: '準備中';
  position: absolute;
  top: 8px;
  right: 8px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #ea580c;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}

/* ── 準備中カード（データページ・重量ページ用） ── */
.wip-card {
  border: 1.5px dashed #e0e0ea;
  border-radius: 12px;
  padding: 16px 14px;
  margin-bottom: 10px;
  position: relative;
  background: #fafafa;
}
.wip-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.wip-card-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f0f0f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
.wip-card-title {
  font-size: 13px;
  font-weight: 700;
  color: #aaa;
}
.wip-card-desc {
  font-size: 11px;
  color: #bbb;
  line-height: 1.6;
  padding-left: 40px;
}
```

---

## 変更①：ナビゲーションに「データ」タブを追加

### index.html の変更

`<nav>` 内の「重量」と「お問い合わせ」の間に追加：

```html
<a id="nd" onclick="goPage('data')">データ</a>
```

---

## 変更②：データページ（`id="dpp"`）を追加

`id="wpp"` の `</div>` の直後（重量ページの終わり）に追加：

```html
<!-- データページ -->
<div id="dpp" class="pg">
  <div style="max-width:480px;margin:0 auto;padding:24px 16px">

    <div style="margin-bottom:24px">
      <div style="font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:4px">データ</div>
      <div style="font-size:12px;color:#aaa">鋼材規格辞書・断面性能・市中材情報</div>
    </div>

    <!-- 鋼材規格検索 -->
    <div class="wip-card">
      <div class="wip-card-head">
        <div class="wip-card-icon">📖</div>
        <div class="wip-card-title">鋼材規格辞書<span class="wip-badge">🚧 準備中</span></div>
      </div>
      <div class="wip-card-desc">種類・規格名でJIS規格を即検索。H形鋼・山形鋼・溝形鋼・平鋼・丸鋼に対応。</div>
    </div>

    <!-- 断面性能 -->
    <div class="wip-card">
      <div class="wip-card-head">
        <div class="wip-card-icon">📐</div>
        <div class="wip-card-title">断面性能表示<span class="wip-badge">🚧 準備中</span></div>
      </div>
      <div class="wip-card-desc">Ix・Zx・Iy・Zy・断面積を表示。設計者・施工管理者も使えるデータに。</div>
    </div>

    <!-- 塗装面積 -->
    <div class="wip-card">
      <div class="wip-card-head">
        <div class="wip-card-icon">🎨</div>
        <div class="wip-card-title">塗装面積（m²/m）<span class="wip-badge">🚧 準備中</span></div>
      </div>
      <div class="wip-card-desc">断面周長から塗装面積を自動計算。積算・見積もりにそのまま使える。</div>
    </div>

    <!-- 市中材情報 -->
    <div class="wip-card">
      <div class="wip-card-head">
        <div class="wip-card-icon">🏭</div>
        <div class="wip-card-title">市中材・流通情報<span class="wip-badge">🚧 準備中</span></div>
      </div>
      <div class="wip-card-desc">地域別・時系列での流通状況を共有。浦安鉄鋼団地の情報から種まき予定。</div>
    </div>

  </div>
</div>
```

---

## 変更③：goPage() に 'data' を追加

`main.js` の `goPage()` 関数内に以下を追加（`} else {` の前に挿入）：

```js
} else if (p === 'data') {
  var dpp = document.getElementById('dpp');
  var nd  = document.getElementById('nd');
  if (dpp) dpp.classList.add('show');
  if (nd)  nd.classList.add('active');
  // nav リセットに 'nd' も追加する（下記も変更）
```

また、`goPage()` 冒頭の nav リセット配列に `'nd'` を追加：

```js
['na','nhi','nw','nd'].forEach(function(id){
```

---

## 変更④：重量ページにCO₂・逆算プレースホルダーを追加

重量ページ（`id="wpp"`）のサイドバー（`<aside class="sb">`）内、  
`<button onclick="wClearAll()"` の後、`<p style="font-size:10px` の前に追加：

```html
<!-- CO₂排出量（準備中） -->
<div class="wip-card" style="margin-top:10px">
  <div class="wip-card-head">
    <div class="wip-card-icon">🌱</div>
    <div class="wip-card-title" style="font-size:12px">CO₂排出量<span class="wip-badge">🚧 準備中</span></div>
  </div>
  <div class="wip-card-desc">重量×排出係数でCO₂量を自動表示。カーボンフットプリント対応。</div>
</div>

<!-- 重量逆算（準備中） -->
<div class="wip-card">
  <div class="wip-card-head">
    <div class="wip-card-icon">🔄</div>
    <div class="wip-card-title" style="font-size:12px">重量逆算<span class="wip-badge">🚧 準備中</span></div>
  </div>
  <div class="wip-card-desc">目標重量→必要本数を逆算。発注数量の確認に。</div>
</div>
```

---

## 変更⑤：計算ページのカーボンフットプリントに「準備中」を追加

計算ページの計算結果エリア内に、カーボンフットプリント（CO₂）の表示セルがある場合、  
その要素に `class="wip-block"` を追加する。または該当箇所に以下を追加：

計算結果の `id="rp"` エリア（`<main class="mn" id="rp">`）の中、  
部材合計重量 `id="totkg"` の近くに以下を追加（まだなければ）：

```html
<div class="wip-card" style="margin:8px 0">
  <div class="wip-card-head">
    <div class="wip-card-icon">🌱</div>
    <div class="wip-card-title" style="font-size:12px">CO₂排出量<span class="wip-badge">🚧 準備中</span></div>
  </div>
  <div class="wip-card-desc">重量をもとにCO₂排出量を自動計算します（近日実装）。</div>
</div>
```

---

## 変更⑥：詳細設定タブの未実装チェックボックスに「準備中」バッジを追加

`id="sbPanel2"` 内のトグルスイッチ2つに `.wip-block` を追加する。  
ただし、見た目だけ薄くする（IDとonchangeはそのまま維持）。

**工区を入力する** のトグル行：
```html
<div class="ds-toggle-row wip-block" ...>
```

**印刷時に在庫登録しない** のトグル行：
```html
<div class="ds-toggle-row wip-block" ...>
```

---

## 変更⑦：ヘッダーにダークモードトグルを追加（準備中）

`<nav>` タグの閉じタグ `</nav>` の直前（カートバッジの前）に追加：

```html
<button
  title="ダークモード（準備中）"
  style="background:none;border:none;cursor:not-allowed;font-size:18px;opacity:0.35;padding:4px 6px;position:relative"
  onclick="alert('ダークモードは近日実装予定です！')"
>🌙</button>
```

---

## 注意事項

- 既存ページ（計算・履歴・在庫・重量・お問い合わせ）の**動作は一切変えない**
- `wip-block` クラスはビジュアルのみ。IDとイベントハンドラはそのまま
- データページ（`id="dpp"`）の中身は今後別途実装するため、現時点では上記カードのみでOK
- `style.css` の既存スタイルは変更しない（追記のみ）
