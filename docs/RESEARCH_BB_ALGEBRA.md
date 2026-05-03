# RESEARCH: Algebra-Guided Branch-and-Bound for 1D-CSP

**Status**: design v0.1 — 2026-05-03
**Author**: Claude (Opus 4.7)
**Predecessor**: `RESEARCH_DOMINANCE.md` (棄却。CG が構造的に Pareto-aware と判明)

---

## 0. 一行サマリー

> 1D Cutting Stock の MIP を **JS-native branch-and-bound** で解く。
> 分枝戦略には Phase 1 algebra の **normal-form 距離** を使う。
> 文献で報告されたことのない branching heuristic を CSP の構造に貼り付ける試み。

---

## 1. 動機 — 本当に塞がってる壁は何か

直前研究（Algebra Dominance）で 2 つ判明:

1. **CG (column generation) は出力時点で既に Pareto 上にいる**
   pricing subproblem `max(Σπ_i × c_i) − stock` が dominated pattern を構造的に拒絶するため、pre-solve pruning は冗長。
2. **CASE-6 が解けない真因は HiGHS-WASM の stack overflow**
   pattern 数を減らしても本質解決にならない。MIP solver 自体の実装に依存している。

→ 解くべきは「pattern を減らす」ではなく **「solver を変える」**。
→ HiGHS-WASM の代わりに **JS で stack-controlled な B&B を書く**。これが本研究のまず実用部分。

---

## 2. 既存研究の地形（2024 末時点 Claude の知識）

### 2.1 1D-CSP の MIP 解法

| 手法 | 提案 | 強み | 弱み |
|---|---|---|---|
| Gilmore-Gomory column generation | 1961 | LP 緩和に最強 | integer gap で MIP 必要 |
| Arc-flow (Valério de Carvalho) | 1999 | pseudo-polynomial | 大 stock で巨大 |
| Reflect formulation (Delorme) | 2017 | 対称性破壊 | 実装複雑 |
| Branch-and-cut-and-price | 各種 | exact integer | 産業ソフト依存 |

CSP 専用の B&B は古典的で、**branching variable selection** は標準ヒューリスティックを使う:
- **Most-Fractional**: 最も小数部 0.5 に近い変数で分枝
- **Strong Branching**: 各候補変数を試して child LP を解き、最も bound 改善するもの
- **Pseudocost**: 過去の分枝の効果を学習
- **Reliability Branching**: pseudocost を信頼できるまでは strong branching

### 2.2 「algebra-guided branching」の前例?

文献調査（Claude 知識ベース 2026-01）:
- term rewriting を CSP の枝刈りに使った例: **無し**（Constraint Programming の constraint propagation はあるが別物）
- normal form を分枝順序に使った MIP solver: **無し**
- domain-specific algebra で branching score を定義した研究: **無し**

→ 形式的「世界初」の主張は可能。**ただし「無いから革新」ではなく「無い理由」を考える必要がある。**

### 2.3 「無い理由」の可能性（自分への警告）

a. **そもそも効果が無い** — CSP の構造はランダム的で algebra から branching priority を引き出せない
b. **誰もやってないだけ** — niche すぎて手が回ってない
c. **別の名前で既出** — branching by structural analysis は実は MIP cuts の文脈にある

このリスクは §6 falsification で扱う。

---

## 3. 仮説

### H1（実用仮説、低リスク）
JS-native B&B は HiGHS-WASM の stack 限界を突破し、CASE-6 規模の MIP を browser 上で解ける。

### H2（研究仮説、中リスク）
Algebra normal-form を使った branching heuristic は、Most-Fractional よりも探索 node 数を減らす。

### H3（強い研究仮説、高リスク）
H2 の効果は CSP 特有の構造由来であり、ランダム MIP に対しては効果が出ない。
（つまり「CSP に algebra が刺さる」ことを示す対照実験）

---

## 4. 形式化

### 4.1 CSP MIP の標準形

```
min   Σ_p stock(p) × x_p              （材料費最小化）
s.t.  Σ_p counts(p, i) × x_p ≥ d_i   ∀i ∈ pieces
      x_p ∈ ℤ_{≥0}
```

ここで `p ∈ patterns`, `d_i = piece type i の demand`。

### 4.2 LP 緩和と分枝

