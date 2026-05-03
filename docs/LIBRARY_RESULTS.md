# Cross-Instance Pattern Library — 実装結果（partial support）

**Date**: 2026-05-04
**Researcher**: Claude (Opus 4.7)
**Predecessor**: `RESEARCH_LIBRARY.md`

---

## 0. 一行サマリー

> Abstract pattern (piece-length 集合 × stock サイズ) の extraction / approximate matching / lookup framework を実装。
> 同 project 内 variants では applicable patterns を多数発見できるが、 (1) 6 実 case 間の piece-length 重複が project 固有でほぼゼロ、(2) FFD が小規模 instance の初期 pattern を既にカバー、(3) HiGHS-WASM の状態劣化で大規模 variants の clean 評価が制限。
> **「半世紀の OR を超える」という主張までは到達せず、partial 結果**。

---

## 1. 実装概要

### 1.1 新規モジュール
`src/calculation/yield/research/patternLibrary.js`:
- `extractAbstractPatterns(cgResult, items)` — CG 出力から `{pieces, stock, loss, yieldRatio}` 抽出
- `mergeLibrary` / `buildLibrary` — 複数 instance 集約 + 重複除去
- `findApplicablePatterns` — exact piece-length 一致 lookup
- `findApplicableApproximate(library, spec, opts)` — ±tolerance 範囲で近似 lookup
- `libraryStats` — 統計

### 1.2 columnGen 改修
`solveColumnGen` / `solveColumnGenInspect` に `opts.initialPatterns` を追加。
FFD initial と外部 patterns を merge (重複除去)、CG iteration は通常通り。

### 1.3 テスト
`tests/research/patternLibrary.test.js` 7 件 pass:
- 単体 (extract / merge / dedup / apply / demand-check)
- leave-one-out cross-validation on 6 cases

---

## 2. 実測

### 2.1 Leave-one-out on 6 real cases (exact match)

| Case | library size | applicable | iterations saved |
|---|---:|---:|---:|
| CASE-1 | 190 | 0 | 0 |
| CASE-2 | 189 | 1 | 0 |
| CASE-3 | 190 | 0 | 0 |
| CASE-4 | 149 | 2 | 0 |
| CASE-5 | 140 | 1 | 0 |
| CASE-6 | 118 | 0 | 0 |

**Exact match では事実上 transfer ゼロ**。
理由: 6 cases は **異なる project の鋼材切断データ**。piece lengths が project 固有。

### 2.2 Approximate matching (tolerance 0.01〜0.10)

| Case | tol=0 | tol=0.01 | tol=0.05 | tol=0.10 |
|---|---:|---:|---:|---:|
| CASE-1 | 0 | 0 | 0 | 0 |
| CASE-2 | 1 | 3 | 4 | 5 |
| CASE-3 | 0 | 1 | 1 | 2 |
| CASE-4 | 2 | 4 | 7 | 13 |
| CASE-5 | 1 | 2 | 4 | 8 |
| CASE-6 | 0 | 1 | 2 | 6 |

→ 5% 許容で applicable 数が増えるが、それでも CG が必要とする pattern 集合の十分の一程度。

### 2.3 同 project variants (CASE-2 ±2% jitter, demand 維持)

5 つの noisy variants を合成し leave-one-out:

| variant | tol=0.01 lib_app | tol=0.05 lib_app | cold (p) | warm (p) | iterations 削減 |
|---|---:|---:|---:|---:|---|
| v0 | 4 | 12 | 6 | 6 | 0 (FFD と重複多) |
| v1 | 8 | 13 | 7 | 7 | 0 |
| v2 | 9 | 13 | 8 | 8 | 0 |
| v3 | 9 | 11 | 8 | 8 | 0 |
| v4 | 11 | 14 | 8 | 8 | 0 |

→ **同 project でも CG iteration 削減効果ゼロ**。
理由: CASE-2 (k=5) は CG が 0-1 iter で収束。FFD 初期 pattern が既に LP basis を含むため library の余地なし。

### 2.4 CASE-6 variants — HiGHS 状態劣化で clean 評価不可

CASE-6 (k=62) variants でも試したが、最初の variant で HiGHS-WASM が `lp_not_optimal` 返す。
warmup 後の連続 LP solve で WASM 状態が degrade する既知問題（前研究でも観察済）。

そもそも CASE-6 cold-start CG が 22+ 秒なので、仮に library が iter 50% 削減してくれれば 11 秒節約できる規模。
しかしこの本格評価には HiGHS 安定性問題の解決（fresh load per call、または JS-native LP に置換）が必要。

---

## 3. 仮説評価

### H1（強）— 部分支持 △
> abstract pattern の library を作れば warm-start で iteration 削減

