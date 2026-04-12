# CODEX指示書 — 統合リファクタリング Phase 1: データ構造一本化

## 概要

現在 `calc.js` の `var STEEL` と `data.js` の `SECTION_DATA` に分かれている鋼材データを
`SECTION_DATA` 一本に統合する。`STEEL` は `data.js` 末尾で `SECTION_DATA` から自動再構築する。

## 前提確認（作業開始前に実行）

```bash
cd /path/to/toriai
node --check data.js && node --check calc.js && node --check weight.js && echo "BASELINE OK"
git stash  # 念のためバックアップ
```

---

## Phase 1-A: data.js — SECTION_DATA 構造整理

### 作業方法
**必ずPythonスクリプトで変更すること。EditツールやWriteツールは使わない（ファイル破損リスク）。**
各ステップ後に `node --check data.js` を実行し、エラーがあれば即停止・修正すること。

---

### Step 1: JBCR385 を削除

`data.js` から以下を削除：
1. `const JBCR385_DATA = [...]` 定数（ブロックごと）
2. `SECTION_DATA['JBCR385'] = { ... }` ブロック（`};` まで）

```python
import re
with open('data.js','r',encoding='utf-8') as f: content = f.read()

# JBCR385_DATA 定数を削除
content = re.sub(r'\nconst JBCR385_DATA\s*=\s*\[[\s\S]*?\];\n', '\n', content)

# SECTION_DATA['JBCR385'] ブロックを削除
content = re.sub(r"\nSECTION_DATA\['JBCR385'\]\s*=\s*\{[\s\S]*?\};\n", '\n', content)

with open('data.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check data.js`

---

### Step 2: 溝形鋼 spec名を市中材名に統一

`CHANNEL_DATA` のspec `name` フィールドを JIS 4次元名 → 市中材3次元名へ変更。
具体的には `×t2` 部分を name から削除する（t2値はフィールドに残す）。

変更マッピング（全16件）：
```
'C-75×40×5×7'       → 'C-75×40×5'
'C-100×50×5×7.5'    → 'C-100×50×5'
'C-125×65×6×8'      → 'C-125×65×6'
'C-150×75×6.5×10'   → 'C-150×75×6.5'
'C-150×75×9×12.5'   → 'C-150×75×9'
'C-180×75×7×10.5'   → 'C-180×75×7'
'C-200×80×7.5×11'   → 'C-200×80×7.5'
'C-200×90×8×13.5'   → 'C-200×90×8'
'C-250×90×9×13'     → 'C-250×90×9'
'C-250×90×11×14.5'  → 'C-250×90×11'
'C-300×90×9×13'     → 'C-300×90×9'
'C-300×90×10×15.5'  → 'C-300×90×10'
'C-300×90×12×16'    → 'C-300×90×12'
'C-380×100×10.5×16' → 'C-380×100×10.5'
'C-380×100×13×16.5' → 'C-380×100×13'
'C-380×100×13×20'   → (このspecはSTEELにない市中流通なしサイズ — 削除 or 保持 どちらでも可)
```

```python
import re
with open('data.js','r',encoding='utf-8') as f: content = f.read()

# CHANNEL_DATA内のname: 'C-×××...' から最後の×t2部分を削除
def fix_channel_name(m):
    name = m.group(1)
    # C-H×B×t1×t2 → C-H×B×t1 (×数値 最後の部分を削除)
    new_name = re.sub(r'×[\d.]+$', '', name)
    return f"name:'{new_name}'"

# CHANNEL_DATA ブロック内のnameだけを変換
m = re.search(r'(const CHANNEL_DATA\s*=\s*\[)([\s\S]*?)(\];)', content)
if m:
    fixed = re.sub(r"name:'(C-[^']+)'", fix_channel_name, m.group(2))
    content = content[:m.start()] + m.group(1) + fixed + m.group(3) + content[m.end():]

with open('data.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check data.js`

---

### Step 3: I形鋼 spec名を市中材名に統一