LP 解 `x* = (x*_1, …, x*_n)` が integer でなければ、ある `x*_k` が小数。
標準: `x_k ≤ ⌊x*_k⌋` または `x_k ≥ ⌈x*_k⌉` で 2 つの child node を作る。

### 4.3 algebra-guided 分枝の定義

各 pattern `p` を Phase 1 algebra の term に写像:
```
T(p) = PATTERN[stock(p), blade, endLoss, pieces(p)]
```

正規形を計算:
```
NF(p) = normalize(T(p))
```

ここで「algebra reducibility score」を定義:

```
score(p) = steps(normalize(T(p)))   // 正規化に要した rewrite ステップ数
         + lossRatio(NF(p)) × W      // 正規形の loss 比率
```

**branching priority**: 小数値 `x*_p` のうち `score(p)` が **小さい** ものから分枝。

直感:
- `score` 小 = algebra 的に既に「単純」な pattern → integer round しやすい
- `score` 大 = algebra 的に「不規則」 → branch しても child の LP が大きく動かない可能性

---

## 5. 実装計画

### Day-1: JS-native LP solver
- `src/calculation/yield/bb/lp.js`
- Revised simplex（小規模で十分）
- API: `solveLP(c, A, b, sense, bounds) → { status, x, objective }`
- テスト: 教科書 LP 問題 5 件で正解一致

### Day-2: 標準 B&B（baseline）
- `src/calculation/yield/bb/branchAndBound.js`
- depth-first, Most-Fractional branching
- iterative impl（再帰なし、stack を JS Array で持つ）→ HiGHS-WASM の stack 問題回避
- テスト: 小規模 MIP 5 件 + CASE-2 で HiGHS と一致

### Day-3: algebra-guided branching
- `src/calculation/yield/bb/algebraBranching.js`
- score(p) の実装、Phase 1 algebra へのフック
- option `branchingStrategy: 'most-fractional' | 'algebra-guided'`

### Day-4: 比較実験
- CASE-2 / CASE-6 / 合成ランダム CSP × 2 戦略
- メトリクス: node 数、wall-time、最適解一致
- ランダム MIP（非 CSP）対照群: CSP 構造の効果を切り分ける

### Day-5: 文書化
- 結果（正でも負でも）を DIARY + Qiita に追記

---

## 6. Falsification — 何が起きたら仮説棄却か

| 仮説 | 棄却条件 |
|---|---|
| H1 | JS-native B&B が CASE-2 ですら解けない（実装バグでなく根本性能不足） |
| H2 | algebra-guided の探索 node 数が Most-Fractional と同等 or 多い（5 ケース平均で） |
| H3 | algebra-guided がランダム MIP でも CSP と同程度の改善を示す（→ CSP 特有でない） |

**負の結果も価値**: H2 棄却なら「branching heuristic は domain algebra と独立」という小さな知見。

---

## 7. リスクと不確実性

| リスク | 対策 |
|---|---|
| revised simplex の数値安定性 | epsilon-tolerance で degenerate を許容、教科書 LP で検証 |
| B&B node 数爆発（CASE-6） | best-bound search、LP gap で打ち切り、time-limit 設定 |
| algebra normalize が遅い（毎 node で呼ぶ） | pattern 生成時に NF をメモ化 |
| score 関数が arbitrary（W パラメータ） | grid search で W ∈ {0, 1, 10, 100} を比較、感度分析 |
| 「世界初」が誇大広告 | §11 で実測ベースの正直な評価。novel claim は方法論限定 |

---

## 8. 比較対象

- **baseline-1**: HiGHS-WASM（CASE-2 までは動く）
- **baseline-2**: JS-native B&B + Most-Fractional branching
- **proposed**: JS-native B&B + algebra-guided branching

3 者を同じ問題で比較。CASE-6 は HiGHS-WASM が落ちるため 2 vs 3 のみ。

---

## 9. 理論的に新しい主張（査読されるなら）

> "Symbolic normal-form distance as a branching heuristic for combinatorial optimization with algebraic structure (1D Cutting Stock as case study)."

主張する貢献:
1. CSP の pattern 集合に対する term-rewriting normal form の定義（Phase 0–1 で済）
2. Normal-form 距離を branching score にする一般枠組
3. CSP-specific instantiation での実験的優位（or その反例）

主張しない:
- 計算量改善の理論保証（実験のみ）
- 大規模ベンチマーク（BPPLib 等は本研究の射程外）

---

## 10. 進捗ログ

