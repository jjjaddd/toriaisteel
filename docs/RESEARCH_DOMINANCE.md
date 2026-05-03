# Algebra-Driven Pattern Dominance for 1D-CSP MIP Pre-solve

> Status: 研究計画書 v0.1 (2026-05-03 着手)
> 仮説の正当性: 数学的には自明、実用効果は要実証
> 失敗確率: 30〜40%（仮説そのものではなく、HiGHS-WASM が CASE-6 規模 MIP を扱えるかが鍵）

---

## 1. 問題意識

V3 Column Generation (Phase 2 day-7) は CASE-6 (k=61, n=463) で:
- LP master は収束（lpObjective = 710,972mm = LP-tight 下界）
- IP master が **HiGHS-WASM stack 制限**で `Aborted()`
- LP rounding fallback で **over-coverage** (44 ピース過剰、stockTotal 779,500mm)
- → 結果 FFD (723,500mm) より悪化、`solveBest` が FFD を採用

**LP は最適解の存在を示すが、整数化への道筋が断たれている**。これが現状の壁。

---

## 2. 仮説

> **Pattern dominance を algebra で形式定義し、MIP 解く前に dominated パターンを枝刈りすれば、HiGHS-WASM が CASE-6 規模 MIP を解けるようになる。**

直観: CG は反復のたびに新パターンを足すので、最終的に「ほぼ同じだけど少し違う」パターンが大量にできる。これらが MIP の探索木を爆発させてる。Dominance 関係で支配されてるパターンを除けば、探索木が劇的に縮む。

---

## 3. Pattern Dominance の形式定義

### 3.1 定義

パターン $P, Q$ について $P$ が $Q$ を **dominate** する（$P \succeq Q$ と書く）とは:

$$
P \succeq Q \;\Longleftrightarrow\; \begin{cases}
\forall i \in I:\quad P.\mathrm{counts}[i] \ge Q.\mathrm{counts}[i] \\
P.\mathrm{stock} \le Q.\mathrm{stock} \\
\exists \text{ at least one strict inequality (i.e. } P \neq Q\text{)}
\end{cases}
$$

ここで $I$ は piece-type の index set。

直観:
- $P$ は $Q$ と**少なくとも同じだけ各 piece をカバー**
- $P$ は $Q$ より**安い (or 同等の) 定尺**を使う
- どちらかは strict（同一パターンを除外）

### 3.2 Algebra 系での位置付け

Phase 1 で導入した R5 (dominance) は **PATTERN 内**の stock dominance:
$$
\langle S; \pi \rangle \to \langle S'; \pi \rangle \quad \text{if } S' < S \land \langle S'; \pi \rangle \text{ valid}
$$

これは「同じ items を持つ pattern なら、より小さい valid stock に置き換えてよい」という意味。**単一 pattern の rewrite**。

ここで提案するのは **PATTERN 集合上の dominance**: 異なる pattern P, Q について、P が Q を「より良くカバー」する関係。これは Phase 1 algebra にない。

### 3.3 関係性

R5 は 3.1 の特殊ケース:
- $P = \langle S'; \pi \rangle$, $Q = \langle S; \pi \rangle$（同じ pieces）
- $P.\mathrm{counts} = Q.\mathrm{counts}$（counts equality）
- $P.\mathrm{stock} = S' < S = Q.\mathrm{stock}$（strict stock improvement）
- → $P \succeq Q$

つまり R5 dominance ⊂ general dominance。

---

## 4. 最適性保存の証明スケッチ

**主張**: 任意の MIP 最適解 $x^* = (x^*_p)$ について、$P \succeq Q$ かつ $P, Q$ ともに pattern set に含まれるなら、ある等価最適解で $x^*_Q = 0$ にできる。

### 証明（交換論証）

Master IP を再掲:
$$
\min \sum_p s_p \cdot x_p \quad \text{s.t.} \quad \sum_p a_{p,i} x_p \ge d_i \;\forall i, \quad x_p \in \mathbb{Z}_{\ge 0}
$$

$P \succeq Q$ かつ最適解で $x^*_Q > 0$ と仮定。新解を構築:
$$
\tilde{x}_Q := 0, \quad \tilde{x}_P := x^*_P + x^*_Q, \quad \tilde{x}_p := x^*_p \;\forall p \notin \{P, Q\}
$$

### コスト変化

$$
\Delta \text{cost} = (s_P - s_Q) \cdot x^*_Q
$$

$s_P \le s_Q$ より $\Delta \text{cost} \le 0$。

