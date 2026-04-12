# CODEX指示書 — 統合リファクタリング Phase 2: UI改修

## 前提

Phase 1（`CODEX_統合リファクタリング_P1_データ構造.md`）が完了していること。
`node --check data.js` が通っていること。

---

## Phase 2-A: データタブをドロップダウン選択式へ変更

### 背景

現在データタブのカテゴリ選択は横スクロールのボタン（`#dataKindTabs`）。
カテゴリ数が増えたため `<select>` ドロップダウンへ変更する。

### index.html の変更

`<div id="dataKindTabs">` を `<select>` に変更する。

現在の HTML（data page 内の tabs 部分、`id="dpp"` ページ内）：
```html
<div id="dataKindTabs" class="dk-tabs-wrap"><!-- ボタンがJSで生成される --></div>
```

変更後：
```html
<select id="dataKindSelect" class="data-kind-select" onchange="setDataKind(this.value)">
  <!-- optionはJSで生成 -->
</select>
```

```python
import re
with open('index.html','r',encoding='utf-8') as f: content = f.read()

# dataKindTabs div を select に置換
content = re.sub(
    r'<div id="dataKindTabs"[^>]*>.*?</div>',
    '<select id="dataKindSelect" class="data-kind-select" onchange="setDataKind(this.value)"></select>',
    content,
    flags=re.DOTALL
)

with open('index.html','w',encoding='utf-8') as f: f.write(content)
```

### data.js の変更 — `renderDataKindTabs()` 関数を書き換え

現在の関数：
```js
function renderDataKindTabs() {
  const wrap = document.getElementById('dataKindTabs');
  if (!wrap) return;
  const allKinds = getDataKindOrder();
  wrap.innerHTML = allKinds.map(k => {
    const isActive = k === _dataKind;
    return `<button class="dk-tab${isActive?' active':''}" onclick="setDataKind('${k}')">${k}</button>`;
  }).join('');
}
```

**書き換え後：**

```python
import re
with open('data.js','r',encoding='utf-8') as f: content = f.read()

OLD_FUNC = re.search(r'function renderDataKindTabs\(\)[\s\S]*?^}', content, re.MULTILINE)

NEW_FUNC = '''function renderDataKindTabs() {
  const sel = document.getElementById('dataKindSelect');
  if (!sel) return;
  const allKinds = getDataKindOrder();
  sel.innerHTML = allKinds.map(k => {
    const label = (SECTION_DATA[k] && SECTION_DATA[k].label) ? SECTION_DATA[k].label : k;
    return `<option value="${k}"${k === _dataKind ? ' selected' : ''}>${label}</option>`;
  }).join('');
}'''

if OLD_FUNC:
    content = content[:OLD_FUNC.start()] + NEW_FUNC + content[OLD_FUNC.end():]

with open('data.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check data.js`

### CSS追加（index.html の `<style>` 内に追加）

```css
.data-kind-select {
  display: block;
  width: 100%;
  max-width: 320px;
  margin: 8px 0 12px 0;
  padding: 10px 14px;
  border: 1.5px solid #d4d4dc;
  border-radius: 10px;
  background: #f8f8fc;
  color: #1a1a2e;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  appearance: auto;
}
.data-kind-select:focus {
  outline: none;
  border-color: #7c6fef;
}
```

```python
import re
with open('index.html','r',encoding='utf-8') as f: content = f.read()

CSS = """
    .data-kind-select {
      display: block;
      width: 100%;
      max-width: 320px;
      margin: 8px 0 12px 0;
      padding: 10px 14px;
      border: 1.5px solid #d4d4dc;
      border-radius: 10px;
      background: #f8f8fc;
      color: #1a1a2e;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      appearance: auto;
    }
    .data-kind-select:focus {
      outline: none;
      border-color: #7c6fef;
    }
"""

# </style> の直前に追加
content = re.sub(r'(</style>)', CSS + r'\1', content, count=1)

with open('index.html','w',encoding='utf-8') as f: f.write(content)
```

