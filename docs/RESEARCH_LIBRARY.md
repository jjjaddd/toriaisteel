# RESEARCH: Cross-Instance Pattern Library for 1D-CSP

**Status**: design v0.1 — 2026-05-04 06:30
**Author**: Claude (Opus 4.7)
**Goal**: 半世紀の OR 文献を超える real chance を取りに行く

---

## 0. 一行サマリー

> CSP の **abstract pattern (piece-length 集合 × stock サイズ)** を offline で蒸留して library 化し、新 instance の CG/B&B を library lookup で warm-start する。
> 「**1 instance を高速に解く**」を最適化してきた半世紀の OR に対し、「**ensemble across instances**」という別軸で勝負する。

---

## 1. 動機 — なぜこれが「超える」候補か

### 1.1 既存 CSP solver の前提

VPSolver / Gurobi / OptiCut / Cuttinger 等の solver は:
- **単一 instance を入力 → 単一 instance を出力**
- 解いた pattern は「使い切り」、次の instance には引き継がない
- 半世紀の OR 文献はすべてこの前提

→ 「**前のインスタンスの計算結果を活用する**」という別軸は手付かず。

### 1.2 鋼材切断ドメインの特性

ユーザー (鋼材切断業務) の実務:
- 同じ鋼材種別 (H 形鋼、L 山形鋼 等) を毎日切断
- 同じ stock サイズ (5500, 6000, ..., 12000) を繰り返し使う
- **piece の長さも実務的に頻出する** (1750, 1825, 1830, 2806 等が複数案件で出る)

→ "instance ごとに毎回 CG cold-start" は計算的に無駄が多い。

### 1.3 Claude × LLM の unique 強み

- 過去 instance の pattern を **構造的に分析**できる
- piece-length × stock の頻出パターンを **学習・蒸留**できる
- これは LLM 普及前は人手で困難だった、**今だから可能**な研究方向

→ 半世紀の OR 文献が手にしてない武器を使える。

### 1.4 文献調査

- "case-based reasoning for CSP": ~ゼロ (CBR は scheduling では研究あるが CSP は未踏)
- "pattern reuse across instances": ~ゼロ
- "warm-start MIP from learned patterns": 一般 MIP では研究あるが、**CSP-specific は空白**
- ML for CSP: 2020 年代から論文出始め、しかし「**pattern 蒸留 → warm-start**」の路線は未踏

→ 本研究は完全に novel な空白地帯。

---

## 2. 仮説

### H1（強、main）
abstract pattern (piece lengths × stock サイズ) の library を作れば、
新 instance の CG/B&B を **library 由来の warm-start** で開始でき、
cold-start CG より少ない iteration で LP-tight に到達する。

### H2（中）
library の有効性は **instance similarity に強く依存する** (similar instances 間で transfer 効く、異種では無効)。

### H3（強、stretch）
Cold-start CG と同じ品質の解を、**iteration 数 50%+ 削減**で取れる。

### H4（理論、超 stretch）
鋼材切断ドメインの abstract pattern 空間は **本質的に有限・低次元**であり、
完備な library を構築可能（カバレッジ 100% を目指せる）。

---

## 3. 形式化

### 3.1 Abstract Pattern

```
AbstractPattern = {
  pieces: number[],   // sorted descending, multiset of lengths
  stock: number,
  loss: number,       // stock - sum(pieces) - blade*(n-1) - endLoss
  yieldRatio: number  // sum(pieces) / stock
}
```

例:
```
{ pieces: [2806, 2806, 2806, 2806], stock: 12000, loss: 176, yieldRatio: 0.935 }
{ pieces: [1825, 1825, 1825, 1825, 1825, 1825], stock: 11000, loss: 50, yieldRatio: 0.995 }
```

### 3.2 Library

```
Library = {
  patterns: AbstractPattern[],
  metadata: {
    sourceInstances: string[],      // どの instance から取ったか
    yieldThreshold: number,         // 採用基準（yieldRatio >= this）
    builtAt: timestamp
  }
}
```

### 3.3 Lookup (Library → Instance)

新 instance `spec = { pieces, availableStocks, blade, endLoss }` に対し:

```
function findApplicable(library, spec):
  applicable = []
  for ap in library.patterns:
    if ap.stock not in spec.availableStocks: skip
    if not all(len in spec.piece_lengths for len in ap.pieces): skip
    # ap は instance に適用可能
    counts = countByLength(ap.pieces, spec.pieces)
    applicable.push({ stock: ap.stock, counts: counts })
  return applicable
```