`I_BEAM_DATA` の `name` フィールドを JIS 4次元名 → 市中材名へ変更。
市中材名は `I-H×tw×B` フォーマット（STEEL準拠）。

変更マッピング（全19件）：
```
'I-100×75×5×8'       → 'I-100×5×75'
'I-125×75×5.5×9.5'   → 'I-125×5.5×75'
'I-150×75×5.5×9.5'   → 'I-150×5.5×75'
'I-150×125×8.5×14'   → 'I-150×8.5×125'
'I-180×100×6×10'     → 'I-180×6×100'
'I-200×100×7×11'     → 'I-200×7×100'
'I-230×90×7×11'      → 'I-230×7×90'
'I-250×125×7.5×12.5' → 'I-250×7.5×125'
'I-300×150×8×14'     → 'I-300×8×150'
'I-350×150×9×15'     → 'I-350×9×150'
'I-400×150×10×16'    → 'I-400×10×150'
'I-450×175×11×18'    → 'I-450×11×175'
'I-500×180×12×19'    → 'I-500×12×180'
'I-550×200×12×20'    → 'I-550×12×200'
'I-600×200×12×20'    → 'I-600×12×200'
'I-200×150×8×12'     → (市中流通なし — 保持でも削除でも可)
'I-300×150×9×14'     → (市中流通なし — 保持でも削除でも可)
'I-400×150×11×16'    → (市中流通なし — 保持でも削除でも可)
'I-450×150×11×17'    → (市中流通なし — 保持でも削除でも可)
```

```python
import re
with open('data.js','r',encoding='utf-8') as f: content = f.read()

# name: 'I-H×B×t1×t2' → name: 'I-H×t1×B'
def fix_ibeam_name(m):
    name = m.group(1)
    # Parse I-H×B×t1×t2
    parts = re.match(r'I-([\d.]+)×([\d.]+)×([\d.]+)×([\d.]+)', name)
    if parts:
        H, B, t1, t2 = parts.groups()
        return f"name:'I-{H}×{t1}×{B}'"
    return m.group(0)

m = re.search(r'(const I_BEAM_DATA\s*=\s*\[)([\s\S]*?)(\];)', content)
if m:
    fixed = re.sub(r"name:'(I-[^']+)'", fix_ibeam_name, m.group(2))
    content = content[:m.start()] + m.group(1) + fixed + m.group(3) + content[m.end():]

with open('data.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check data.js`

---

### Step 4: `軽量C形鋼` キーを `C形鋼` に改名

`SECTION_DATA['軽量C形鋼']` → `SECTION_DATA['C形鋼']`
`C_CHANNEL_DATA` 内の spec name のセパレータ `x` → `×` に統一。

```python
import re
with open('data.js','r',encoding='utf-8') as f: content = f.read()

# キー名変更
content = content.replace("SECTION_DATA['軽量C形鋼']", "SECTION_DATA['C形鋼']")

# C_CHANNEL_DATA の name: 'C-250x75x25x4.5' → 'C-250×75×25×4.5'
m = re.search(r'(const C_CHANNEL_DATA\s*=\s*\[)([\s\S]*?)(\];)', content)
if m:
    def fix_c_name(nm):
        # replace x separators with × (only between digits)
        name = nm.group(1)
        name = re.sub(r'(\d)x(\d)', r'\1×\2', name)
        return f"name:'{name}'"
    fixed = re.sub(r"name:'(C-[^']+)'", fix_c_name, m.group(2))
    content = content[:m.start()] + m.group(1) + fixed + m.group(3) + content[m.end():]

with open('data.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check data.js`

---

### Step 5: H形鋼 市中材のみスペックを追加

以下の5件がSTEELにはあるがSECTION_DATAにない（市中材）。
`H_SHAPES_JIS_ADD_2` の直後に新しい配列 `H_SHAPES_MARKET` を追加し、
`SECTION_DATA['H形鋼'].specs` にスプレッドで追加する。

追加する5件（W値のみ、断面性能は後日入力）：
```
'H-294×200×8×12'  W:55.8
'H-298×149×5.5×8' W:32.0
'H-340×250×9×14'  W:78.1
'H-346×174×6×9'   W:41.2
'H-400×400×13×21' W:172.0
```