---

## Phase 2-B: weight.js — W_PREFIX_MAP 更新

`W_PREFIX_MAP` のカテゴリ名を統合後の名前に合わせる。

現在:
```js
var W_PREFIX_MAP = [
  { prefix: 'fb', kinds: ['平鋼'] },
  { prefix: 'rb', kinds: ['丸鋼'] },
  { prefix: 'rp', kinds: ['スモール角パイプ（正方形）', 'スモール角パイプ（長方形）', 'エコノミー角'] },
  { prefix: 'h',  kinds: ['H形鋼'] },
  { prefix: 'l',  kinds: ['等辺山形鋼', '不等辺山形鋼'] },
  { prefix: 'u',  kinds: ['溝形鋼'] },
  { prefix: 'i',  kinds: ['I形鋼'] },
  { prefix: 'f',  kinds: ['平鋼'] },
  { prefix: 'r',  kinds: ['丸鋼'] },
  { prefix: 'p',  kinds: ['中径角パイプ（正方形）', '中径角パイプ（長方形）', 'スモール角パイプ（正方形）', 'スモール角パイプ（長方形）', 'スーパー角パイプ（正方形）', 'スーパー角パイプ（長方形）', 'エコノミー角'] },
  { prefix: '[',  kinds: ['軽量溝形鋼'] },
  { prefix: 'c',  kinds: ['C形鋼'] }
];
```

変更後（統合後のキー名に更新）：
```js
var W_PREFIX_MAP = [
  { prefix: 'fb', kinds: ['平鋼'] },
  { prefix: 'rb', kinds: ['丸鋼'] },
  { prefix: 'h',  kinds: ['H形鋼'] },
  { prefix: 'l',  kinds: ['等辺山形鋼', '不等辺山形鋼'] },
  { prefix: 'u',  kinds: ['溝形鋼'] },
  { prefix: 'i',  kinds: ['I形鋼'] },
  { prefix: 'f',  kinds: ['平鋼'] },
  { prefix: 'r',  kinds: ['丸鋼'] },
  { prefix: 'p',  kinds: ['角パイプ', 'スモール角パイプ'] },
  { prefix: '[',  kinds: ['軽量溝形鋼'] },
  { prefix: 'c',  kinds: ['C形鋼'] }
];
```

```python
import re
with open('weight.js','r',encoding='utf-8') as f: content = f.read()

NEW_MAP = """var W_PREFIX_MAP = [
  { prefix: 'fb', kinds: ['平鋼'] },
  { prefix: 'rb', kinds: ['丸鋼'] },
  { prefix: 'h',  kinds: ['H形鋼'] },
  { prefix: 'l',  kinds: ['等辺山形鋼', '不等辺山形鋼'] },
  { prefix: 'u',  kinds: ['溝形鋼'] },
  { prefix: 'i',  kinds: ['I形鋼'] },
  { prefix: 'f',  kinds: ['平鋼'] },
  { prefix: 'r',  kinds: ['丸鋼'] },
  { prefix: 'p',  kinds: ['角パイプ', 'スモール角パイプ'] },
  { prefix: '[',  kinds: ['軽量溝形鋼'] },
  { prefix: 'c',  kinds: ['C形鋼'] }
];"""

content = re.sub(
    r'var W_PREFIX_MAP\s*=\s*\[[\s\S]*?\];',
    NEW_MAP,
    content
)

with open('weight.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check weight.js`

---

## Phase 2-C: calc.js — 不要な STEEL カテゴリを削除

Phase 1 完了後、以下の STEEL キーは SECTION_DATA から再構築されるため
calc.js の `var STEEL = {...}` から削除しても良い。
（削除してもdata.js末尾で再構築されるため動作に影響なし）

