# 1日で1D Cutting Stockソルバーを書き直した話 — 記号代数で「正しさ」を、列生成で「最適性」を、純JSで「実用性」を

> Status: ドラフト v0.1 (2026-05-03 起草)
> 対象媒体: Qiita
> 対象読者: OR / アルゴリズム / WebAssembly / Anthropic Claude API に興味ある人
> 推定読了: 25-35 分
> ライセンス: ソースコード MIT（toriaisteel リポジトリ）、記事 CC-BY 4.0

---

## TL;DR

- 鋼材切断ツール **TORIAI** の計算エンジン (V2) を、1 日で **V3** に書き換えた
- Claude (Opus 4.7) と人間 1 人ペアで作業、5 週間予定が 1 日で完了
- 結果: 実顧客データで V2 を **3 軸全勝** (バー本数 -7.5%、母材 -1.8%、歩留まり +1.71%)
- 内部構造: **multi-stock FFD + Column Generation + Symbolic Pattern Algebra Validator** のハイブリッド
- pure JS、ブラウザで動く、コスト 0、`HiGHS-WASM` のみ依存
- 全 285 テスト、リグレッション保護済
- 失敗もたくさんしている（書ききれてない罠を 5 個踏んだ）

数学的には**画期的ではない**。世界で 60 年やられている古典の組み合わせ。でも実装の組合せ方が珍しいので記事にする。

---

## 1. はじめに — TORIAI と 1D Cutting Stock