```python
import re
with open('data.js','r',encoding='utf-8') as f: content = f.read()

MARKET_ARRAY = """
const H_SHAPES_MARKET = [
  { name:'H-294×200×8×12',  W:55.8 },
  { name:'H-298×149×5.5×8', W:32.0 },
  { name:'H-340×250×9×14',  W:78.1 },
  { name:'H-346×174×6×9',   W:41.2 },
  { name:'H-400×400×13×21', W:172.0 }
];
"""

# H_SHAPES_JIS_ADD_2の直後に挿入
content = re.sub(
    r'(const H_SHAPES_JIS_ADD_2\s*=\s*\[[\s\S]*?\];)',
    r'\1' + MARKET_ARRAY,
    content
)

# SECTION_DATA['H形鋼'].specs に追加
content = re.sub(
    r"(SECTION_DATA\['H形鋼'\]\.specs\s*=\s*\[[\s\S]*?)(\.\.\.H_SHAPES_JIS_ADD_2)",
    r'\1...H_SHAPES_JIS_ADD_2,\n  ...H_SHAPES_MARKET',
    content
)

with open('data.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check data.js`

---

### Step 6: 等辺山形鋼 市中材のみスペックを追加

以下5件がSTEELにあってSECTION_DATAにない（市中材）。
`SECTION_DATA['山形鋼']` の specs 末尾に追加する。

```
{ name:'L-20×20×3',   W:0.885 },
{ name:'L-30×30×5',   W:2.16 },
{ name:'L-75×75×6',   W:6.85 },
{ name:'L-130×130×9', W:17.90 },
{ name:'L-200×200×15',W:45.30 },
```

```python
import re
with open('data.js','r',encoding='utf-8') as f: content = f.read()

EXTRA_L = """    { name:'L-20×20×3',    W:0.885 },
    { name:'L-30×30×5',    W:2.16 },
    { name:'L-75×75×6',    W:6.85 },
    { name:'L-130×130×9',  W:17.90 },
    { name:'L-200×200×15', W:45.30 }
"""

# 山形鋼 specs の末尾（ } ]; の直前）に追加
m = re.search(
    r"(SECTION_DATA\['山形鋼'\]\s*=\s*\{[\s\S]*?specs:\s*\[)([\s\S]*?)(\s*\]\s*\};)",
    content
)
if m:
    content = content[:m.start()] + m.group(1) + m.group(2) + ',\n' + EXTRA_L + m.group(3) + content[m.end():]

with open('data.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check data.js`

---

### Step 7: 角パイプ系カテゴリを統合

#### 統合方針
- 削除: `SECTION_DATA['角パイプ（正方形）']`, `SECTION_DATA['角パイプ（長方形）']`
- 削除: `const SQUARE_PIPE_DATA`, `const SQUARE_PIPE_DATA_REST`, `const RECT_PIPE_DATA`
- 追加: `SECTION_DATA['角パイプ']` (type: 'SQUARE_PIPE')

新しい `角パイプ` は以下の specs を結合：
1. `SQUARE_PIPE_DATA` + `SQUARE_PIPE_DATA_REST`（正方形JIS、断面性能あり）
2. `RECT_PIPE_DATA`（長方形JIS、断面性能あり）
3. STEEL `中径角パイプ（正方形）`（市中材、W値のみ、セパレータp-）
4. STEEL `中径角パイプ（長方形）`（市中材、W値のみ）
5. STEEL `エコノミー角`（市中材、W値のみ）

各specに `shape: 'square'` または `shape: 'rect'` フィールドを追加。
`inCalc: true` = 計算・重量タブに表示、`inCalc: false` = データタブのみ。

JIS spec（□プレフィックス）は `inCalc: false`（JIS参照用）。
市中材spec（p-プレフィックス）は `inCalc: true`。

まず STEEL から中径角パイプのデータを抜き出して定数として data.js に追加する。
次に新しい `SECTION_DATA['角パイプ']` を定義する。

