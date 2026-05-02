# Symbolic Pattern Algebra — 設計書

> **TORIAI 計算エンジン v3「代数版」**
> Status: Draft v0.1 (Phase 0 / 2026-05-03 着手)
> Author: Claude (Opus 4.7)
> 関連: [ALGEBRA_PLAN.md](./ALGEBRA_PLAN.md), [ALGEBRA_BUG_LOG.md](./ALGEBRA_BUG_LOG.md), [ALGEBRA_DIARY.md](./ALGEBRA_DIARY.md)

---

## 0. なぜ作るのか

現状の V2 (`src/calculation/yield/algorithmV2.js`) は、k>13 または n>80 で **`generateSmartPatterns` というヒューリスティクス**に落ちる。500 件のサンプルパターンしか持てないので、最適パターンを取り逃して「**残材があるのに長い定尺を選ぶ**」のような明らかな選択ミスが出る。

V1 は厳密だが指数爆発でフリーズする。V2 は速いが精度が落ちる。**この二項対立を超える**のが本プロジェクトの目的。

戦略は **「数値最適化を捨てて記号最適化に置き換える」** ではなく、**「記号で探索空間を圧縮してから数値ソルバーに渡す」** ハイブリッド。記号代数で**等価類**を導出し、各類から代表 1 個だけを LP/MIP に投入する。これで k/n が増えても探索木が現実的サイズに収まる。

---

## 1. パターン代数の定義

### 1.1 シグネチャ

```
ATOM     : 部材長 ℓ ∈ ℕ
STOCK    : 定尺 S ∈ ℕ
BLADE    : 刃厚 b ∈ ℕ (定数)
ENDLOSS  : 端ロス e ∈ ℕ (定数)

PATTERN  : ⟨S; [ℓ₁, ℓ₂, ..., ℓₘ]⟩    -- 定尺 S 上に並ぶ部材列
PLAN     : 多重集合 { (P, n) | P:PATTERN, n:ℕ }    -- 各パターンを n 本使う
```

`PATTERN` の有効性:
```
Σ ℓᵢ + (m-1)·b ≤ S - e
```

### 1.2 演算子

| 記号 | 意味 | アリティ |
|---|---|---|
| `⊕` | パターン内の部材結合 | binary, partial |
| `⊗` | パターンの繰返し（n 本） | PATTERN × ℕ → PLAN |
| `⊎` | プランの和（多重集合の和） | PLAN × PLAN → PLAN |
| `⊙` | 定尺の昇格（lift to larger stock） | PATTERN × STOCK → PATTERN |
| `↓` | 定尺の縮小（project to smaller stock） | PATTERN × STOCK → option PATTERN |

### 1.3 公理（核）

```
(A1) 交換律      :  ℓᵢ ⊕ ℓⱼ ≡ ℓⱼ ⊕ ℓᵢ                      -- パターン内の順序は無関係
(A2) 結合律      :  (a ⊕ b) ⊕ c ≡ a ⊕ (b ⊕ c)
(A3) べき等濃縮  :  ⟨S; [ℓ]ⁿ⟩ ⊗ k ≡ ⟨S; [ℓ]⟩ ⊗ (n·k)        -- 同じパターンの繰返しは指数で表現
(A4) 容量制約   :  ⟨S; π⟩ valid ⇔ Σπ + (|π|-1)b ≤ S - e
(A5) 昇格不変   :  yield(P ⊙ S') ≤ yield(P)                  -- 大きい定尺へ移すと歩留まり下がる
(A6) 0-同値      :  ⟨S; π⟩ ⊗ 0 ≡ ε                            -- 0 本は単位元
(A7) PLAN 単位元 :  X ⊎ ε ≡ X
(A8) PLAN 結合律 :  (X ⊎ Y) ⊎ Z ≡ X ⊎ (Y ⊎ Z)
(A9) PLAN 交換律 :  X ⊎ Y ≡ Y ⊎ X
```

### 1.4 簡約規則（書換系）

公理から導出される、**左辺 → 右辺**の単方向書換:

