# 重量ページ チップUI・入力フロー修正 実装指示

## 対象ファイル
- `style.css`
- `index.html`
- `weight.js`

---

## 変更① style.css — チップのON色を濃い紫から薄いラベンダーに変更

**変更前：**
```css
.w-opt-chip:hover {
  border-color: #c4b5fd;
  color: #6d28d9;
  background: #faf5ff;
}
.w-opt-chip--on {
  border-color: #6d28d9;
  background: #6d28d9;
  color: #fff;
}
.w-opt-chip--on:hover {
  background: #5b21b6;
  border-color: #5b21b6;
  color: #fff;
}
```

**変更後：**
```css
.w-opt-chip:hover {
  border-color: #a78bfa;
  color: #7c3aed;
  background: #faf5ff;
}
.w-opt-chip--on {
  border-color: #a78bfa;
  background: #ede9fe;
  color: #7c3aed;
}
.w-opt-chip--on:hover {
  border-color: #8b5cf6;
  background: #e0d9fb;
  color: #6d28d9;
}
```

---

## 変更② index.html — wLen・wQty にフォーカス時全選択を追加

`id="wLen"` と `id="wQty"` の input 要素に `onfocus="this.select()"` を追加する。

**変更前：**
```html
<input type="number" id="wLen" value="6000" min="1">
```
```html
<input type="number" id="wQty" value="1" min="1">
```

**変更後：**
```html
<input type="number" id="wLen" value="6000" min="1" onfocus="this.select()">
```
```html
<input type="number" id="wQty" value="1" min="1" onfocus="this.select()">
```

---

## 変更③ weight.js — wSetupEnter のEnterフローをメイン2ステップのみに限定

オプションフィールド（単価・部材名・工区・逆算）はマウス操作専用とし、Enterキーのフローに含めない。

**変更前（オプションフィールドにもEnterリスナーを設定していた）：**
```js
  // オプションフィールドも Enter でリストに追加
  ['wPrice', 'wMemo', 'wKuiku', 'wRevKg'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (id === 'wRevKg') {
      el.addEventListener('input', wCalcReverse);
    } else {
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); wAddRow(); }
      });
    }
  });
```

**変更後（逆算欄のinputイベントのみ残し、Enterは削除）：**
```js
  // 逆算欄はinputで即時計算のみ（Enterはキーボードフロー外）
  var revKgEl = document.getElementById('wRevKg');
  if (revKgEl) revKgEl.addEventListener('input', wCalcReverse);
```

---

## 動作仕様

- キーボードフロー：鋼材検索（Enter）→ 長さ入力（Enter）→ 本数入力（Enter）→ 右側にリスト追加・長さ欄に戻る
- 単価・部材名・工区・逆算はチップをクリックして展開し、マウスで入力する（Enterキーのフローに含まれない）
- 長さ・本数の入力欄はフォーカス時に値が全選択されるため、そのまま数字を打てば即上書きできる
- チップON時の色：背景 `#ede9fe`（薄いラベンダー）、文字 `#7c3aed`、ボーダー `#a78bfa`（濃い紫 `#6d28d9` は使用しない）

## 注意事項

- 他ページ（計算・データ・履歴・在庫）は**一切変更しない**