```python
import re

with open('calc.js','r','utf-8') as f: calc = f.read()
with open('data.js','r','utf-8') as f: content = f.read()

# calc.jsから中径・エコノミー角のスペックを抽出
def extract_steel(text, key):
    esc = re.escape(key)
    m = re.search(r"'" + esc + r"':\[(.*?)\](?=\s*,\s*'|\s*\n\})", text, re.DOTALL)
    if not m: return []
    return re.findall(r"\['([^']+)',\s*([\d.]+)\]", m.group(1))

sq = extract_steel(calc, '中径角パイプ（正方形）')
rect = extract_steel(calc, '中径角パイプ（長方形）')
eco = extract_steel(calc, 'エコノミー角')

def to_spec_lines(specs, shape):
    lines = []
    for name,w in specs:
        lines.append(f"  {{ name:'{name}', shape:'{shape}', W:{w}, inCalc:true }}")
    return ',\n'.join(lines)

market_array = f"""
const SQUARE_PIPE_MARKET = [
{to_spec_lines(sq, 'square')}
];
const RECT_PIPE_MARKET = [
{to_spec_lines(rect, 'rect')}
];
const ECONOMY_PIPE_DATA = [
{to_spec_lines(eco, 'rect')}
];
"""

# 既存の角パイプ系定数の後に追加（RECT_PIPE_DATAの後）
content = re.sub(
    r'(const RECT_PIPE_DATA\s*=\s*\[[\s\S]*?\];)',
    r'\1' + market_array,
    content
)

# 既存 SECTION_DATA['角パイプ（正方形）'] と ['角パイプ（長方形）'] を削除
content = re.sub(
    r"\nSECTION_DATA\['角パイプ（正方形）'\]\s*=\s*\{[\s\S]*?\};\n",
    '\n', content
)
content = re.sub(
    r"\nSECTION_DATA\['角パイプ（長方形）'\]\s*=\s*\{[\s\S]*?\};\n",
    '\n', content
)

# 新しい統合エントリを追加（SGP配管の直前に挿入）
NEW_ENTRY = """
SECTION_DATA['角パイプ'] = {
  type: 'SQUARE_PIPE',
  label: '角パイプ',
  showInCalc: true,
  jis: 'JIS G 3466',
  jisSub: 'Square/Rectangular steel tube',
  specs: [
    ...SQUARE_PIPE_DATA.map(function(s){ return Object.assign({shape:'square',inCalc:false},s); }),
    ...SQUARE_PIPE_DATA_REST.map(function(s){ return Object.assign({shape:'square',inCalc:false},s); }),
    ...RECT_PIPE_DATA.map(function(s){ return Object.assign({shape:'rect',inCalc:false},s); }),
    ...SQUARE_PIPE_MARKET,
    ...RECT_PIPE_MARKET,
    ...ECONOMY_PIPE_DATA
  ]
};

"""

content = re.sub(
    r"(\nSECTION_DATA\['SGP配管'\])",
    NEW_ENTRY + r'\1',
    content
)

with open('data.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check data.js`

---

### Step 8: スモール角パイプ を統合

STEEL の スモール（正方形/長方形）+ スーパー（正方形/長方形）を結合して
新しい `SECTION_DATA['スモール角パイプ']` を作成（W値のみ、断面性能は後日）。