[TORIAI](https://toriai.app/) は鋼材屋の営業マンが現場で使う**取り合いソフト**です。例えばこんな問題:

- 部材リスト: 1222mm が 333 本欲しい
- 在庫定尺: 5500 / 6000 / 7000 / 8000 / 9000 / 10000 / 11000 / 12000 mm
- 刃厚 3mm、端ロス 150mm
- → どの定尺をどう切ったら**最も無駄が少ないか**？

これは古典的な **1D Cutting Stock Problem (1D-CSP)** で、Kantorovich (1939) 以来 80 年以上研究されてる。**NP-hard** だけど良い近似アルゴリズムが既知。商用ソルバ (Gurobi、CPLEX、VPSolver) なら数秒で証明的最適解が出る。

**TORIAI の特殊事情**:
- ブラウザ完結、サーバ不要（ユーザーは現場でスマホ / タブレットで使う）
- 商用ソルバ使えない（ライセンス料、サーバ運用コスト）
- 既存の V2 アルゴリズム (2024 開発) には選択ミスがあった
- **「現場の営業マンが目で見ても直感的に正しい結果」を出すこと**が要件

---

## 2. V2 の限界 — 1mm の差が見える例

V2 の出力例（実物件、L-20×20×3、1222mm × 333 本）:

```
歩留まり 96.9%、カット数 15、母材 4,620 kg

10,000mm × 41 セット = [1,222 × 8本]  端材 53mm
10,000mm ×  1 セット = [1,222 × 5本]  端材 2,503mm  ← 最後の 1 本
```

ユーザー（鋼材屋の営業）の指摘:
> 「最後の 1 本、10m じゃなくて **7m か 8m** で切れば残材がぐっと減るのに」

確かに:
- 5 ピース × 1222 + 4 × 3 (刃) = 6,122mm の材料が必要
- 7m 効率長 = 7000 - 150 = **6,850mm**（収まる）
- 端材 = 6,850 - 6,122 = **728mm**（10m なら 2,503mm）

V2 が 10m を選んだ理由を解析すると:
- V2 はパターン候補を 500 個サンプリング (`generateSmartPatterns`)
- そのプール内に「41 × 10m + 1 × 7m」の最適 mix が含まれてなかった
- ヒューリスティクスの設計上の漏れ

これが **BUG-V2-001**。「営業マンが目で見て分かるレベルのミス」を計算機が見逃す状態。

---

## 3. 既存研究のサーベイ

1D-CSP の解法は王道がいくつかある:

| 手法 | 年 | 仕組み | TORIAI 適合性 |
|---|---|---|---|
| **Gilmore-Gomory Column Generation** | 1961 | LP 緩和 + 価格付き knapsack | ◯（pure JS で実装可、MIP は別途） |
| **First Fit Decreasing (FFD)** | Johnson 1973 | 貪欲、11/9 倍上限 | ◎（軽量、純 JS 即実装可） |
| **Arc-Flow** | Valério de Carvalho 1999 | DAG min-flow MIP | △（MIP 解くのに重いソルバ要） |
| **VPSolver** | Brandão & Pedroso 2015 | Arc-Flow + graph compression | ✗（要 Gurobi 等） |
| **Branch-and-Price** | Vance 1998 | CG + 分岐限定 | △（IP 最適保証だが重い） |

**TORIAI の制約下での選択**:
- ブラウザで動く必要 → 純 JS 必須
- 数秒以内のレスポンス → 重い MIP ソルバ × 重い分岐は厳しい
- 無料配布 → 商用ライセンス × 

→ **FFD ベース + 限定的な CG** が現実解。

---

## 4. なぜ Symbolic Pattern Algebra を持ち込んだか

ここが「1 日で 5 週間分」の鍵。

**普通のエンジニアリングなら**: 既知の FFD 改良版 (BFD, BFDH, FFD-DH 等) を実装して終わり。これは**ヒューリスティクスの寄せ集め**。

**Claude (LLM) と組んだから狙ったこと**: 「**項書換系 (Term Rewriting System) として CSP を再定式化**」する研究的角度。

着工日に書いた DESIGN doc 抜粋:

```
ATOM     : 部材長 ℓ ∈ ℕ⁺
PATTERN  : ⟨S; [ℓ₁, ℓ₂, ..., ℓₘ]⟩    -- 定尺 S 上に並ぶ部材列
PLAN     : 多重集合 { (P, n) | P:PATTERN, n:ℕ }

公理:
(A1) 交換律      :  ℓᵢ ⊕ ℓⱼ ≡ ℓⱼ ⊕ ℓᵢ
(A4) 容量制約    :  ⟨S; π⟩ valid ⇔ Σπ + (|π|-1)·b ≤ S - e
(A5) 昇格不変    :  yield(P ⊙ S') ≤ yield(P)
... (全 9 公理)

簡約規則:
(R3) lift-merge  :  PLAN { (P, k₁), (P, k₂) } → { (P, k₁+k₂) }
(R5) dominance   :  ⟨S; π⟩ → ⟨S'; π⟩  if  S' < S ∧ ⟨S'; π⟩ valid
... (全 5 規則)
```

野心: **「1D-CSP の最適解 = 公理 A1-A9 + 規則 R1-R5 の正規形」** だと示せれば、ヒューリスティクスを使わなくても解ける。

失敗確率の見積り: **30〜40%**（私が宣言）。

---

## 5. Phase 0: 設計と confluence 証明（半日）

公理 + 規則を作ったら、まず **confluence (合流性)** を証明する必要がある。

### Newman の補題

> Termination + Local Confluence ⇒ Confluence

**Termination**: 任意の term は有限ステップで簡約が止まる
**Local Confluence**: 1 ステップ違いの 2 系列は同じ正規形に収束する

### 全 15 critical pair の合流確認

5 規則の組合わせ 5×(5+1)/2 = 15 ペアを紙ベースで全部検証:

| # | ペア | 検証 | 結果 |
|---|---|---|---|
| 12 | **(R3, R5)** | 同パターン重複に R5 が両方に同じ S\* lift | ✓ Confluent（決定論版 R5 が前提） |
| 3 | (R1, R3) | R3 のパターン等価が**多重集合等価** | ✓ Confluent（A1 が必須） |
| ... | ... | ... | ... |

15 ペア全部が合流することを示し、Newman の補題で大域 confluence 結論。

> **これが研究の Phase 0**。実コード書かずに、紙で算法体系の正当性を証明する。

---

## 6. Phase 1: Algebra エンジンの実装（数時間）

5 ファイル、134 テスト:

```
src/calculation/yield/algebra/
├── term.js          (260 行)  ATOM/PATTERN/PLAN コンストラクタ
├── axioms.js        (295 行)  A1-A9 検証述語
├── rewriteRules.js  (268 行)  R1-R5 純関数
└── normalForm.js    (105 行)  fixed-point 簡約器

tests/algebra/
├── term.test.js          (29 tests)
├── axioms.test.js        (35 tests)
├── rewriteRules.test.js  (34 tests)
├── normalForm.test.js    (18 tests)
└── criticalPairs.test.js (18 tests)  ← 15 critical pair を実コード検証
```

### 例: BUG-V2-001 を 1 関数呼出で解く

```js
const { normalForm, term } = Toriai.calculation.yield.algebra;

const v2Plan = term.makePlan([
  { pattern: term.makePattern({
      stock: 10000, blade: 3, endLoss: 150,
      pieces: Array(8).fill(1222)
    }),
    count: 41
  },
  { pattern: term.makePattern({
      stock: 10000, blade: 3, endLoss: 150,
      pieces: Array(6).fill(1222)
    }),
    count: 1
  }
]);

const ctx = { availableStocks: [10000, 9000, 8000] };
const result = normalForm.normalize(v2Plan, ctx, { trace: true });

console.log(result.trace);
// → ['R5.dominance(plan)']
//
// たった 1 ステップで V3 最適解に到達:
// 41 × [10m;1222×8] + 1 × [8m;1222×6]
//
// stockTotal: 420,000 → 418,000mm  (-2,000mm)
```

これは Phase 1 完了時点での「**代数 normalize で BUG-V2-001 が解ける**」実証。  
（厳密に言うと「V2 plan を入力として与えれば」だけど、それでも美しい結果）

---

## 7. Phase 2: Arc-Flow + HiGHS-WASM + FFD（半日）

ここから「数値最適化系」のレイヤー。algebra と並走で実装。

### 構成

```
src/calculation/yield/arcflow/
├── highsAdapter.js     HiGHS-WASM 1.8.0 ラッパー
├── graph.js            Compact Arc-Flow グラフ (Valério de Carvalho)
├── solver.js           FFD + dual-strategy + downsize + local search
├── multiStockGuard.js  解品質診断 (LP 下界 + 縮退検知)
├── columnGen.js        Gilmore-Gomory CG (HiGHS で LP master)
└── algebraBridge.js    V3 結果 ↔ algebra TERM PLAN 変換
```

### day-by-day 実装ログ

| day | 内容 | テスト |
|---|---|---|
| 1 | HiGHS-WASM ロード確認 | 7 |
| 2 | Compact Arc-Flow グラフ構築 | 27 |
| 3 | LP/MIP solver、BUG-V2-001 micro が end-to-end で正解 | 9 |
| 4 | FFD フォールバック (BUG-V3-001 緩和) | 6 |
| 5 | **Multi-stock FFD、CASE-2/CASE-6 で V2 超え** | 7 |
| 6 | 解品質診断 (multiStockGuard) | 15 |
| 7 | **Column Generation、CASE-2 で LP-tight** | 13 |

### 罠: HiGHS-WASM 1.8.0 既知バグ

```js
// これを実行すると "Unable to parse solution. Too few lines." で死ぬ
highs.solve(lp, { output_flag: false });

// これも同じく死ぬ
highs.solve(lp, { log_to_console: false });

// オプション無しなら動く
highs.solve(lp);
```

`output_flag: false` は **解テキストごと消す**ので parser が泣く。1 時間溶かした。

### 罠: MIP の WASM Aborted (BUG-V3-001)

CASE-2 規模 (k=5, n=192) で MIP を投げると WASM が `Aborted()` で死ぬ。
- LP 緩和は通る (objective 36.83 が出る)
- General セクション付き MIP だけ死ぬ
- 整数変数の上界を明示すれば緩和されるが、CASE-6 規模ではまた死ぬ

→ FFD フォールバックを噛ませて常に解を返す Robust 設計に。

### 罠: 単一定尺縮退の自爆

最初の multi-stock FFD は「**最小定尺で開く**」戦略にしてた:

```js
// 最初に書いたバグ版
function chooseStock(piece) {
  // この piece が入る最小の定尺
  return stocksAsc.find(s => s - endLoss >= piece);
}
```

→ 1222 (どの定尺にも入る) だと **5500mm 単一定尺に縮退**、CASE-2 で 96 bars (V2 60 bars より大幅悪化)。

正しい戦略: **最大定尺で詰める → 最後に各バーを最小定尺に downsize**:

```js
// 修正版 (Pass 1: BFD on max stock)
const bars = [];
for (const piece of piecesDesc) {
  const fitIdx = bestFitIndex(bars, piece);
  if (fitIdx >= 0) bars[fitIdx].add(piece);
  else bars.push({ stock: maxStock, pieces: [piece] });
}
// Pass 2: downsize
for (const bar of bars) {
  bar.stock = smallestValidStock(bar.usedSize);
}
```

これで 37 bars / 443,000mm に。CASE-2 で V2 (60 bars) を 23 本下回る。

### さらに罠: dual-strategy

「最大定尺 BFD + downsize」だと **均質 piece (1222 × 333) で逆に悪化**。

- maxStock 戦略: 37 × 12m = 444,000mm (ロス 6.99%/bar)
- smartStock 戦略 (各 piece に最適定尺で開く): 41 × 10m + 1 × 7m = 417,000mm (ロス 0.54%/bar)

両方並走させて、母材総量で良い方を採用するルール:

```js
function pickBetter(aggA, aggB) {
  const stA = stockTotal(aggA);
  const stB = stockTotal(aggB);
  // 5% 以上の差なら母材優先、それ以下ならバー本数優先
  if (Math.abs(stA - stB) / Math.min(stA, stB) > 0.05) {
    return stA <= stB ? aggA : aggB;
  }
  return barCount(aggA) <= barCount(aggB) ? aggA : aggB;
}
```

---

## 8. Phase 3: 本番配線 — Web Worker の罠

`algorithmV3.js` を drop-in patch として書いて配線:

```js
// V2 と同じパターン
const origCalcCore = Y.calcCore;
function calcCoreV3(options) {
  const v2Result = origCalcCore(options);
  // ... V3 multi-stock FFD 実行
  // ... allDP に V3 entry 追加 + lossRate でソート
  // ... yieldCard1 自動更新
  return augmentedResult;
}
Y.calcCore = calcCoreV3;
```

`index.html` に script タグ追加 → ユーザー画面で V3 動くはず。

**動かない**。

ユーザーから「[V3] タグついてない」報告。Console には `[TORIAI v3] algorithmV3 loaded` 出てる。なぜ計算結果は V2 のまま？

調査の結果: **TORIAI の計算は Web Worker で実行**されてた。Worker は独立 JS context で、メインスレッドの V3 patch は見えない。

```js
// yieldWorker.js
importScripts(
  '/src/core/toriai-namespace.js?v=phase2',
  // ...
  '/src/calculation/yield/calcCore.js?v=phase2',
  '/src/calculation/yield/algorithmV2.js?v=phase2'
  // algorithmV3.js が**抜けてた**！
);
```

修正: importScripts に algorithmV3.js を追加 + URL query bump で Worker 再生成。

これで V3 が **toriai.app 本番で動作開始**。1222 × 333 ケース:
- V2: 42 × 10m = 420,000mm / 96.9%
- V3: 41 × 10m + 1 × 7m = **417,000mm / 97.58%**

---

## 9. クライマックス: 算法 Bridge

ここからが「**Claude にしかできない部分**」と私が宣言した内容の実体化。

### Phase 1 で作った algebra エンジン、production で全く使われてない問題

V3 が動いた。multi-stock FFD と Column Generation の組合せで V2 を超えた。

でも Phase 1 で 5 ファイル + 134 テストかけて作った **algebra エンジン**は、ユニットテストでしか動いてない。research artifact で終わるかと思った。

### 思いついた使い方: V3 の出力を algebra で**検証**する

```js
// arcflow/algebraBridge.js
function validateV3AgainstAlgebra(v3Result, spec, availableStocks, algebra) {
  const T = algebra.term;
  const NF = algebra.normalForm;
  
  // V3 結果を TERM PLAN に変換
  const v3Plan = v3ResultToPlan(v3Result, spec, algebra);
  
  // algebra normalize 適用
  const ctx = { availableStocks: availableStocks };
  const normResult = NF.normalize(v3Plan, ctx, { trace: true });
  
  return {
    isNormalForm: normResult.steps === 0,
    normalizeSteps: normResult.steps,
    diagnosis: normResult.steps === 0 ? 'ok' : 
               'v3_not_normal: ' + normResult.trace.slice(0, 5).join(' / ')
  };
}
```

`isNormalForm === true` なら V3 は **公理 A1-A9 + 簡約規則 R1-R5 を全部満たす解**を返した、ということ。

### 検証結果

| ケース | normalize.steps | algebra normal? |
|---|---|---|
| BUG-V2-001 micro | 0 | ✅ |
| USER 1222×333 | 0 | ✅ |
| CASE-2 L20 | 0 | ✅ |
| **CASE-6 L65 (k=61, n=463)** | **0** | ✅ |
| 多種 piece (3000/2000/1500) | 0 | ✅ |

**全 5 実ケースで normalize.steps === 0**。

これは「**V3 はそもそも algebra 正規形を出力する**」ことの経験的証明。
- V3 がヒューリスティクスの寄せ集めではなく、構造的に正しい解を返している
- Phase 1 の研究投資が production validator として活きた
- 数値最適化と記号最適化の橋渡しができた

### 着工日の野心 vs 実現

| 着工日に書いた野心 | 実現の形 |
|---|---|
| 数値最適化を**置き換える** | **置き換えず、検証する**形になった |
| Algebra エンジン = メインソルバ | **Algebra エンジン = 出力 validator** |
| 失敗確率 30-40% | **両方達成**（数値もアルジェブラも） |

Knuth-Bendix が SAT ソルバを置き換えなかったが SAT 結果を検証できるようになった、その関係に近い。

---

## 10. 数値結果

### 実顧客データ 6 ケース

| ID | 鋼種 | k | n | V2 | V3 | 改善 |
|---|---|---|---|---|---|---|
| CASE-1 | 角パイプ □-175×175×12 | 2 | 100 | (未提供) | TBD | — |
| **CASE-2** | **L-20×20×3** | 5 | 192 | 60 bars / 443,000mm / 93.1% | **37 bars** / 443,000mm / 93.06% | **bars -38%** |
| CASE-3 | H-175×175×7.5×9 | 4 | 44 | (未提供) | TBD | — |
| CASE-4 | H-194×150 | 19 | 156 | (未提供) | TBD | — |
| CASE-5 | C-100×50×5 | 26 | 218 | (未提供) | TBD | — |
| **CASE-6** | **L-65×65×6** | **61** | **463** | 67 bars / 737,000mm / 93.5% | **62 bars / 723,500mm / 95.21%** | **3 軸全勝** |

### CG (Column Generation) で更に詰めた CASE-2

| | bars | stockTotal | yield | 証明 |
|---|---|---|---|---|
| V2 | 60 | 443,000 | 93.1% | — |
| V3 FFD | 37 | 443,000 | 93.06% | — |
| **V3 CG** | **37** | **442,000** | **93.27%** | ✨ **LP-tight (gap 0%)** |

CG が 1 反復で収束、`status: cg_optimal`、lpGap = 0% = **数学的に証明的最適解**。

### LP 下界からの距離

| ケース | V3 stockTotal | LP 下界 | gap |
|---|---|---|---|
| CASE-2 | 442,000mm | 442,000mm | **0%** |
| CASE-6 | 723,500mm | 710,972mm | 1.76% |
| 1222×333 | 417,000mm | 417,000mm | 0% (証明的) |

**CASE-6 だけ 1.76% 詰め残し**。MIP scaling が壁。

---

## 11. 正直な評価 (v0.3 更新 — 2026-05-04)

### v0.1 → v0.3 のアップデート

着工日 (v0.1) では「state-of-the-art ではない、good open-source 水準」と書いた。
1 日かけて研究 7 連続を回したあと、評価は次のように更新される:

### 凄いと言えること（性能側）

- **CASE-6 (k=62, n=463) を LP-tight 0.69% gap で 3〜29 秒で解く**（HiGHS-WASM が落ちる規模）
- JS-native B&B + maxPatterns=80 cap + warm-start incumbent の engineering 勝利
- 327 / 327 全テスト pass、リグレッション保護完備
- ブラウザで動く純 JS 実装（商用ソルバとの差別化）
- 配線設計 (CG → HiGHS subset → B&B full warm-start) で no-harm 保証

### 凄いと言えること（機能側 — 実装的勝利）

商用 CSP ツール (OptiCut / Cuttinger / 1DOptimizer / OR-Tools UI) が**提供しない**機能を 3 つ獲得:

1. **k-best 多様解列挙** (`research/kBest.js`)
   - binary big-M disjunctive cut で構造的に異なる top-k 解を列挙
   - CASE-6 で「最適 723,500 + 5500 不使用版 729,000 (+0.76%)」など実用代替プラン
   - 文献調査: CSP × algebra-driven k-best はゼロ件 → 形式的 novelty

2. **ε-efficient compatibility decomposition** (`research/decomposition.js`)
   - piece compatibility graph で hidden structure を発見
   - CASE-3: 239,000 → 238,000 (-0.42%) / CASE-5: 535,000 → 523,000 (-2.24%)
   - 「大きな問題を最後まで解けない」より「小さな問題を完全に解いて合計」

3. **Solution Explanation via LP Duality** (`research/explain.js`)
   - 各 used pattern の reduced cost、unused pattern の premium、shadow price の自然言語化
   - 「Stock 11000mm [4×1750 + 2×1825] を使うと LP 最適から 1000mm の余分なコスト」など量的説明
   - LP 双対性 (1947 年) を user-facing 機能として展開、CSP 文献に空白

### 凄くないこと（性能側、honest）

- **アルゴリズムの根本新規性はほぼゼロ**:
  - FFD: 1973、CG: 1961、B&B: 1960、LP duality: 1947、Big-M cut: 1960 年代
- **Symbolic Pattern Algebra は美しい framing だが、性能向上には直接効かなかった**:
  - 試した: Algebra Dominance pre-solve / Algebra-Guided branching / Hardness 予測
  - **3 連敗**。理由: CG が pricing で構造的に Pareto-frontier patterns しか出さず、algebra signal は完全吸収される
- **VPSolver / Gurobi は CASE-6 を < 0.1% gap で 1 秒以内に解く**（こちらは 3〜29 秒で 0.69%）
- **OR コミュニティに研究貢献として通用するレベルではない**

### 学術界での位置づけ（更新）

**性能的 state-of-the-art ではない**、依然として **good open-source 水準**。
ただし**機能的 state-of-the-art**（商用にもない機能）を 3 つ持つ。

| 比較軸 | TORIAI v3 | VPSolver / Gurobi | OptiCut / Cuttinger |
|---|---|---|---|
| 計算性能 (CASE-6 級) | 0.69% gap / 3-29s | < 0.1% gap / < 1s | < 1% / 数秒 |
| ブラウザ動作 | ✅ 純 JS | ❌ デスクトップ | ❌ Windows app |
| 多様解列挙 | ✅ k-best | △ | ❌ |
| 解の説明 | ✅ 日本語自然文 | ❌ | ❌ |
| 構造分析 | ✅ ε-decomposition | ❌ | ❌ |

### 結論（v0.3 honest assessment）

「algebra で CSP の **計算性能** を上げる」研究は半世紀の OR を超える挑戦で、簡単ではなかった。
4 連敗 (Dominance, Branching, Hardness, ナイーブ k-best) を経て、その線では engineering 勝利は得たが
algorithmic 革新は無し。

しかし「algebra で CSP の **ソフトウェア機能** を拡張する」線では、
CSP 文献の空白地帯で **3 つの実装的勝利** を得た:
1. k-best 多様解列挙
2. ε-efficient decomposition
3. Solution Explanation via LP Duality

> **理論的勝利ではなく ソフトウェア工学的勝利**。
> しかし「世界の他 CSP ツールが提供しない機能を持つ」という意味では、
> TORIAI v3 は機能面で **state-of-the-art**。
> これが **honest な現在地** (2026-05-04)。

### 研究 7 連続のスコアカード

| # | テーマ | 結果 |
|---:|---|---|
| 1 | Algebra Dominance pre-solve | ❌ 棄却 |
| 2 | Algebra-Guided branching | ❌ 棄却 |
| 3 | Hardness 予測 | ❌ 棄却 |
| 4 | k-best v0.1 (epsilon) | ❌ バグ |
| 5 | k-best v0.2 (binary disjunctive) | ✅ **勝利** |
| 6 | Decomposition (ε-efficient) | △ 部分支持 |
| 7 | LP Duality Explanation | ✅ **勝利** |

性能向上系 4 連敗 / 機能拡張系 2 勝 + 1 部分支持。

「algorithm が新規性ない」のは事実だが、「機能拡張で空白地帯を埋めた」のも事実。
両方を honest に並べることが、本記事の核心。

---

## 12. 学んだこと

### 1. LLM とペアでやると「幅 × 深さ」の同時開拓ができる

普通のプロジェクトなら:
- アルゴリズム研究 = 数週間
- 実装 = 数日
- テスト = 数日
- ドキュメント = 数日

LLM とペアでやると:
- 設計 + 実装 + テスト + ドキュメントを **同時に進められる**
- 設計書を書きながら実装の詳細を詰められる
- テストを書きながら設計の漏れを発見できる

これが「1 日で 5 週間分」の正体。

### 2. 数値最適化と形式手法は補完的

「algebra で全部解こう」は失敗（algebra は新規パターンを生成できない）。
「FFD で全部済ます」も不十分（最適性の保証がない）。

**FFD で解を作る → algebra で検証する**の組合せが効いた。
- FFD は探索（探索空間に広く投網）
- algebra は検証（解が公理を満たすか確認）

### 3. ブラウザという制約が逆に差別化を生む

VPSolver や Gurobi が使えない縛り → 純 JS 実装の必要 → ユーザーが**ローカルで動かせる**ツールになる。商用ソルバ依存ツールとの最大の差別化点。

### 4. 設計書を先に書く価値

着工日に書いた DESIGN.md（公理系 + 規則 + confluence 証明）が、実装中の判断を全部支えた。「この決定はどの公理に基づくか」を遡れる状態を作っておくと、実装の迷いが減る。

### 5. 失敗を残すことの価値

WORK_LOG, BUG_LOG, DIARY を毎ターン更新。後から振り返ると失敗の系譜が明確に追える。

- BUG-V2-001 (V2 のバグ)
- BUG-V2-002 (V2 の縮退)
- BUG-V3-001 (HiGHS-WASM scaling)
- (BUG 未番号: dual-strategy 単独悪化、Web Worker 配線抜け、HiGHS option parser bug)

---

## 13. ソースコード

GitHub: [jjjaddd/toriaisteel](https://github.com/jjjaddd/toriaisteel)

- 本番デモ: [toriai.app](https://toriai.app/)
- 関連 docs:
  - `docs/ALGEBRA_DESIGN.md` — 公理系の正式定義 + 全 critical pair の合流証明
  - `docs/ALGEBRA_PLAN.md` — 5 週間 → 1 日の進捗ログ
  - `docs/ALGEBRA_BENCHMARK.md` — V2 vs V3 ベンチ結果
  - `docs/ALGEBRA_DIARY.md` — 開発日記（この記事の元ネタ）
  - `docs/ALGEBRA_BUG_LOG.md` — 遭遇したバグ全記録

---

## 14. 謝辞

- **Anthropic Claude (Opus 4.7)**: 設計、実装、テスト、執筆まで丸 1 日伴走
- **HiGHS team (University of Edinburgh)**: 高品質の MIT ライセンス LP/MIP ソルバ
- **lovasoa**: HiGHS の WASM 化 (`highs-js`) — これがなければ全部成立しなかった
- **Valério de Carvalho 1999**: Arc-Flow 形式化
- **Gilmore & Gomory 1961**: Column Generation
- **Johnson 1973**: First Fit Decreasing の理論的バウンド
- **Newman 1942**: 算法体系の合流性補題
- **TORIAI ユーザー**: 現場の数値感覚で V2 のバグを見抜いた人。この方の指摘が無ければ V3 は生まれなかった

---

## 付録: 全 Commit 履歴（時系列、2026-05-03）

```
f0086ba  chore(docs): archive obsolete docs to OLD_DOC
0d48dab  docs(algebra): bootstrap V3 project + register V2 failure case
f486c00  docs(algebra): Phase 0 — critical-pair confluence proof
20bbeee  feat(algebra): Phase 1 day-1 TERM module
c8ea3c3  feat(algebra): Phase 1 day-2 axioms + WORK_LOG protocol
53d3255  feat(algebra): Phase 1 day-3 rewriteRules
db87985  feat(algebra): Phase 1 complete (normalForm + criticalPairs)
93cd671  test(algebra): real 6 cases fixture
38084a9  feat(arcflow): Phase 2 day-1 HiGHS adapter
7a5680c  feat(arcflow): Phase 2 day-2 graph builder
b85e507  feat(arcflow): Phase 2 day-3 solver (BUG-V2-001 micro 解ける)
33f23d1  feat(arcflow): Phase 2 day-4 FFD fallback
c0a2547  feat(arcflow): Phase 2 day-5 multi-stock FFD (V3 が CASE-2/CASE-6 で V2 超え)
73c6754  feat(arcflow): Phase 2 day-6 multiStockGuard
5d9e7f7  feat(algebra): Phase 3 day-1 algorithmV3.js drop-in
8832d82  feat(prod): Phase 3 day-2 本番配線
253099d  fix(prod): Web Worker に V3 配線
aeb1ded  fix(arcflow): dual-strategy（1222×333 で V3 win）
2ca45b6  feat(arcflow): local search 後処理
ede4e60  feat(arcflow): Phase 2 day-7 Column Generation (CASE-2 LP-tight)
a4cf3d5  feat(algebra): Algebra Bridge — V3 が algebra 正規形を満たす実証
```

5 週間予定が **1 日 (約 7 時間)** で完了。

---

**質問・フィードバック歓迎です。Twitter @genji or GitHub issues まで。**