```
(R1) sort        :  ⟨S; π⟩ → ⟨S; sort_desc(π)⟩
(R2) collapse    :  ⟨S; [..., ℓ, ℓ, ...]⟩ ⊗ n → ⟨S; ...[ℓ²]...⟩ ⊗ n          -- (※指数表現に集約)
(R3) lift-merge  :  ⟨S; π⟩ ⊗ k₁  ⊎  ⟨S; π⟩ ⊗ k₂ → ⟨S; π⟩ ⊗ (k₁+k₂)
(R4) prune-empty :  P ⊗ 0 → ε
(R5) dominance   :  ⟨S; π⟩ → ⟨S'; π⟩  if  S' < S ∧ ⟨S'; π⟩ valid             -- 余裕があれば短い定尺へ
```

`(R5)` が **「複数定尺問題を縮退させない」** 鍵。短い定尺で同じパターンが入るなら、書換系がそちらへ動かす。**ただし強制ではなく**、Plan レベルで yield 比較した結果単一定尺の方が高ければ全体としてそちらを採用する（user 要件: 強制不要）。

### 1.5 正規形

`PATTERN` の正規形:
- 部材列を**降順ソート**（R1）
- 連続同一部材を**指数表現**に圧縮（R2）

`PLAN` の正規形:
- 含むパターンすべてが正規形
- 同一パターンの重複を**和算**で集約（R3）
- 0 本のパターンは除去（R4）

正規形における**等価判定が単なる構文一致**になることが目標。

### 1.6 Confluence と Termination

#### 1.6.1 規則の決定論化

複数候補があると confluence が壊れるので、各規則を**決定論的**に固定する。

| 規則 | 非決定論の余地 | 採用する決定論版 |
|---|---|---|
| R1 sort | 順序の選択 | **降順ソート（同値は安定）**。一意 |
| R2 collapse | どのペアから集約するか | **左から走査して隣接同一を集約**。一意 |
| R3 lift-merge | 複数ペアが merge 可能 | **PLAN 走査で最初に見つけた重複ペアから merge**。最終的にすべて merge されるので結果一意 |
| R4 prune-empty | どの 0 エントリを消すか | **PLAN 走査で最初に見つけた 0 を除去**。結果一意 |
| R5 dominance | どの S' に lift するか | **valid な最小定尺 S\* に直接 lift**。一意 |

R5 は特に重要: `S' < S ∧ ⟨S'; π⟩ valid` を満たす **S' のうち最小**に確定（途中の段階を経ない）。

#### 1.6.2 Termination

各規則が strict に減らす単調量を定義。

| 規則 | 単調量（厳密に減少） |
|---|---|
| R1 | 不整列ペア数 inv(π) := \|{(i,j) \| i<j, π_i<π_j}\| |
| R2 | パターン要素の重複数 \|π\| - \|set(π)\| |
| R3 | PLAN のエントリ数 \|PLAN\| |
| R4 | PLAN のエントリ数 \|PLAN\| |
| R5 | パターン中の S の総和 Σ_P S_P |

辞書式順序 `(Σ_P S_P, |PLAN|, inv(π) + dupCount)` で各規則が strict 減少 → **terminating**。

#### 1.6.3 Critical Pair の全列挙

5 規則の組合せ 5×(5+1)/2 = 15 ペア（同一規則も含む）について、左辺が同じ部分項に同時適用できるか検証。