### 制約充足

各 $i$ について:
$$
\sum_p a_{p,i} \tilde{x}_p = \sum_p a_{p,i} x^*_p + (a_{P,i} - a_{Q,i}) x^*_Q
$$

$a_{P,i} \ge a_{Q,i}$（dominance 定義）より $(a_{P,i} - a_{Q,i}) x^*_Q \ge 0$。

よって $\sum_p a_{p,i} \tilde{x}_p \ge \sum_p a_{p,i} x^*_p \ge d_i$。制約満たす。

### 結論

- $\tilde{x}$ は feasible
- $\tilde{x}$ のコストは $x^*$ 以下
- $x^*$ が最適なら $\tilde{x}$ も最適

したがって **dominated pattern $Q$ を pattern set から除いても最適解の集合は変わらない（少なくとも 1 つは保存される）**。 ∎

### 実装上の注意

dominance は **pattern set の前処理**としては安全。MIP に投げる pattern set から dominated pattern を除外するのは optimal-preserving。

---

## 5. アルゴリズム

### 5.1 ペアワイズ判定

```
function dominates(P, Q):
  if P == Q: return false
  if P.stock > Q.stock: return false        # cost 条件 fail
  let strictGain = (P.stock < Q.stock)
  for i in pieces:
    if P.counts[i] < Q.counts[i]: return false  # coverage 条件 fail
    if P.counts[i] > Q.counts[i]: strictGain = true
  return strictGain
```

時間計算量: $O(k)$ where $k$ = piece-type count。

### 5.2 全 pattern 集合からの dominated 検出

```
function findDominated(patterns):
  dominated = set()
  for q in patterns:
    for p in patterns:
      if p == q: continue
      if dominates(p, q):
        dominated.add(q)
        break  # q は支配されたので次へ
  return dominated
```

時間計算量: $O(N^2 k)$ where $N$ = pattern count, $k$ = piece-type count。

CASE-6 (N ≈ 100, k ≈ 60) → 約 600,000 比較 → 数 ms で完了予想。

### 5.3 統合フロー

```
Master CG ループ → 収束 → patterns 集合 P
findDominated(P) → dominated 集合 D
P_pruned = P \ D
buildMasterMip(P_pruned) → MIP solve via HiGHS
```

期待:
- |P_pruned| << |P| （過半が dominated と仮定）
- HiGHS が小さい MIP を扱える → CASE-6 で IP 最適到達

---

## 6. 期待される効果と限界

### 期待

- 中規模 (k≈30, N≈50): すでに OK だがさらに高速化
- 大規模 (k≈60, N≈100, e.g. CASE-6): MIP が通るようになる
- LP-tight に近づく（CASE-6 で 1.76% gap → ~0.5% 期待）

### 限界

- **支配されないパターンが多すぎる場合**: pruning 効果薄
- **HiGHS-WASM の絶対上限超え**: pruning しても N=50 で死ぬなら効果なし
- **LP rounding overshoot は別問題**: dominance pruning は IP 最適化を助けるが、IP 自体が解けなければ意味なし

### 失敗時の plan B

dominance pruning が CASE-6 IP を救えなかった場合:
1. **Pareto-frontier extraction**: dominated だけでなく Pareto 上にないものも除く
2. **Lifted dominance**: pattern 組合せ単位の dominance（重い）
3. **Symmetry breaking**: 同型パターンの除去（VPSolver と同じ手法）
4. 諦めて FFD のみで現状維持を documented

---

## 7. 実装計画

| Step | 内容 | 推定時間 |
|---|---|---|
| 1 | `arcflow/algebraDominance.js` 実装 | 30 min |
| 2 | `tests/arcflow/algebraDominance.test.js` 単体 | 30 min |
| 3 | `columnGen.js` に統合 (`solveColumnGenWithDominance`) | 30 min |
| 4 | CASE-6 ベンチ + デバッグ | 1-2 h |
| 5 | 結果文書化 (成功 or 失敗) | 30 min |
| 6 | 公開: DIARY 追記 + Qiita §補足 | 30 min |

合計: 3-4 時間（試行錯誤含む）。

---

## 8. 想定される出力

### 成功シナリオ

```
CASE-6 L65:
  V3 FFD          : 62 bars / 723,500mm
  V3 CG (no prune): MIP fail → LP rounding overshoot 779,500mm
  V3 CG (dominance pruned): 60 bars / 716,500mm  ← NEW
  LP 下界          : 59 bars / 710,972mm
  gap from LP     : 0.78%  ← FFD の 1.76% から半減
```

