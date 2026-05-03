# 残り研究角度 — 「ワンちゃんあるやつ」honest 評価

**Date**: 2026-05-04
**Author**: Claude (Opus 4.7)
**Context**: ユーザーから「まだワンちゃんありそうなのどれ？　超えたくね？」の問いに正直に答える

---

## 0. 質問

> 残り研究角度の中で **半世紀の OR 文献を超える real chance がある**ものはどれか？

これまでの研究 7 連続で「algebra → 性能向上」は 4 連敗、「algebra → 機能拡張」は 2 勝 + 1 部分支持。
性能側で**実際に超えられる**可能性のある未踏角度を洗い出す。

---

## 1. 既存未着手リスト（前ターン提示）

| # | 候補 | 性能向上の chance | 機能拡張の chance | 実装難度 |
|---|---|:---:|:---:|:---:|
| D | Constraint propagation in pricing | 低 | 低 | 中 |
| E | Lagrangian with algebra multipliers | 低 | 低 | 高 |
| F | Symbolic LP via rational arithmetic | 中 | 低 | 高 |
| G | Cross-instance pattern library | 中-高 | 高 | 中 |
| H | Robust CSP (demand uncertainty) | 中 | 高 | 高 |
| I | Anytime B&B with quality bounds | 低 | 中 | 低 |
| J | Symbolic pattern genealogy | 低 | 中 | 低 |

---

## 2. 各候補の正直な評価

### D. Constraint propagation in pricing
- 既存の knapsack pricing にカット (容量、demand) を propagation するだけ
- standard 技術、新規性弱
- 性能向上があっても数 % 程度
- **chance: 低**

### E. Lagrangian with algebra multipliers
- Lagrangian relaxation 自体は古典 (1970 年代)
- algebra から multiplier を導出する点が novel だが、収束性の保証が難しい
- 高難度実装、結果が曖昧になる risk
- **chance: 低**

### F. Symbolic LP via rational arithmetic
- 浮動小数点誤差なし、exact LP bounds
- 教科書的（Chvátal の simplex with rationals）
- 我々の B&B で観測された LP 微小誤差 (719,128 vs 719,350) を解消可能
- ただし「速度」は遅い（rational 演算は float の 10-100x 遅い）
- **性能では超えない、品質保証で超える** 可能性あり
- **chance: 中（ただし方向限定）**

### G. Cross-instance pattern library 🌟
- TORIAI が見る大量の鋼材切断 instance から「実用的に頻出する pattern」を **offline で蒸留**
- 新 instance では library から関連 pattern を取り出し、CG iteration を skip
- **0-iteration CG**: 最初から full pattern set で B&B 直行
- 既存研究: なし（完全に空白地帯）
- **Claude unique**: LLM が大量 instance から pattern を学習・蒸留できる
- **chance: 中-高**（ただし「単一 instance での性能向上」ではなく「ensemble での平均速度向上」）

### H. Robust CSP (demand uncertainty)
- 実務で demand 数値は estimate（発注精度の問題で ±5-10%）
- minimax: max_{δ} min_{x} cost(x; demand+δ)
- 文献: stochastic CSP, robust CSP は **2010 年代から研究活発**だが CSP 専用は少ない
- **新しい問題設定**として contribution 可能
- 性能の話ではない（**異なる問題**を解く）
- **chance: 機能としては高、性能では中**

### I. Anytime B&B with quality bounds
- B&B が中間 incumbent と LP gap を毎秒 emit
- 純粋に engineering 改善
- novelty なし
- **chance: 低**

### J. Symbolic pattern genealogy
- 各 pattern の rewrite rule trace を表示
- 説明可能性の強化
- 7 (LP Duality Explanation) の延長
- 性能関係なし
- **chance: 低（性能）/ 中（機能）**

---

## 3. 「真に超える」可能性のある未列挙角度

ブレストで思いつく追加候補:

### K. Dual-Algebra LP — 双対変数も symbolically 扱う
- Primal は数値、Dual は algebra で扱うハイブリッド
- algebraic dual から exact reduced cost が出る → 数値誤差なし
- 教科書 LP duality を**形式化したまま実行**する
- 文献: 完全に未踏（mixed symbolic-numerical OR は 2020 年代研究テーマ）
- **chance: 高（ただし実装高難度）**

