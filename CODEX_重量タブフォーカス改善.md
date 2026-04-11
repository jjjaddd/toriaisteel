# 重量タブ フォーカス改善 実装指示

## 対象ファイル
- `weight.js`

---

## 変更① wInit — タブを開いた時に鋼材検索欄へ自動フォーカス

`wInit()` 関数末尾（`// メモ入力チェックマーク` コメントの直前）に追記する。

**変更前：**
```js
  }

  // メモ入力チェックマーク
}
```

**変更後：**
```js
  }

  // 重量タブを開いた時は鋼材検索欄にフォーカス
  setTimeout(function() {
    var cmdInput = document.getElementById('wCmdInput');
    if (cmdInput) cmdInput.focus();
  }, 80);

  // メモ入力チェックマーク
}
```

---

## 変更② wToggleOpt — チップをONにした瞬間にその入力欄へフォーカス

**変更前：**
```js
function wToggleOpt(opt) {
  _wOpts[opt] = !_wOpts[opt];
  var chip = document.getElementById('wChip_' + opt);
  if (chip) chip.classList.toggle('w-opt-chip--on', _wOpts[opt]);
  var panel = document.getElementById('wPanel_' + opt);
  if (panel) panel.style.display = _wOpts[opt] ? '' : 'none';
  // チップOFF時は値をクリア
  if (!_wOpts[opt]) {
    if (opt === 'price') { var pe  = document.getElementById('wPrice');      if (pe)  pe.value  = ''; }
    if (opt === 'name')  { var me  = document.getElementById('wMemo');       if (me)  me.value  = ''; }
    if (opt === 'kuiku') { var ke  = document.getElementById('wKuiku');      if (ke)  ke.value  = ''; }
    if (opt === 'paint') { var ppe = document.getElementById('wPaintPrice'); if (ppe) ppe.value = ''; }
    if (opt === 'rev')   { wClearReverse(); }
  }
}
```

**変更後：**
```js
function wToggleOpt(opt) {
  _wOpts[opt] = !_wOpts[opt];
  var chip = document.getElementById('wChip_' + opt);
  if (chip) chip.classList.toggle('w-opt-chip--on', _wOpts[opt]);
  var panel = document.getElementById('wPanel_' + opt);
  if (panel) panel.style.display = _wOpts[opt] ? '' : 'none';

  if (_wOpts[opt]) {
    // チップON → その欄にフォーカス
    var focusMap = {
      price: 'wPrice',
      name:  'wMemo',
      kuiku: 'wKuiku',
      paint: 'wPaintPrice',
      rev:   'wRevKg'
    };
    var focusId = focusMap[opt];
    if (focusId) {
      setTimeout(function() {
        var el = document.getElementById(focusId);
        if (el) el.focus();
      }, 30);
    }
  } else {
    // チップOFF → 値をクリア
    if (opt === 'price') { var pe  = document.getElementById('wPrice');      if (pe)  pe.value  = ''; }
    if (opt === 'name')  { var me  = document.getElementById('wMemo');       if (me)  me.value  = ''; }
    if (opt === 'kuiku') { var ke  = document.getElementById('wKuiku');      if (ke)  ke.value  = ''; }
    if (opt === 'paint') { var ppe = document.getElementById('wPaintPrice'); if (ppe) ppe.value = ''; }
    if (opt === 'rev')   { wClearReverse(); }
  }
}
```

---

## 動作仕様

- 重量タブを開く（`wInit()` が呼ばれる）→ 鋼材検索欄（`wCmdInput`）に自動フォーカス、そのまま鋼材名を打ち込める
- `[単価]` チップをクリック → 単価入力欄（`wPrice`）に即フォーカス
- `[部材名]` チップをクリック → 部材名入力欄（`wMemo`）に即フォーカス
- `[工区]` チップをクリック → 工区入力欄（`wKuiku`）に即フォーカス
- `[塗装単価]` チップをクリック → 塗装単価入力欄（`wPaintPrice`）に即フォーカス
- `[⇄ 逆算]` チップをクリック → 目標重量入力欄（`wRevKg`）に即フォーカス
- チップをOFFにした場合は値をクリア（フォーカスは移動しない）

## 注意事項

- `setTimeout` の遅延は panel の `display:none → ''` 切り替えが完了してからフォーカスするため必要
- `tabindex="-1"` の要素も `el.focus()` による programmatic フォーカスは有効なので問題なし
- 他ページは一切変更しない