| # | ペア | 重なるか | 検証 | 結果 |
|---|---|---|---|---|
| 1 | (R1, R1) | Yes | sort は冪等 | ✓ Confluent |
| 2 | (R1, R2) | Yes | R1 で並び替え後 R2 で隣接集約 / R2 で重複集約後 R1 で並替。**多重集合として等しい**ので合流 | ✓ Confluent |
| 3 | (R1, R3) | No | R1 は PATTERN 内、R3 は PLAN レベル。**ただし** R3 のパターン等価判定は**多重集合等価**（A1 の交換律から）と定義 → R1 を待たず merge する | ✓ Confluent（A1 が必須） |
| 4 | (R1, R4) | No | R1 は PATTERN 内、R4 は ⊗0 エントリの除去 | ✓ Confluent |
| 5 | (R1, R5) | No | R1 は順序のみ、R5 は S のみ。π の多重集合は不変 | ✓ Confluent |
| 6 | (R2, R2) | Yes | 集約は冪等、左走査で順序固定 | ✓ Confluent |
| 7 | (R2, R3) | No | R2 は PATTERN 内表現、R3 は PLAN レベル。多重集合等価ベースで R3 が先に発火しても OK | ✓ Confluent |
| 8 | (R2, R4) | No | 干渉しない | ✓ Confluent |
| 9 | (R2, R5) | No | 干渉しない | ✓ Confluent |
| 10 | (R3, R3) | Yes | 同一パターンが 3 つ以上ある場合 (P,k1)+(P,k2)+(P,k3)→ 任意順で merge → (P, k1+k2+k3)。**結合律 A8 + 交換律 A9** から合流 | ✓ Confluent |
| 11 | (R3, R4) | Yes | { (P, 0), (P, k) } のとき。R4 → {(P,k)} / R3 → {(P, 0+k)} → R4 を待たず {(P,k)}。**両ルートで同じ** | ✓ Confluent |
| 12 | (R3, R5) | **Yes（要注意）** | { (⟨S; π⟩, k1), (⟨S; π⟩, k2) }。**R5 は同一パターンに対し決定論的に同じ S\* へ lift する**ので、R5→R3 と R3→R5 のどちらの順でも { (⟨S\*; π⟩, k1+k2) } に到達 | ✓ Confluent（決定論版 R5 が前提） |
| 13 | (R4, R4) | Yes | 冪等 | ✓ Confluent |
| 14 | (R4, R5) | No | 干渉しない（R4 は ⊗0、R5 は S） | ✓ Confluent |
| 15 | (R5, R5) | Yes | R5 は最小 S\* へ一気に lift する決定論版なので冪等 | ✓ Confluent |

**Local confluence 結論**: 全 15 ペアが合流する。

#### 1.6.4 Confluence 結論

- **Termination**: §1.6.2 の辞書式単調量で示せた
- **Local confluence**: §1.6.3 で全 critical pair が合流
- **Newman の補題**: terminating + locally confluent ⇒ **confluent**

したがって任意の入力 TERM に対し、簡約規則の適用順によらず**唯一の正規形に到達する**。

#### 1.6.5 Phase 1 の検証義務

ここでの「証明」は紙ベースの設計検証なので、Phase 1 で次を実装してテスト:

1. `tests/algebra/criticalPairs.test.js` で 15 ペアそれぞれを再現（具体的な小さな TERM で検算）
2. property-based test (`fast-check`) で「ランダム入力 × ランダム規則順 → 一意の正規形」を 10,000 ケース確認
3. termination の strict 減少を実装中の `assert` で検証

これらが通ったら confluence は実証ベースで合格。**理論的破綻**が見つかったらこの §1.6 を更新して規則を再設計する。

---

## 2. 等価類とシンボリック双対推論

### 2.1 等価類による探索圧縮

LP/MIP では「変数 = パターン」で立式する。素朴には**全パターンが変数**だが、`(A1)〜(A4)` で同値なパターンは**1 つの変数に縮約**できる。

実測の見込み:
- k=15, n=120 で素朴な変数数 ≈ 10⁵
- 等価類縮約後 ≈ 10³ 以下
- これで HiGHS-WASM の MIP が現実時間で解ける

### 2.2 双対変数のシンボリック推論

LP の双対変数 λ_ℓ（部材長 ℓ の影値）について:

```
∀ パターン P = ⟨S; π⟩:
   reduced_cost(P) = cost(P) - Σ_{ℓ∈π} λ_ℓ

P が最適基底に入る ⇔ reduced_cost(P) < 0
```

ここで **λ_ℓ をシンボルのまま比較**し、

```
λ_2400 + λ_3000 > λ_5400  →  ⟨S; [5400]⟩ より ⟨S; [3000, 2400]⟩ が常に優越
```

のような**条件付き優越関係**を事前に導出すれば、**列生成のサブ問題（pricing）が高速化**する。これは Knuth-Bendix 風の completion を双対空間で行うのと等価。

### 2.3 反証ルート

「歩留まり > X% の解は存在しない」を**枚挙ではなく代数で示す**ルート:

1. 制約系を A1-A9 + 容量制約に展開
2. 仮定 yield > X を等式系に追加
3. 等式系を簡約 → ⊥（矛盾）が出れば反証完了

これは SAT/SMT ソルバーの精神に近い。実装は Phase 3 後半。

---

## 3. アーキテクチャ

### 3.1 ファイル配置

既存の `src/calculation/yield/` には**触らず**、新規ディレクトリで完結させる。

```
src/calculation/yield/
├── algebra/                       ← E の心臓部
│   ├── term.js                    -- TERM/PATTERN/PLAN の表現と構築
│   ├── axioms.js                  -- 公理 A1-A9 の表明とテスト
│   ├── rewriteRules.js            -- 簡約規則 R1-R5（純関数）
│   ├── normalForm.js              -- 正規形への簡約器
│   ├── equivClasses.js            -- 等価類の管理と代表選出
│   ├── dualReasoning.js           -- 双対変数のシンボリック推論
│   └── solver.js                  -- 代数 + 数値の橋渡し
├── arcflow/                       ← 数値ソルバー基盤（保険）
│   ├── graph.js                   -- Arc-Flow グラフ構築
│   ├── highsAdapter.js            -- HiGHS-WASM 呼び出し
│   ├── multiStockGuard.js         -- 複数定尺の縮退検知（強制ではない）
│   └── lpRelaxation.js            -- LP 緩和と下界
├── algorithmV3.js                 ← drop-in patch（V2 と同じ思想で V2 の後ろから上書き）
└── （V1 / V2 ファイルは Phase 4 まで一切変更禁止）
```

### 3.2 純関数原則

メモリの責務分離ルールに準拠:
- `src/calculation/yield/algebra/*` は**全て純関数**にする
- 副作用（DOM, localStorage, console.warn）禁止
- 入力 → 出力の reproducibility をテストで担保

### 3.3 V2 との関係（drop-in 方式）

```
読込順:
  patternPacking.js
  → repeatPlans.js
  → bundlePlan.js
  → calcCore.js
  → algorithmV2.js          (V2 が V1 を patch)
  → algorithmV3.js          ← 新規。V2 を patch
```

`algorithmV3.js` は V2 と全く同じ drop-in 構造:
- 起動時に `Y.calcCore` などのオリジナルを保存
- 自分のラッパーで上書き
- `Toriai.calculation.yield.algebraConfig.rollback()` で V2 の状態に戻る

### 3.4 失敗時のフォールバック

`algorithmV3.js` の wrapper はこう動く:

```
calcCoreV3(options):
  try:
    result = algebraOptimize(options)
    if result.isValid && result.yieldOK:
      return result
    else:
      logBug("V3 produced invalid/low-yield result")
      return calcCoreV2(options)         ← V2 に委譲
  catch (e):
    logBug(e)
    return calcCoreV2(options)
```

つまり**例外/不正解どちらでも V2 にフォールバック**する。さらに kill switch:

```js
Toriai.calculation.yield.algebraConfig.rollback();
// → Y.calcCore = origCalcCoreV2  (V2 に戻る、V2 を rollback すれば V1 に戻る)
```

---

## 4. 多目的・複数定尺の扱い

### 4.1 ユーザー要件（再掲）

- **複数定尺は強制しない**（単一定尺で歩留まり良ければ OK）
- ただし「**計算量が増えると単一定尺詰込みに切り替わる**」のは **NG**
- → アルゴリズムは**常に複数定尺の選択肢を探索空間に持ち**、結果として単一が良ければ単一を選ぶ

### 4.2 実装方針

- 等価類縮約後の変数集合は**全定尺ぶん含む**
- 計算時間が逼迫しても、変数を間引くのではなく**LP の精度を緩める**（=反復回数を削る）方向で対処
- 切替トリガーが「単一定尺フォールバック」になる経路を**コード上に存在させない**
- LP 緩和は常に多定尺込みで解き、整数化フェーズだけ早期打切り可

### 4.3 既存 5 パターンの統一

現在の `歩留まり最大化 / Pattern A / Pattern B / Pattern C / 残材優先` は、**目的関数の差替え**で同じソルバーから出す:

| 現行 | V3 での目的関数 | 制約 |
|---|---|---|
| 残材優先 | min(新材使用本数) | 残材を**先に消費**（定数項） |
| 歩留まり最大化 | min(loss) | なし |
| Pattern A | min(本数) | yield ≥ 90%, 繰返し最大 |
| Pattern B | max(繰返し) | yield ≥ 80% |
| Pattern C | max(繰返し) | A,B 解なし時のみ |

UI は当面そのまま。Phase 4 で Pareto Front 化を検討（提案 C）。

---

## 5. 成功条件 / 失敗条件

### 5.1 成功条件（Phase 4 終了時に判定）

すべて満たせば V3 を本番化、未達なら V2 のまま据え置き:

- [ ] Phase 1 の代数規則が confluent / terminating であることを文書化
- [ ] V1 で解ける小規模問題（k≤10）で V1 と**同じ結果**を返す
- [ ] V1 で OOM になる中規模問題（k≤20, n≤200）で**現実時間（<5秒）に解を出す**
- [ ] V2 の既知の選択ミス（残材余りで長定尺を選ぶ）が**再現しない**
- [ ] 複数定尺ベンチマークで**単一定尺縮退が起きない**（縮退検知ガード合格）
- [ ] 既存 Jest テストが全て通る
- [ ] フォールバック経路の単体テストあり

### 5.2 失敗条件（任意 1 つで黄信号、複数で赤信号）

- ❌ 簡約規則の confluence が壊れている（同じ入力で異なる正規形が出る）
- ❌ V1 と異なる結果が出る（k≤10 の検証で）
- ❌ V2 より遅い（中規模ベンチで）
- ❌ MIP 求解時間が現実離れ（>30 秒）

赤信号 = `algebraConfig.rollback()` を本番デフォルト ON、ただしコードは残す。

---

## 6. リスクと未解決課題

| ID | 課題 | リスク | 対処方針 |
|---|---|---|---|
| OQ-1 | ~~(R5) dominance が confluence を壊す可能性~~ | ~~高~~ | **解決（2026-05-03）**: §1.6.3 で全 15 critical pair の合流を確認。R5 を「最小 S\* に一気に lift」と決定論化することが必須条件 |
| OQ-2 | HiGHS-WASM のサイズ（~1.5MB）と初期ロード | 中 | lazy load、初回計算時に dynamic import |
| OQ-3 | 双対変数のシンボリック推論が実装爆発する可能性 | 中 | Phase 3 でスコープ縮小、まず数値推論で代用 |
| OQ-4 | 既存 5 パターンと完全互換の出力が必要 | 中 | Phase 4 で V1 出力との diff テスト |
| OQ-5 | termination 証明が `(R5)` 込みで難航 | 中 | 単純化として well-founded order を別途定義 |
| OQ-6 | フォールバック判定が緩いと V2 に頻繁に落ちる | 低 | "isValid" の閾値を Phase 4 で調整 |

---

## 7. 用語集

- **TERM**: 代数体系の最小単位。ATOM, PATTERN, PLAN を包む型
- **正規形 (Normal Form)**: 簡約規則をこれ以上適用できない形
- **Confluent**: どの順序で簡約しても同じ正規形に到達する性質
- **Terminating**: 簡約が必ず有限回で停止する性質
- **Critical Pair**: 2 つの規則が同じ部分項で適用できる組（confluence 検証の対象）
- **Knuth-Bendix completion**: 規則系を confluent にする自動補完手順
- **Reduced cost**: LP 双対の指標。負なら基底に入れるべき
- **Pricing**: 列生成における最小 reduced cost のサブ問題
- **Arc-Flow**: 切断問題を DAG 上の最小フローへ還元する定式化
- **drop-in patch**: 既存ファイルを書換えず後ろから差替える方式（V2 と同じ）

---

## 8. 改訂履歴

- v0.1 (2026-05-03) Claude 初版ドラフト
- v0.2 (2026-05-03) §1.6 を全面拡張: 規則の決定論化 / termination の単調量 / critical pair 全 15 ペアの合流確認 / Newman で confluence 結論。OQ-1 解決
