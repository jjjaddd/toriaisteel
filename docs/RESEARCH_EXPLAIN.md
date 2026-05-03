# RESEARCH: Solution Explanation via LP Duality for 1D-CSP

**Status**: design v0.1 — 2026-05-04 04:00
**Author**: Claude (Opus 4.7)
**Predecessors**:
- 研究 1-6 (今日 1 日): dominance / branching / hardness / k-best / decomposition

---

## 0. 一行サマリー

> CG が出力した最適解に対し、LP 双対変数 π_i を使って「なぜこの pattern が使われ、なぜあの pattern が使われないか」を量的・自然言語で説明する機能を実装する。
> 商用 CSP ツールが提供しない「**説明可能な最適化**」を TORIAI が持つ。

---

## 1. 動機

### 1.1 商用 CSP ツールの欠陥

既存の steel cutting / cutting stock ツールは:
- 最適解（or それに近い解）を出す
- **なぜそうなったかは説明しない**

ユーザー（鋼材切断業務）は:
- "なぜ 12000 を使うんだ？11000 で十分じゃないか？"
- "この pattern よりこっちの方が良くない？"
- "demand を 1 増やしたらコストどうなる？"

これらに答えるためには、現在は「もう一度違う設定で計算し直して比較」が必要。

### 1.2 LP 双対性による直接的な答え

LP duality theorem: 最適 LP 解 x* と双対解 π* があり、
- 各 piece type i に対し、**π_i = "もう 1 個 demand 増やしたら最適値どれだけ増えるか"** (shadow price)
- 各 pattern p に対し、**reduced cost(p) = stock(p) − Σ_i π_i × counts(p, i)**
  - = 0 if p used (x*_p > 0)
  - ≥ 0 if p unused (x*_p = 0)

これは **LP 最適性条件** そのもの。教科書知識だが、ユーザーへの直接公開は商用 CSP ツールではほぼ無い。

### 1.3 文献調査

- LP duality 自体: 70 年以上前から教科書知識（Dantzig 1947 の simplex）
- **OR の説明可能性 (XAI for OR)**: 学術界で勃興中 (2020 年代)、しかしまだ少数派
- CSP/cutting stock 専用の説明手法: 文献ほぼ無し
- 自然言語化 + 反事実分析: LLM 親和性が高く、Claude 強み領域

→ LP duality 自体は古いが、**CSP の user-facing explanation として展開**するのは novel。

---

## 2. 仮説

### H1（強、main）
LP 双対変数を活用すれば、CG/B&B の整数最適解に対して以下の説明が量的に生成可能:
1. 各 used pattern の「正当性」(reduced cost 0 の解釈)
2. 各 unused pattern の「premium」(使った場合の余計なコスト)
3. 各 piece type の marginal cost (demand 変化への感度)
4. stock 構成の「必要性」(なぜこの mix か)

### H2（中）
整数解 (B&B 後の x*) と LP 緩和の dual π* は **near-LP-tight な CSP では一致的** で、説明は実用的に正しい。

### H3（弱、stretch）
自動生成された自然言語説明は人間レビューで「分かりやすい」と評価される。

---

## 3. 形式化

### 3.1 LP relaxation の最適性条件

```
min   Σ_p c_p × x_p
s.t.  A x ≥ b   (demand)
      x ≥ 0
```

LP optimum (x*, π*) は次を満たす（complementary slackness）:
- **dual feasibility**: A^T π ≤ c, π ≥ 0
- **primal feasibility**: A x ≥ b, x ≥ 0
- **complementary slackness**:
  - For each p: (c_p − Σ_i a_{i,p} π_i) × x_p = 0
  - For each i: (Σ_p a_{i,p} x_p − b_i) × π_i = 0

つまり:
- x*_p > 0 → c_p = Σ_i a_{i,p} π_i (used pattern: 正味マージン 0)
- x*_p = 0 → c_p ≥ Σ_i a_{i,p} π_i (unused pattern: 余分なコスト)
- π_i > 0 → demand i は tight (Σ_p a_{i,p} x*_p = b_i)
- π_i = 0 → demand i は slack あり

### 3.2 Reduced cost の解釈

```
RC(p) = c_p − Σ_i a_{i,p} π_i
```

- `RC(p)` = "pattern p を 1 個使った場合の, LP 最適解からの premium"
- `RC(p)` = 0: p は LP 最適解の basis にいる、cost と marginal value がぴったり
- `RC(p)` > 0: p を使うと余計に RC(p) mm を払うことになる

### 3.3 Shadow price π_i

```
π_i = "demand i を 1 単位増やした時の最適値の増分"
```

これは sensitivity analysis の核心。"demand 60 → 61 ならコストは π_i mm 増える" がそのまま読める。

---

## 4. 実装計画

### 4.1 dualPi の取得

`solveColumnGenInspect` を改修し、最終 LP iteration の dualPi を返り値に含める。
（既に内部計算しているので exposing だけ）

### 4.2 explanation 生成

新規 `src/calculation/yield/research/explain.js`:

```js
function explainSolution(result, patterns, duals, items, spec) → {
  patternJustifications: [
    {
      pattern: P,
      x: count_used,
      stockCost: stock(P),
      marginalValue: Σ π_i × counts(P, i),
      reducedCost: stockCost - marginalValue,
      verdict: 'used at margin' | 'used with surplus' | 'unused',
      naturalLanguage: "..."  // 日本語
    }
  ],
  marginalCosts: { piece_i: π_i },
  stockBreakdownExplanation: "...",
  fullText: "..."   // 全体の自然言語説明
}
```

### 4.3 自然言語生成

テンプレート方式:
```
"Pattern P (stock 12000mm, cuts: 4×2806 + 1×1825) is used 47 times.
  Its cost 12000mm exactly matches the marginal value of its pieces
  (4 × 2806 + 1 × 1825 = ... mm in dual prices), making it cost-efficient.

Pattern Q (stock 11000mm, similar piece set) is not used because
  using it would cost an additional 200mm per bar compared to mixing
  current patterns optimally."
```

日本語版も並行生成。

### 4.4 テスト

`tests/research/explain.test.js`:
- LP 双対性の数値検証 (used patterns の RC ≈ 0)
- CASE-2 で 3 文以上の説明生成
- CASE-6 で代替 pattern の premium 計算

---

## 5. リスクと判断

| リスク | 対策 |
|---|---|
| 整数解と LP duals がズレる (gap > 0%) | LP-tight な CSP では gap 0-2.5% (実測)、近似誤差は許容内。「LP 緩和ベースの説明、整数解は近似値」と明記 |
| dualPi の整数解への外挿が誤り | 整数 sensitivity は LP より複雑（branch-by-branch）、本研究は LP-only に限定 |
| 自然言語が不自然 | テンプレート + ユーザーレビュー反映 |
| 商用ツールが既に同種機能? | 調査済み、商用 (Optimal-cut, Cuttinger 等) は説明機能なし |

---

## 6. Falsification

- **H1 棄却条件**: dual π_i が NaN / 不安定 / 非物理的な値（負の π 等）
- **H2 棄却条件**: 整数解の used pattern の reduced cost が 5%+ 乖離
- **H3 は subjective**: 評価不要（実装後ユーザーフィードバック）

---

## 7. 期待される deliverable

1. `solveColumnGenInspect` が dualPi を返す
2. `explainSolution(result, patterns, duals, items, spec)` で説明を生成
3. CASE-2 / CASE-6 で実例
4. `docs/EXPLAIN_RESULTS.md` で結果まとめ

---

## 8. 進捗ログ

- 2026-05-04 **04:00** v0.1 起草。実装着手