削除対象キー（統合後不要になるもの）：
- `'中径角パイプ（正方形）'`
- `'中径角パイプ（長方形）'`
- `'スモール角パイプ（正方形）'`
- `'スモール角パイプ（長方形）'`
- `'スーパー角パイプ（正方形）'`
- `'スーパー角パイプ（長方形）'`
- `'エコノミー角'`

これらを削除し、代わりに `'角パイプ'`, `'スモール角パイプ'` はdata.jsで再構築される。

```python
import re
with open('calc.js','r',encoding='utf-8') as f: content = f.read()

REMOVE_KEYS = [
    '中径角パイプ（正方形）',
    '中径角パイプ（長方形）',
    'スモール角パイプ（正方形）',
    'スモール角パイプ（長方形）',
    'スーパー角パイプ（正方形）',
    'スーパー角パイプ（長方形）',
    'エコノミー角',
]

for key in REMOVE_KEYS:
    esc = re.escape(key)
    content = re.sub(
        r"\s*'" + esc + r"':\[[\s\S]*?\](?=\s*[,\n])",
        '',
        content
    )

# trailing comma cleanup
content = re.sub(r',\s*\n(\s*\})', r'\n\1', content)

with open('calc.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check calc.js`

---

## Phase 2-D: データタブ — 角パイプ断面図の対応

`角パイプ` は正方形・長方形が混在するため、spec の `shape` フィールドに基づいて
断面図の描画を分岐させる。

`data.js` の SVG描画ロジック（type: 'SQUARE_PIPE' / 'RECT_PIPE' の分岐箇所）を確認し、
`spec.shape === 'square'` または `spec.shape === 'rect'` で描き分けられるよう修正。

現在の分岐（data.js の renderDataSpec 関数内）：
```js
} else if (kindData.type === 'SQUARE_PIPE' || kindData.type === 'RECT_PIPE') {
  svgEl.innerHTML = drawSquarePipeSVG(...);
}
```

修正後：
```js
} else if (kindData.type === 'SQUARE_PIPE') {
  const isRect = spec.shape === 'rect' || (spec.B && spec.H && spec.B !== spec.H);
  if (isRect) {
    svgEl.innerHTML = drawRectPipeSVG(spec.H, spec.B, spec.t, viewW, viewH);
  } else {
    svgEl.innerHTML = drawSquarePipeSVG(spec.H || spec.a, spec.t, viewW, viewH);
  }
}
```

関数名 `drawSquarePipeSVG`, `drawRectPipeSVG` は既存のSVG関数名に合わせること。
data.js 内で `function draw.*SVG` の一覧を確認してから実装すること。

---

## 最終確認チェックリスト

```bash
node --check data.js
node --check calc.js
node --check weight.js
echo "ALL CHECKS PASSED"
```

ブラウザ確認項目：
1. **計算タブ**: 鋼材種類に `角パイプ`, `スモール角パイプ`, `溝形鋼`, `C形鋼` が表示される
2. **重量タブ**: `p-50×50×1.6` などの角パイプが検索できる。`l` 入力で等辺山形鋼のみ表示
3. **データタブ**: カテゴリ選択が `<select>` ドロップダウンになっている
4. **データタブ**: 溝形鋼 → `C-100×50×5`（t2なし）が表示される
5. **データタブ**: `角パイプ` → JIS（□プレフィックス）と市中材（p-プレフィックス）が混在して表示される
6. **コンソール**: `[TORIAI] STEEL rebuilt from SECTION_DATA:` ログが出る

---

## ロールバック手順

問題が発生した場合：
```bash
git checkout data.js calc.js weight.js index.html
```

---

## 今後の残作業（このPRには含まない）

- 溝形鋼・I形鋼のJIS断面性能データが市中材spec名（3次元名）と対応していることを確認
- 角パイプ（JIS□規格）の断面性能を市中材specに紐付け（jisNameフィールドで対応）
- 不等辺不等厚山形鋼・角鋼・BCR295・SGP配管 の kg/m 値を追加（必要になった時点で）
- 軽量溝形鋼の断面寸法データ（H, B, t 等）の入力
