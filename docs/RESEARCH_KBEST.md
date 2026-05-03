# RESEARCH: Algebraic k-best 多様解列挙 for 1D-CSP

**Status**: design v0.1 — 2026-05-04 00:30
**Author**: Claude (Opus 4.7)
**Predecessors**:
- `RESEARCH_DOMINANCE.md` — pattern dominance pre-solve（棄却）
- `RESEARCH_BB_ALGEBRA.md` — algebra-guided branching（棄却）+ B&B 配線（成功）
- `RESEARCH_HARDNESS.md` — instance feature 予測（棄却）

---

## 0. 一行サマリー

> CG で pattern 集合を確定したあと、MIP に **algebraic no-good cut** を加えて k 個の near-optimal 整数解を列挙する。
> 出力 = TORIAI ユーザー向けに「最適解 + 代替プラン 2〜3 個」を提示できる機能。

---

## 1. 動機

### 1.1 ユーザー文脈

鋼材切断業務で「最適プランは出るが、現実は **手元在庫の制約**で動けないケース」がある:
- 計算上は 6000mm を 44 本使うのが最適だが、6000 が在庫切れで 12000 のみ
- 9000 と 10000 のどっちを優先するかは現場判断

→ **複数の "ほぼ最適" プランを並べて、現場で選べる**ことが価値。

### 1.2 文献調査

- 一般 MIP の k-best: Lawler 1972 の "k-best optimization", Murty 1968 の "k-best assignment"
- CSP 専用の k-best: 文献ほぼなし（CSP は "single optimum" 文化）
- **Algebra-derived diversity** を使う k-best: ゼロ件

→ 本研究の貢献は「CSP に algebra-driven diversity を持ち込んだ k-best」。
小さいが clean な novelty。

### 1.3 今日の研究線における位置づけ

3 連敗で「algebra → 性能向上」直線は尽きた。
代わりに「algebra → 解の質的多様性」という、**性能ではなく機能拡張**の方向。

これは **CG が消すことのない signal**（CG は最適 1 解しか出さないから、複数解を出す枠組み自体が CG の責務外）。
よって algebra signal が消えない条件で勝負できる。

---

## 2. 仮説

### H1（強、main）
適切な no-good cut を加えれば、CG-pattern 上の MIP を反復することで k 個の構造的に異なる near-optimal 解を効率的に列挙できる。

### H2（中、optional）
2 番手以降の解は最適解の数% コスト増以内に収まる（CSP の near-LP-tightness の系）。

### H3（弱、stretch）
Algebra-derived diversity (e.g., R5 等価類) を no-good cut に組み込めば、より「人間にとって意味のある違い」を持つ k-best が得られる。

---

## 3. 形式化

### 3.1 標準 MIP

```
min   Σ_p stock(p) × x_p
s.t.  Σ_p counts(p,i) × x_p ≥ d_i   ∀i
      x_p ∈ ℤ_{≥0}
```

### 3.2 no-good cut (Hamming distance ≥ 1)

過去解 `x*_(prev)` を排除する制約:

```
y_p ≥ x_p - x*_p           ∀p   …(a)
y_p ≥ x*_p - x_p           ∀p   …(b)
Σ_p y_p ≥ 1                     …(c)
y_p ≥ 0                    ∀p
```

ここで `y_p` は `|x_p - x*_p|` の linearization。
`y_p` は連続変数で良い（最適解では integer になる）。

### 3.3 k-best 反復

```
solutions = []
prev_xs = []
patterns = CG(spec)              # 1 回目だけ CG 走らせる

for iter = 1 to k:
  mip_spec = baseMip(patterns)
  for prev in prev_xs:
    mip_spec = addNoGoodCut(mip_spec, prev)

  result = solveMIP(mip_spec)
  if result.status != optimal: break
  if result.objective > solutions[0].objective × (1 + tol): break

  solutions.append(result)
  prev_xs.append(result.x)

return solutions
```

`tol` = コスト許容増分（default 5%）。許容外の解は「もう near-optimal じゃない」と判定して打ち切り。

### 3.4 アルゴリズム性質

- **soundness**: 各反復の解は active no-good cuts により前解と Hamming 距離 1 以上
- **completeness**: 厳密には k-best ではない（diversity が strict だが optimal の同コスト解を取りこぼす可能性）。**near-k-best**
- **計算量**: 1 + (k-1) 回の MIP solve、各回の MIP は前回より 2n+1 制約多い

---

## 4. 実装計画

### 4.1 新規モジュール
`src/calculation/yield/research/kBest.js` (純関数 + dual-mode)

API:
```js
async function solveKBest(spec, k, opts) → [
  { x, objective, bars, status },
  ...
]
```

`opts`:
- `tol`: コスト許容増分（default 0.05 = 5%）
- `bbTimeLimit`: 各反復の B&B 時間制限（default 10s）
- `verbose`: ログ出力

### 4.2 テスト
`tests/research/kBest.test.js`:
- CASE-2 で k=3 を取得、3 解全て LP-tight 442,000 か近傍
- CASE-6 で k=3、ほぼ最適 + 代替プラン 2 つ
- 各解が distinct であることの検証
- tol を超える解は出さないことの検証

---

## 5. リスクと判断

| リスク | 対策 |
|---|---|
| 反復ごとに MIP サイズ膨張 (2n+1 制約 × k) | k=3 程度で打ち切り、許容内 |
| 2 番手以降の解が tol 超 | tol 超なら打ち切り、k 未満で返す |
| no-good cut で MIP infeasible | infeasible なら「これ以上代替なし」で正常終了 |
| HiGHS-WASM が k 反復後に状態劣化 | 既知問題、JS-native B&B が救う設計 |

---

## 6. Falsification

- **H1 棄却条件**: CASE-6 で k=3 が 5 分以内に取れない、or 解が distinct でない
- **H2 棄却条件**: 2 番手の解が最適より 10% 以上コスト高
- **H3**: 今回は試行しない（実装次第で別 phase）

---

## 7. 進捗ログ

- 2026-05-04 **00:30** v0.1 起草。実装開始