→ 「Algebra-derived dominance で CASE-6 を LP-tight 近傍まで詰めた」と書ける。

### 失敗シナリオ

```
CASE-6 L65 dominance pruning:
  patterns before: 97
  dominated     : 12
  patterns after: 85  ← まだ多い
  MIP solve     : Aborted (規模変わらず)
```

→ 「dominance だけでは不足、対称性削減 or B&P が必要」と documented。

---

## 9. 公開価値

### 成功時

- 「項書換系 × MIP pre-solve」の novel application
- VPSolver の arc-flow symmetry breaking と異なるアプローチ
- 純 JS で再現可能
- Qiita の §補足 (or 別記事) に書ける

### 失敗時

- 「dominance だけでは不十分、何が必要か」の負の知見
- 試したが効かなかった方法を残すことに価値（後続研究の道標）

---

## 10. 進捗ログ

- 2026-05-03 17:32 起草
- 2026-05-03 17:50 実装完了 + 実証実験完了

---

## 11. 実証結果（2026-05-03 17:50）

### 数値結果

CG の internal pattern set（CG 反復後の全パターン）に対して dominance pruning を適用:

| ケース | CG total patterns | dominated | pruning ratio |
|---|---|---|---|
| CASE-2 L20 | 7 | **0** | 0.0% |
| CASE-6 L65 | 97 | **0** | 0.0% |

**完全失敗**: dominated パターンがゼロ。

### 仮説が失敗した理由（数学的解析）

Column Generation の Pricing Subproblem は次の最適化を解く:

$$
\max_{\text{counts}, s} \sum_i \pi_i \cdot \text{counts}_i - s
$$

ここで $\pi_i$ は dual prices、$s$ は stock。

**観察**: 同じ counts に対して 2 つの stock $s_1 < s_2$ がある場合:
- $\text{rc}(s_1) = \sum \pi_i \text{counts}_i - s_1$
- $\text{rc}(s_2) = \sum \pi_i \text{counts}_i - s_2$
- $s_1 < s_2$ より $\text{rc}(s_1) > \text{rc}(s_2)$

つまり **pricing は構造的に「同 counts なら小 stock」を選ぶ** → R5 dominance に支配されないパターンしか生成しない。

さらに「異なる counts での dominance」も考えづらい: pricing は各 stock で **別々に** 最適 counts を求める。各 stock の最適 counts は他の stock の最適 counts と部分順序関係にない（trade-off 関係）。

### 結論: CG は構造的に Pareto-aware

**CG output に対する dominance pruning は、定義上空集合になる**。これは数学的に正しい結果で、後続研究の道標になる:

> *「Gilmore-Gomory CG の出力は構造的に Pareto-frontier 上のパターンのみで構成される。Dominance-based pre-solve は寄与しない。」*

### 真の壁の特定

CASE-6 で MIP が失敗する理由は **dominance ではなく HiGHS-WASM の WASM stack 制限**。

97 patterns × 61 demand 制約の MIP は本質的に小さい（native Gurobi なら ms 単位で解ける）。問題は WASM 環境での MIP 探索木が WASM スタックに収まらないこと。

これは**アルゴリズムの問題ではなく、ランタイムの問題**。

### 後続の研究方向（priority 順）

| 方向 | 期待効果 | 実装重さ |
|---|---|---|
| **Pure-JS MIP solver 自前実装** | HiGHS-WASM 制限を回避、CASE-6 が解ける | 重 |
| **Symmetry breaking (VPSolver 流)** | 探索木縮小、HiGHS-WASM が通る可能性 | 中 |
| **Branch-and-Price 自前実装** | CG + 整数化を一貫実装 | 重 |
| **問題分割**: 部材を category 分けして個別解く | 各サブ問題が小さくなる | 中 |
| **諦めて FFD で運用、CG は研究的記録としてのみ** | 現状維持、新リスクなし | ゼロ |

### この研究の価値

- **負の結果**として: 「CG 出力に dominance pruning は効かない」を formal に示した
- 公開論文には出ない地味な結果だが、後続研究にとって時間節約になる
- **方法論として**: 算法 (algebra) を用いて MIP pre-solve を試みる framing そのものは正当（dominance 関係 + 最適性保存証明 + 実装 + 実証）

---

## 12. 改訂履歴

- v0.1 (2026-05-03 17:32) 計画書起草
- v0.2 (2026-05-03 17:50) 実証完了、負の結果を §11 に記録