```python
import re

with open('calc.js','r',encoding='utf-8') as f: calc = f.read()
with open('data.js','r',encoding='utf-8') as f: content = f.read()

def extract_steel(text, key):
    esc = re.escape(key)
    m = re.search(r"'" + esc + r"':\[(.*?)\](?=\s*,\s*'|\s*\n\})", text, re.DOTALL)
    if not m: return []
    return re.findall(r"\['([^']+)',\s*([\d.]+)\]", m.group(1))

small_sq  = extract_steel(calc, 'スモール角パイプ（正方形）')
small_rect= extract_steel(calc, 'スモール角パイプ（長方形）')
super_sq  = extract_steel(calc, 'スーパー角パイプ（正方形）')
super_rect= extract_steel(calc, 'スーパー角パイプ（長方形）')

def specs_js(specs, shape):
    return ',\n'.join(f"  {{ name:'{n}', shape:'{shape}', W:{w}, inCalc:true }}" for n,w in specs)

NEW_ENTRY = f"""
SECTION_DATA['スモール角パイプ'] = {{
  type: 'SQUARE_PIPE',
  label: 'スモール・スーパー角パイプ',
  showInCalc: true,
  jis: '',
  jisSub: 'Small/Super square & rectangular steel tube',
  specs: [
{specs_js(small_sq,  'square')},
{specs_js(small_rect,'rect')},
{specs_js(super_sq,  'square')},
{specs_js(super_rect,'rect')}
  ]
}};

"""

# 角パイプの後、SGP配管の前に挿入
content = re.sub(
    r"(\nSECTION_DATA\['SGP配管'\])",
    NEW_ENTRY + r'\1',
    content
)

with open('data.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check data.js`

---

### Step 9: 軽量溝形鋼 を SECTION_DATA に追加

STEEL にある `軽量溝形鋼`（32件、`[-40×20×1.6` 〜 `[-450×75×6.0`）は
現在 SECTION_DATA にないため新規追加。W値のみ（断面性能は後日）。

```python
import re

with open('calc.js','r',encoding='utf-8') as f: calc = f.read()
with open('data.js','r',encoding='utf-8') as f: content = f.read()

def extract_steel(text, key):
    esc = re.escape(key)
    m = re.search(r"'" + esc + r"':\[(.*?)\](?=\s*,\s*'|\s*\n\})", text, re.DOTALL)
    if not m: return []
    return re.findall(r"\['([^']+)',\s*([\d.]+)\]", m.group(1))

lc = extract_steel(calc, '軽量溝形鋼')
specs_js = ',\n'.join(f"  {{ name:'{n}', W:{w} }}" for n,w in lc)

NEW_ENTRY = f"""
SECTION_DATA['軽量溝形鋼'] = {{
  type: 'LGC',
  label: '軽量溝形鋼',
  showInCalc: true,
  jis: 'JIS G 3350',
  jisSub: 'Light gauge steel channel',
  specs: [
{specs_js}
  ]
}};

"""

# C形鋼の後に挿入
content = re.sub(
    r"(\nSECTION_DATA\['I形鋼'\])",
    NEW_ENTRY + r'\1',
    content
)

with open('data.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check data.js`

---

### Step 10: 各 SECTION_DATA エントリに `showInCalc` と `calcKey` を追加

```python
import re
with open('data.js','r',encoding='utf-8') as f: content = f.read()

# showInCalc と calcKey の追加マッピング
# format: (key, showInCalc, calcKey_or_None)
MAPPINGS = [
    ('H形鋼',           True,  None),
    ('山形鋼',          True,  '等辺山形鋼'),
    ('不等辺山形鋼',    True,  None),
    ('不等辺不等厚山形鋼', False, None),
    ('溝形鋼',          True,  None),
    ('C形鋼',           True,  None),
    ('軽量溝形鋼',      True,  None),   # Step9で追加済
    ('I形鋼',           True,  None),
    ('平鋼',            True,  None),
    ('丸鋼',            True,  None),
    ('角鋼',            False, None),
    ('角パイプ',        True,  None),   # Step7で追加済（すでにshowInCalc:trueあり）
    ('スモール角パイプ',True,  None),   # Step8で追加済（すでにshowInCalc:trueあり）
    ('SGP配管',         False, None),
    ('BCR295',          False, None),
]

for key, show, calc_key in MAPPINGS:
    esc = re.escape(key)
    # すでに showInCalc がある場合はスキップ
    if f"SECTION_DATA['{key}'] = {{\n  showInCalc" in content:
        continue
    show_str = 'true' if show else 'false'
    # type: の後に showInCalc を挿入
    if calc_key:
        insert = f"  showInCalc: {show_str},\n  calcKey: '{calc_key}',"
    else:
        insert = f"  showInCalc: {show_str},"
    content = re.sub(
        r"(SECTION_DATA\['" + esc + r"'\]\s*=\s*\{\n  type:)",
        r'\1',  # typeはそのまま
        content
    )
    # typeの行の後に挿入
    content = re.sub(
        r"(SECTION_DATA\['" + esc + r"'\]\s*=\s*\{\n  type:\s*'[^']*',)",
        lambda m: m.group(0) + f"\n  showInCalc: {show_str}," + (f"\n  calcKey: '{calc_key}'," if calc_key else ""),
        content
    )

with open('data.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check data.js`