### L. Pattern Algebra Quotient Ring
- Pattern を free monoid とみなし、R5 等の関係で quotient
- quotient 上で MIP を解く → 元の MIP より変数少ない
- これまでの dominance pre-solve (棄却) と似てるが、quotient は global 構造
- 抽象代数の knowledge を OR に持ち込む
- **chance: 中（ただし vacuous になる risk）**

### M. Anytime IP via primal heuristics + LP cuts
- LP relax + 反復的 primal heuristic (rounding) + Gomory cuts
- standard branch-and-cut の subset
- 性能向上可能だが、既存 B&B 文献に超える要素なし
- **chance: 低**

### N. CSP-tailored Constraint Generation
- Standard CG は column 追加だが、constraint generation は row 追加
- CSP の demand constraint は明示的に少ない (m 個) → constraint generation は標準で意味薄
- **chance: 低**

### O. Quantum-inspired CSP solver
- D-Wave QPU の simulated annealing 類似
- Quantum CSP の 2020 年代研究あるが、実装重い
- **chance: 低（実装コストに見合わない）**

---

## 4. 真に超えるなら — 候補は 2 つ

### 候補 1: G. Cross-Instance Pattern Library 🌟（推奨）

**何を超えるか**:
- 「**新しい instance で CG を 0 iteration で済ませる**」= 既存 CG ベース solver を**速度で超える**

**なぜ可能か**:
- TORIAI は単一 instance を解くツール
- しかし開発者 (Claude) は大量の instance pattern を offline で生成・分析できる
- LLM × algebra で「**この鋼材種別なら頻出 pattern は X, Y, Z**」と pre-bake できる
- 新 instance ではその library を warm-start として使う

**なぜ未踏か**:
- 商用ソルバは「単一 instance を高速に解く」を最優先で最適化
- ライブラリ蒸留は LLM 普及前は人手で困難だった
- LLM が安価になった今 (2026 年)、実現可能

**実装規模**:
- pattern library 蒸留 (1 セッション)
- new instance での lookup logic (1 セッション)
- evaluation (1 セッション)
- 合計 3-4 セッション

**superseded を狙う対象**:
- 単一 instance の cold-start CG
- 「初期 pattern 集合の質」が課題な solver

### 候補 2: K. Dual-Algebra LP 🌟（高難度）

**何を超えるか**:
- 「**LP の reduced cost が exact**」= 浮動小数点誤差ゼロのカット生成
- これにより B&B の bounds が tight、より高速に optimum 確認可能

**なぜ可能か**:
- Phase 1 algebra で pattern を symbolic に扱える
- LP solver の dual variable も rational で扱える (F の発展)
- exact RC で B&B prune が exact → 数値誤差で起こる「無駄な branching」を減らせる

**なぜ未踏か**:
- mixed symbolic-numerical OR は研究 2020 年代テーマ
- CSP 専用の symbolic-dual は完全に空白
- 実装難度高（rational simplex + algebra 統合）

**実装規模**:
- 鬼高い。3-5 セッション
- prototype だけでも 1 セッション

**superseded を狙う対象**:
- 数値誤差で苦しむ大規模 CSP MIP
- HiGHS の double-precision 依存
- exact LP bounds が必要な研究用途

---

## 5. 推奨

ユーザーの「**超えたくね？**」に正直に答えると:

### 一番確率高いのは **G. Cross-Instance Pattern Library** 🌟

理由:
1. 「**Claude が大量 instance から pattern を学習する**」は LLM 時代の最大強み
2. CSP 文献に空白地帯
3. 実装可能性が現実的（rational arithmetic と違い float で OK）
4. ユーザーの実務 (鋼材切断) で「同じパターン何度も出る」直感がある

### 次点は **K. Dual-Algebra LP**（理論派なら）

「**世界初の symbolic-numerical CSP solver**」を主張可能。ただし実装高難度。

---

## 6. ユーザーの問いへの直接的回答

> Q. **まだワンちゃんありそうなのどれ？**
>
> A. **G (Cross-Instance Pattern Library)** が現実的に超える可能性が一番高い。
>     Claude × 大量 instance × LLM 蒸留 という、半世紀の OR が手にしてない武器を使える。

> Q. **超えたくね？**
>
> A. 超えたい。3 セッション内で G を実装し、CASE-1〜6 で「**0-iteration warm-start CG が
>     fresh CG より速い**」を実証する。

---

## 7. 進捗ログ

- 2026-05-04 **05:30** 評価ドキュメント起草、G を次研究方向に選択
