# 重量ページ オプション入力欄のマウス専用化 実装指示

## 対象ファイル
- `index.html`
- `weight.js`

---

## 変更① index.html — オプション入力欄に tabindex="-1" を追加

単価・部材名・工区・逆算の各入力欄をキーボードフォーカス対象から除外する。  
`tabindex="-1"` を付けるとTabキーやEnter後のフォーカス移動で選択されなくなる（マウスクリックでの入力は引き続き可能）。

**対象4つの input に `tabindex="-1"` を追加：**

```html
<input type="number" id="wPrice" placeholder="例：120" min="0" tabindex="-1">

<input type="text" id="wMemo" placeholder="例：柱材、梁材、胴縁など" maxlength="40" tabindex="-1">

<input type="text" id="wKuiku" placeholder="例：A工区" maxlength="20" tabindex="-1">

<input type="number" id="wRevKg" placeholder="例：1000" min="0" tabindex="-1">
```

---

## 変更② weight.js — wSetupEnter の本数Enterに stopPropagation を追加

**変更前：**
```js
  if (qtyEl) {
    qtyEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        wAddRow();
      }
    });
```

**変更後：**
```js
  if (qtyEl) {
    qtyEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        wAddRow();
      }
    });
```

---

## 変更③ weight.js — wAddRow のフォーカス戻しを setTimeout で確実に実行

**変更前：**
```js
  wRenderRows();
  lenEl.focus();
  lenEl.select();
}
```

**変更後：**
```js
  wRenderRows();
  // DOM更新後に確実にフォーカスを長さ欄へ戻す
  setTimeout(function() {
    lenEl.focus();
    lenEl.select();
  }, 0);
}
```

---

## 動作仕様

- キーボードフロー：長さ（Enter）→ 本数（Enter）→ リスト追加 → 長さに戻る（全選択）
- 単価・部材名・工区・逆算はマウスクリックでのみ入力可能。Enterキーやタブキーでは絶対に選択されない
- `tabindex="-1"` により、チップでパネルを開いていても Enter 後のフォーカスがオプション欄へ移らない

## 注意事項

- 他ページ（計算・データ・履歴・在庫）は**一切変更しない**