---

### Step 11: getDataKindOrder() の preferred 配列を更新

```python
import re
with open('data.js','r',encoding='utf-8') as f: content = f.read()

NEW_PREFERRED = "  const preferred = ['H形鋼', '山形鋼', '不等辺山形鋼', '不等辺不等厚山形鋼', '溝形鋼', 'C形鋼', '軽量溝形鋼', 'I形鋼', '平鋼', '丸鋼', '角鋼', '角パイプ', 'スモール角パイプ', 'BCR295', 'SGP配管', '丸パイプ'];"

content = re.sub(
    r"  const preferred = \[.*?\];",
    NEW_PREFERRED,
    content
)

with open('data.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check data.js`

---

### Step 12: data.js 末尾で STEEL を SECTION_DATA から再構築

**重要**: `calc.js` が先に読み込まれ `var STEEL = {...}` を定義。
`data.js` は後から読み込まれるため、末尾でSTEELを上書きできる。

data.js の最末尾（`});` の後など、ファイルの最後）に以下を追加：

```python
import re
with open('data.js','r',encoding='utf-8') as f: content = f.read()

REBUILD_STEEL = """
// ===== STEEL を SECTION_DATA から再構築 =====
// calc.js で定義された STEEL をここで上書きする
// （data.js は calc.js より後に読み込まれるため可能）
(function rebuildSTEEL() {
  if (typeof STEEL === 'undefined' || typeof SECTION_DATA === 'undefined') return;

  // 既存キーを全削除
  Object.keys(STEEL).forEach(function(k) { delete STEEL[k]; });

  var order = getDataKindOrder();

  order.forEach(function(key) {
    var entry = SECTION_DATA[key];
    if (!entry || !entry.showInCalc) return;

    var calcKey = entry.calcKey || key;

    // inCalc フィールドがある場合はそれでフィルタ、ない場合は全spec
    var specs = (entry.specs || []).filter(function(s) {
      if (s.inCalc === false) return false;
      return s.W != null && s.W > 0;
    });

    if (specs.length > 0) {
      STEEL[calcKey] = specs.map(function(s) { return [s.name, s.W]; });
    }
  });

  console.log('[TORIAI] STEEL rebuilt from SECTION_DATA:', Object.keys(STEEL));
})();
"""

content = content.rstrip() + '\n' + REBUILD_STEEL + '\n'

with open('data.js','w',encoding='utf-8') as f: f.write(content)
```

確認: `node --check data.js`

---

## Phase 1-B の確認スクリプト

全ステップ完了後に実行：

```bash
node --check data.js && node --check calc.js && node --check weight.js && echo "ALL OK"
```

ブラウザでの動作確認：
1. 計算タブ → 鋼材選択ドロップダウンに「等辺山形鋼」「角パイプ」「スモール角パイプ」が表示される
2. 重量タブ → 同様の鋼材が検索できる
3. データタブ → 溝形鋼が `C-100×50×5` で表示される（×7.5なし）
4. コンソールに `[TORIAI] STEEL rebuilt from SECTION_DATA:` が表示される

---

## 注意事項

- **絶対にWriteツールで data.js 全体を上書きしない** → 必ずPythonで差分編集
- 各ステップ後に `node --check data.js` を確認し、エラー時は即停止
- エラーが出た場合: `git checkout data.js` でリセット後、問題のステップを修正して再実行
- `SQUARE_PIPE_DATA`, `RECT_PIPE_DATA` の定数は削除しない（角パイプ統合後もspreads参照が残るため）