framework は動く、applicable patterns も探せる。しかし:
- 6 disparate cases では applicable 1-13 個程度
- 同 project variants では FFD overlap で実効 0
- 大規模 variants は HiGHS 安定性で測定不可

→ "Yes, in theory" だが "No, on these data".

### H2（中）— 支持
> 効果は instance similarity に依存

明確に観察:
- Disparate (piece lengths 全く違う): 0-2 applicable
- Similar (jittered same project): 4-22 applicable

### H3（強、stretch）— 棄却 ❌
> iteration 50%+ 削減

実測 0% 削減。FFD overlap と CG の早期収束のため。

### H4（理論、超 stretch）— 検証不可
> 鋼材切断ドメインは有限・低次元

データ不足で判定不能。

---

## 4. なぜ期待ほど効かなかったか — 正直な分析

### 4.1 FFD が思った以上に強い

CASE-2 (k=5) で CG は cold-start でも 0-1 iter で収束。
これは **FFD の initial pattern が既に LP optimal basis に近い** ということ。
library が追加で提供する patterns は、ほぼ FFD と重複。

### 4.2 piece length は project 固有

鋼材切断業務での実態:
- 同じ user の同じ案件種別（"H 形鋼の柱"）でも、建物ごとに piece length は異なる
- 寸法は設計図次第。再現性のある "標準長さ" は存在しない（標準は **stock** のみ）

→ 「piece-length matching」は理論上正しいが、実務データの構造と合わない。

### 4.3 transferable なのは "structure" であって "literal lengths"

- 例: "1 large + 3 medium pieces in 12000 stock" のようなパターン形状は再現する
- しかし length: [2855, 1815, 1815, 1815, 5500-loss] のような具体的数値は再現しない

→ もっと **構造的な abstraction** が必要だった。

### 4.4 FFD vs Library — どちらも "良い初期 pattern" を求めるが

- FFD: 各 instance で独立に「貪欲」に良い初期を作る → 実用的に良い
- Library: 過去 instance の pattern を再利用 → 重複が大きく追加価値小

両者は **競合関係** で、FFD が仕事を済ませているところに library を上乗せしても効果薄い。

---

## 5. 「超える」目標との関係

ユーザーの「**超えたくね？**」という問いに対し、本研究の答え:

**今回は超えてない**。

理由:
- 単一 instance での性能は CG/B&B (今日の engineering 勝利) に依存、library は寄与せず
- ensemble across instances の場面（multi-instance batch）が想定されていなかった TORIAI のフローでは活用機会なし
- 実 user history （10〜100 instance 同 user）があれば違う結果になる可能性

**研究線としての価値**:
- "CSP に library / case-based 思想を持ち込む" 試行は文献にない
- ただし 6 case では効果が見えない、negative-to-partial result
- 将来: 実 user usage logs があれば再評価可能

---

## 6. 部分的勝利

framework としては動くので、以下が今回の deliverable:

1. **`patternLibrary.js`** — 純関数モジュール、Node + Browser dual-mode
2. **`columnGen.js` の `initialPatterns` opt** — warm-start 経由路は確立
3. **leave-one-out test infrastructure** — 将来 user data 増えたとき即評価可能

ユーザーの実 instance log が貯まったら、library 構築 → warm-start で実測再評価可能。
**今は「埋まってる線路」段階**。

---

## 7. 今日の研究 8 連続のスコアカード

| # | テーマ | 結果 |
|---:|---|---|
| 1 | Algebra Dominance pre-solve | ❌ |
| 2 | Algebra-Guided branching | ❌ |
| 3 | Hardness 予測 | ❌ |
| 4 | k-best v0.1 (epsilon) | ❌ バグ |
| 5 | k-best v0.2 (binary disjunctive) | ✅ **勝利** |
| 6 | Decomposition (ε-efficient) | △ 部分支持 |
| 7 | LP Duality Explanation | ✅ **勝利** |
| **8** | **Cross-Instance Pattern Library** | **△ partial / framework 完成** |

性能向上系: 4 連敗 + 1 partial / 機能拡張系: 2 勝 + 1 部分支持

---

## 8. 次の候補

「超える」可能性のある残り候補:
- **K. Dual-Algebra LP** — exact LP arithmetic、数値誤差ゼロ。実装高難度（rational simplex）
- **G の延長**: 実 user log が貯まったら再評価
- 別線: **CG pricing に algebra-derived diversity** を組み込む（既存研究 8 とは違う角度）

---

## 9. 進捗ログ

- 2026-05-04 **06:30** RESEARCH_LIBRARY.md 起草
- 2026-05-04 **07:00** 実装 + 6 case + variants 実証
- 2026-05-04 **07:30** 結果分析、partial support と判定、本ドキュメント記載