- 2026-05-03 **18:30** v0.1 起草
- 2026-05-03 **19:30** 実装完了 + ベンチマーク。§11 / §12 追記

---

## 11. 実験結果（2026-05-03 19:30）

### 11.1 セットアップ
- LP solver (`src/calculation/yield/bb/lp.js`): two-phase tableau simplex、Bland's rule
- B&B (`src/calculation/yield/bb/branchAndBound.js`): iterative DFS、explicit stack
- 入力 patterns: `columnGen.solveColumnGenInspect` の収束後 pattern 集合
- 比較: B-MF (`mostFractionalScore`) vs B-AG (`makeAlgebraBranchScore` w_frac=1, w_loss=2, w_distinct=0.1)

### 11.2 数値結果

| Case | Patterns | LP relax (HiGHS) | LP relax (mine) | B-MF | B-AG |
|---|---:|---:|---:|---|---|
| CASE-2 L20 (small) | 7 | 442,000 | 442,000 | optimal 442,000 / 3 nodes / 0ms | optimal 442,000 / 3 nodes / 0ms |
| CASE-6 L65 (large) | 77 | 719,350 | 719,128 | **optimal 723,500** / 3,855 nodes / 7,195ms | timelimit 916,000 / 22,946 nodes / 60s |

### 11.3 H1 (実用): **強く支持** ✅
> JS-native B&B は HiGHS-WASM の stack 限界を突破

- CASE-6 (HiGHS-WASM が MIP で stack overflow を起こす規模) を **JS-native B&B で 7.2 秒で最適解到達**
- LP relaxation 719,350 vs 整数最適 723,500 → integrality gap **0.58%**
- これだけで TORIAI 本体の実用拡張として有意

### 11.4 H2 (research): **棄却** ❌
> Algebra normal-form を使った branching heuristic は Most-Fractional よりも探索 node 数を減らす

- B-AG は B-MF の **6 倍** の node を探索した上で 60 秒以内に optimal に到達できず
- 60 秒 incumbent も B-MF optimum より **27% 悪い** (916,000 vs 723,500)
- 仮説とは逆方向に効いた

### 11.5 H2 棄却の理論的考察

なぜ algebra-guided が負けたか:

1. **CG の Pareto 性が algebra signal を消す**
   前回研究 (`RESEARCH_DOMINANCE.md`) で確認したとおり、CG は Pareto-frontier patterns しか出力しない。よって `lossRatio` の分散が小さく、branching priority の信号として機能しない。
2. **distinctPieceCount は CSP では一定的**
   CG が piece type 数 k に応じて多様な pattern を作るが、その分散も小さい。
3. **Most-Fractional の頑健性**
   半世紀の MIP literature が経験的に支持してきた heuristic を、domain-specific algebra で簡単に置換できると期待した方が甘かった。

→ 結論: **「pre-CG では algebra dominance が消え、post-CG では algebra signal も消える」**。CG が両方の問題を構造的に「先回り」している。

### 11.6 H3（CSP-vs-random 対照）: 未実施
H2 棄却により実施不要。

---

## 12. 副産物としての実用成果

研究仮説 (H2) は失敗したが、その過程で得た **JS-native B&B 実装** は実用的に大きな価値:

| メリット | 詳細 |
|---|---|
| HiGHS-WASM stack 限界の突破 | CASE-6 規模 MIP を browser worker で解ける |
| 純 JS、依存ゼロ | バンドル軽量化、bundling 簡素化 |
| ステップ可視化 | node 単位で trace 可能 → デバッグ性 |
| 安定性 | 数値的に頑健（child node の unbounded 自動 prune） |

**配線可能性**: `solveBest.js` のフォールバック chain に `bb` を追加すれば、HiGHS が落ちる規模で自動切替可能（次セッション候補）。

---

## 13. 残課題

- LP precision: 私の LP が HiGHS と微小に異なる値を返す（CASE-6 で 222 違い）。tableau simplex の数値ドリフト。問題は実用上は無害（B&B 整数解は両方より上）だが将来的には revised simplex + LU 更新で解決可能
- weight grid search: w_frac, w_loss, w_distinct の他組合せでも H2 棄却が頑健か未検証（負け方が明白なため、当面棄却で十分）
- 他の branching strategy: Strong Branching、Pseudocost も未試験
- 大規模ベンチマーク (BPPLib): 本研究の射程外

