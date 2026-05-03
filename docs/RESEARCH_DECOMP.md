# RESEARCH: CSP の Compatibility-Graph Decomposition

**Status**: design v0.1 — 2026-05-04 02:00
**Author**: Claude (Opus 4.7)
**Predecessors**:
- `RESEARCH_KBEST.md` — k-best 多様解列挙（成功）
- `RESEARCH_HARDNESS.md` — instance feature 予測（棄却）
- `RESEARCH_BB_ALGEBRA.md` — algebra-guided branching（棄却 + 配線成功）
- `RESEARCH_DOMINANCE.md` — pattern dominance pre-solve（棄却）

---

## 0. 一行サマリー

> CSP の piece set を **compatibility graph** で分析し、連結成分が分かれていれば独立サブ問題に分解して並行に解く。
> 6 ケースで graph 構造を測定し、decomposition が現実の CSP で適用可能かを実証する。

---

## 1. 動機

### 1.1 今日の研究線における位置

研究 5 連敗 + 1 勝（k-best）の中、まだ手をつけてない切り口:
- 「algebra → 性能向上」は CG が先回りで全敗
- 「algebra → 機能拡張」(k-best) で勝った
- **「algebra → 構造分解」** はどっちでもなく、未踏

CSP の **マクロ構造**（pieces 全体の関係）を algebra で分析すれば、CG が解こうとする問題自体を **小さい部分問題に分割**できるのでは？

### 1.2 文献調査

- 一般 MIP の Dantzig-Wolfe 分解、Benders 分解: 既存
- CSP 専用の **piece-level decomposition**: ほぼ無い（Carvalho 1999 の Arc-Flow は graph 構造だが分解目的ではない）
- **Algebra-derived compatibility**: ゼロ件

→ 形式的 novelty。実用的 effectiveness は未知。

### 1.3 直感

CASE-3 (H175) の pieces: `[2292×2, 2792×20, 6744×2, 7244×20]`
- 6744 と 7244 は同じ bar に入らない（合計 14000 > stock 12000）
- 2292 と 2792 は同じ bar に入る
- → 「短尺グループ {2292, 2792}」と「長尺グループ {6744, 7244}」が独立かもしれない

CASE-6 (L65) の pieces: 62 種類、長さ 1142-2855（全て stock 5500+ に楽勝で入る）
- → おそらく全部 1 つのグループ（高密度 coupled）

仮説: CASE-3 系（長尺/短尺の階層性あり）は分解効く、CASE-6 系（似た長さ群）は分解効かない。

---

## 2. 仮説

### H1（弱、main）
1D-CSP の piece set を「compatibility graph」(同じ pattern に co-occur 可能性で edge を張る) で分析すると、**多くの実 instance で連結成分が複数できる**。

### H2（中、natural extension）
各成分を独立に solveColumnGen で解いて結果を merge することで、**全体を一括で解くより速くなる**（or 同等品質で並列可能）。

### H3（強、stretch）
分解可能な instance では **整数最適性が保たれる**（成分間で patterns が share されないので独立解の和が global optimal）。

---

## 3. 形式化

### 3.1 Compatibility Graph

ノード: piece type i ∈ {1, ..., k}
エッジ: (i, j) ∈ E ⇔ ∃ valid pattern P that uses both pieces i and j

「valid pattern」の定義:
```
exists stock s ∈ availableStocks such that
  len(i) + len(j) + 2*blade + 2*endLoss ≤ s
```

つまり: 最小限「i, j を 1 個ずつ stocks のいずれかに入れられるか」。
これは algebra R5 の「stock-down dominance」とは独立な、純構造的判定。

### 3.2 連結成分

graph G = (V, E) の connected components C_1, ..., C_q を求める。
各 C_l は piece types の subset。

### 3.3 サブ問題

成分 C_l 上のサブ CSP:
```
subSpec_l = {
  pieces: { (length, count) : piece i ∈ C_l }
  availableStocks: same as original
  blade, endLoss: same
}
```

各 subSpec_l を独立に solveColumnGen → bars_l。

### 3.4 統合

```
finalBars = ∪_l bars_l
finalCost = Σ_l cost_l
```

H3 が成立すれば finalCost = global optimal cost。

### 3.5 算法的 invariance

> **Lemma (構造的)**: piece i, j が compatibility graph で隣接していなければ、最適解で同じ bar に i, j が co-occur することはない。

証明: 隣接してない ⇔ どんな stock にも 1 個ずつ入らない ⇔ 同じ bar に入れる pattern が存在しない。

> **Theorem (H3 strong)**: 連結成分 C_1, ..., C_q が disjoint なら、最適 CSP は (各成分の独立最適) の和。

証明: 任意の bar は 1 つの成分の pieces しか含まない（lemma より）。よって total cost = Σ_l (成分 l に使う bar 群の cost)。各成分は独立に最小化可能。 ∎

→ H3 は **graph 構造から自動的に成立**。問題は H1（実際に分解可能 instance があるか）。

---

## 4. 実装計画

### 4.1 新規モジュール
`src/calculation/yield/research/decomposition.js` (純関数 + dual-mode)

API:
```js
function buildCompatibilityGraph(spec) → {
  nodes: number[],         // piece indices
  edges: [number, number][],
  components: number[][]   // 連結成分: [[i1, i2, ...], [j1, ...], ...]
}

function decomposeCsp(spec) → {
  subSpecs: spec[],         // 各成分のサブ問題
  components: number[][]    // どの subSpec がどの piece indices に対応か
}

async function solveDecomposed(spec, opts) → {
  bars: ...,                // merged result
  componentResults: [...]   // 各成分の解
}
```

### 4.2 ベンチマーク
`tests/research/decomposition.test.js`:
- 6 ケース全てで graph 構造を測定（component 数、最大成分サイズ）
- 分解可能なケースで `solveDecomposed` vs `solveColumnGen` を比較
- 整数最適性を検証

---

## 5. リスク

| リスク | 対策 |
|---|---|
| 6 ケース全部 1 成分で分解効果ゼロ | 分解効果なしも valid な発見。文書化 |
| 分解後の sub-spec で CG/B&B が劣化 | sub-spec が小さすぎると CG overhead が支配的。閾値判定 |
| availableStocks 共有で本当に独立か？ | stocks は無限資源として扱う前提。共有しても干渉しない |

---

## 6. Falsification

- **H1 棄却条件**: 6 ケース全て single-component
- **H2 棄却条件**: 分解可能 instance で `solveDecomposed` が `solveColumnGen` より遅い
- **H3 はトリビアル**: lemma より自動的に成立、検証は数値一致確認のみ

---

## 7. 進捗ログ

- 2026-05-04 **02:00** v0.1 起草。実装着手