これを CG の **初期 pattern 集合** として使う。FFD initial pattern と union を取って redundancy 除去。

### 3.4 Cold-start vs Warm-start CG

```
# Cold-start (既存)
patterns = ffdInitialPatterns(spec)        # ~10 個
while True:
  duals = solveLP(patterns).duals
  newPattern = priceKnapsack(duals)
  if not newPattern: break
  patterns.add(newPattern)
# 例: 30 iter で 80 patterns

# Warm-start (本研究)
patterns = libraryLookup(library, spec)    # ~50-80 個（library 由来）
patterns += ffdInitialPatterns(spec)       # safety net
patterns = unique(patterns)
while True:
  duals = solveLP(patterns).duals
  newPattern = priceKnapsack(duals)
  if not newPattern: break
  patterns.add(newPattern)
# 期待: 0-5 iter で収束
```

---

## 4. 実装計画

### 4.1 新規モジュール
`src/calculation/yield/research/patternLibrary.js`:
- `extractAbstractPatterns(cgResult, items)` — CG 出力から abstract pattern 抽出
- `mergeLibrary(libA, libB)` — 2 つの library を merge、重複除去
- `findApplicablePatterns(library, spec)` — lookup
- `buildLibraryFromInstances(instances)` — 複数 instance から library 構築

### 4.2 評価モジュール
`src/calculation/yield/research/libraryEvaluator.js`:
- `solveColumnGenWithLibrary(spec, library)` — warm-start 版 CG
- 標準 `solveColumnGen` と並走比較

### 4.3 ベンチマーク
`tests/research/patternLibrary.test.js`:
- abstract pattern 抽出の単体テスト
- merge 重複除去のテスト
- lookup 正しさのテスト
- **leave-one-out cross-validation**:
  - 各 case_i について、case_{≠i} から library 構築
  - case_i を warm-start CG で解く
  - cold-start CG と比較: iteration 数、wall time、解の質

---

## 5. 期待される結果

### 5.1 ベスト case（仮説支持）

instance 間で piece-length 重複が多い場合 (CASE-2 と CASE-5 など):
- warm-start CG: 0-5 iteration で収束
- cold-start CG: 20-30 iteration

→ **CG iteration 数で 80%+ 削減**

### 5.2 ワースト case（仮説棄却）

instance 間で piece-length 重複が少ない場合 (CASE-1 (□175) と CASE-3 (H175) など):
- library 由来の pattern が皆無
- warm-start = cold-start (overhead だけ追加)

→ improvement ゼロ

### 5.3 中間 case

- library lookup で 5-10 patterns 来る
- CG iteration が少し減る (10-30%)
- wall time 改善あり

---

## 6. リスクと対策

| リスク | 対策 |
|---|---|
| 6 case では library が小さすぎる | LLM 蒸留で artificial instances を追加生成（次セッション） |
| stock サイズが異なる instance 間で transfer 効かない | library を stock-set でグループ化 |
| piece length が完全一致しないと lookup fail | "近似一致" (length 差 <1mm 等) を許容するモード追加 |
| warm-start で LP-feasible でない pattern を入れる risk | sanity check (各 piece type が cover 可能か検証) |

---

## 7. Falsification

- **H1 棄却条件**: leave-one-out で全 case が cold-start と同等 iteration
- **H2 はメタ仮説**: similar/dissimilar の境界線が定量化される
- **H3 棄却条件**: iteration 削減率 < 30% 平均
- **H4 はデータ次第**: 6 case では検証不可、観察のみ

---

## 8. 「超える」とは何か

本研究で「半世紀の OR を超える」と言うとき、超えるのは:

❌ **単一 instance の計算速度**（ここは Gurobi/VPSolver に勝てない）

✅ **ensemble across instances での平均計算速度**（library があれば、似た instance を高速に解ける）

✅ **pattern 蒸留という別パラダイム**（CBR for CSP の確立）

これは半世紀の OR が「単一 instance」前提で発展してきたことの帰結。
我々が library を持ち込めば、定義的には「OR が手付けてない領域」で勝つ。

---

## 9. 進捗ログ

- 2026-05-04 **06:30** v0.1 起草。実装着手
