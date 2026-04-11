# グローバル focus / hover スタイル統一指示

## 対象ファイル
- `style.css` のみ

---

## 変更ルール（全体共通）

**input・select・textarea にホバーまたはフォーカスした時の仕様：**
- `background: #faf5ff`（薄紫背景）のみ
- `border-color` は変えない（元の色のまま）
- `outline: none`
- `box-shadow: none`

これをサイト全体に適用する。

---

## style.css の変更箇所

### 1. `#cmdInput:focus`
**変更前：**
```css
#cmdInput:focus { border-color:#6d28d9; background:#faf5ff; }
```
**変更後：**
```css
#cmdInput:focus { border-color:inherit; background:#faf5ff; outline:none; box-shadow:none; }
```

---

### 2. `.hi-search-wrap input:focus`
**変更前：**
```css
.hi-search-wrap input:focus { border-color: #6d28d9; background: #faf5ff; }
```
**変更後：**
```css
.hi-search-wrap input:focus { background: #faf5ff; outline: none; box-shadow: none; }
```

---

### 3. グローバル `input:focus,select:focus,textarea:focus`（830行付近）
**変更前：**
```css
input:focus,select:focus,textarea:focus{outline:none !important;border-color:#d4d4dc !important;background:rgba(109,40,217,.06) !important;box-shadow:none !important}
```
**変更後：**
```css
input:focus,select:focus,textarea:focus{outline:none !important;background:#faf5ff !important;box-shadow:none !important}
```

---

### 4. 2026 refresh ブロック内の `input:focus,select:focus,textarea:focus`（1014行付近）
**変更前：**
```css
.tbtn:hover,
.spec-item.on,
.spec-item:hover,
.paste-area,
input:focus,select:focus,textarea:focus{
  border-color:#d4d4dc !important;
  box-shadow:none !important;
}
```
**変更後：**
```css
.tbtn:hover,
.spec-item.on,
.spec-item:hover,
.paste-area,
input:focus,select:focus,textarea:focus{
  box-shadow:none !important;
}
input:focus,select:focus,textarea:focus{
  background:#faf5ff !important;
  outline:none !important;
}
```

---

### 5. `.inv-note-input:focus`（689行付近）
**変更前：**
```css
.inv-note-input:focus{
  border-color:#bfc3d9;
  box-shadow:0 0 0 3px rgba(15,23,42,.05);
}
```
**変更後：**
```css
.inv-note-input:focus{
  background:#faf5ff;
  outline:none;
  box-shadow:none;
}
```

---

### 6. `.stk-mx:focus`（120行付近）
**変更前：**
```css
.stk-mx:focus{border-color:#d4d4dc;background:rgba(109,40,217,.06)}
```
**変更後：**
```css
.stk-mx:focus{background:#faf5ff;outline:none;box-shadow:none}
```

---

### 7. `.paste-area textarea:focus`（163行付近）
**変更前：**
```css
.paste-area textarea:focus{border-color:var(--cy)}
```
**変更後：**
```css
.paste-area textarea:focus{background:#faf5ff;outline:none;box-shadow:none}
```

---

### 8. ナビ・カートのfocusも統一（832行付近）
**変更前：**
```css
.nav-btn:focus,.cart-badge:focus,.tbtn:focus,.cc-btn-add:focus{outline:none;background:rgba(109,40,217,.06)}
```
**変更後：**
```css
.nav-btn:focus,.cart-badge:focus,.tbtn:focus,.cc-btn-add:focus{outline:none;background:#faf5ff}
```

---

### 9. `.pt-row input`（部材行インライン入力）のホバー・フォーカス
`.pt-row input` に以下を追加（なければ追記）：
```css
.pt-row input:hover,
.pt-row input:focus{
  background:#faf5ff;
  outline:none;
  box-shadow:none;
}
```

---

## 注意事項

- style.css 以外のファイルは**変更しない**
- `border-color` を `#6d28d9`（紫）に変えている箇所はすべて**削除または無効化**する
- `:focus` だけでなく `:hover` にも同じ背景色ルールを適用する（ただし `.hi-card:hover` や `.inv-card-new:hover` などカード系のホバーは変更しない）
- `!important` が付いている既存ルールには `!important` を維持する
- style.css 内に他にも `border-color:#6d28d9` や `border-color:var(--br)` が focus/hover 文脈で使われている箇所があれば同様に修正すること
