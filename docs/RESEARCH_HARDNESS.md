# RESEARCH: CSP インスタンス難易度の Algebra-Derived 予測

**Status**: design v0.1 — 2026-05-03 23:45
**Author**: Claude (Opus 4.7)
**Predecessors**:
- `RESEARCH_DOMINANCE.md` — pattern dominance pre-solve（棄却）
- `RESEARCH_BB_ALGEBRA.md` — algebra-guided branching（棄却）+ B&B 本番配線（成功）

---

## 0. 一行サマリー

> CSP インスタンスの algebra-derived 特徴量と LP gap (整数最適と LP 緩和の差) の相関を 6 ケースで実測する。
> 「どの特徴がインスタンスを hard にするか」を経験的に明らかにし、TORIAI の routing 判断（easy → fast path、hard → deep B&B）の根拠にする。

---

## 1. 動機

### 1.1 今日 2 連続で見えたパターン

両研究 (Dominance, Branching) で「CG が Pareto 性で signal を吸収する」現象を観測した。
これは「**CG output 後に algebra を効かせる**」アプローチへの反証。

しかし「**CG を走らせる前に algebra でインスタンス分析する**」はまだ試してない。
入力側の algebra 解析は CG が手をつけられない領域。

### 1.2 実用ニーズ

CASE-2 (k=5) と CASE-6 (k=60+) では計算時間が桁違い。
全ケースに deep B&B を当てるのは過剰、簡単なケースは FFD で十分。

> **input を見て 1 秒以内に "this is easy" / "this is hard" を判定したい**

これができれば routing が自動化される。

### 1.3 文献調査

- 一般 MIP のインスタンス難易度予測 (ML-based): 既存研究多数 (Khalil et al. 2017 など)
- CSP 専用の難易度予測: ほぼ見当たらない
- Algebra-derived 特徴量を使うアプローチ: 文献ゼロ（再確認）

→ 形式的に novel。ただし 6 ケースのデータ量では「予測モデル」は名乗れず、**経験的観察**レベル。

---

## 2. 仮説

### H1（弱い、main）
LP gap (= 整数最適 − LP 緩和) はインスタンスの少数の特徴量で大まかに説明できる。

### H2（中、optional）
Algebra-derived 特徴量（pattern multiset 構造、demand 分布の偏り等）が、単純な n / k より gap を良く予測する。

### H3（強、stretch）
LP gap を高精度に予測するモデルが builder で、TORIAI 本体の routing に組み込める。

→ 6 ケースしかないので H3 は今回の射程外。H1 / H2 が target。

---

## 3. 特徴量設計

### 3.1 Basic Features（CSP 文献での標準的指標）

| Feature | 定義 | 期待される効果 |
|---|---|---|
| `k` | piece type 数（distinct lengths） | k 大 → 組合せ多 → hard |
| `n` | 総 demand (Σ d_i) | n 大 → bar 多 → 計算量大 |
| `L_max` | max(piece length) | 切代/端落としに対する余裕 |
| `L_span` | max(piece) − min(piece) | 多様性、混在パッキング難しさ |
| `S_count` | available stocks 数 | stock 多 → 自由度高 → hard? |
| `S_span` | max(stock) − min(stock) | stock 選択の自由度 |
| `density` | avg(piece_len) / avg(stock) | 1 stock あたりの packing 期待数 |

### 3.2 Algebra-Derived Features（本研究の hypothesis）

| Feature | 定義 | 仮説的効果 |
|---|---|---|
| `multiset_complexity` | distinct piece multi-set 数の expected count | algebra normal form の表現の豊富さ |
| `demand_skew` | gini(demand) — demand 偏り | 偏り大 → 専用 pattern 増加 |
| `length_clusters` | DBSCAN-like clustering の cluster 数 | 似た長さは同 pattern にまとまる |
| `R5_potential` | 各 piece set の R5 (stock-down) 可能性 | dominance の起こりやすさ |
| `pattern_density` | LP-tight pattern 集合の予想サイズ | CG 後の active pattern 数 |

### 3.3 Outcome Variables

| Variable | 定義 |
|---|---|
| `lp_obj` | LP 緩和の最適値 |
| `ip_obj` | 整数最適値（B&B で得られる） |
| `lp_gap_pct` | (ip_obj − lp_obj) / lp_obj × 100 |
| `wall_ms` | CG + B&B の総 wall time |
| `cg_iter` | CG 反復回数 |
| `bb_nodes` | B&B 探索 node 数 |

---

## 4. 実験計画

### 4.1 ベンチマーク対象
`tests/fixtures/realCases.js` の 6 ケース全て (CASE-1〜6)。

### 4.2 計測スクリプト
新規ファイル: `tests/research/hardness.test.js`
- 各 ケースで feature 計算 (`computeInstanceFeatures(spec)`)
- `solveColumnGen(spec)` 実行、outcome 計測
- 結果を CSV 形式 console.log

### 4.3 実装場所
`src/calculation/yield/research/instanceFeatures.js` (新規、純関数、依存ゼロ)

### 4.4 出力例
```
case_id,k,n,L_max,L_span,S_count,density,demand_skew,lp_obj,ip_obj,lp_gap_pct,wall_ms,bb_nodes
CASE-1,2,100,292,116,10,0.029,0.92,?,?,?,?,?
CASE-2,5,192,2806,1056,8,0.27,0.23,442000,442000,0.00,180,3
...
```

---

## 5. 分析

### 5.1 単変量相関
各 feature と `lp_gap_pct` の Pearson 相関係数を計算。

### 5.2 多変量視点
6 ケースしかないので回帰は無理。代わりに散布図 (mental model):
- CASE-2 LP gap = 0%（LP-tight、簡単）
- CASE-6 LP gap = 0.69%（ほぼ LP-tight、複雑だが CG が解いた）
- 他は未測定

### 5.3 Failure modes
仮説が立たないとき:
- gap がどのケースも 1% 以下 → CSP は構造的に LP-tight な問題群
- feature 全部の相関弱い → algebra-derived も他も予測力なし

→ negative result でも記録。Qiita §11 素材になる。

---

## 6. リスク

| リスク | 対策 |
|---|---|
| 全ケース LP-tight で gap 比較できない | gap が 0% でも `wall_ms` や `bb_nodes` に分散があれば代替指標になる |
| 6 ケースは少なすぎる | 合成インスタンス追加（後日） |
| feature 計算が高コスト | 純粋構造的特徴のみ（algebra normal form 計算は重いので最小限） |
| HiGHS-WASM がいくつかケースで stack overflow | B&B フォールバックは既に配線済 (`f9fdfee`) |

---

## 7. 期待される deliverable

### M1: Feature 計算ライブラリ
`src/calculation/yield/research/instanceFeatures.js`

### M2: ベンチマークスクリプト
`tests/research/hardness.test.js` — CASE-1〜6 で feature + outcome 計測

### M3: 分析ドキュメント
`docs/HARDNESS_RESULTS.md` — feature テーブル + 観察された相関 + 結論

### M4: TORIAI への routing 判断指標（H3 達成時のみ）
`src/calculation/yield/orchestration.js` で feature → routing logic

---

## 8. 進捗ログ

- 2026-05-03 **23:45** v0.1 起草。実装着手。
