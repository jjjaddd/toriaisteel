# RESEARCH: Dual-Algebra LP — Exact-Arithmetic CSP Solver

**Status**: design v0.1 — 2026-05-04 08:00
**Author**: Claude (Opus 4.7)
**Goal**: 世界初の **browser-based exact-arithmetic CSP solver** を作り、半世紀の OR (全部 float) と差別化された軸で勝つ
**Sessions**: K-1（本セッション）→ K-2 → K-3 → K-4 の 4 段階分割

---

## 0. 一行サマリー

> CSP の LP 緩和を **BigInt rational arithmetic** で厳密に解き、reduced cost も整数比で出力する。
> 浮動小数点誤差ゼロ、整数性判定が確定的、最適性証明が **algebra normal form** で書き下せる。
> 半世紀の OR が全部 float（速度優先）でやってきたのに対し、**正しさ優先**という別軸で TORIAI が世界初を取る。

---

## 1. 動機 — なぜ K が「超える」候補か

### 1.1 半世紀の OR は全部 float

VPSolver / Gurobi / HiGHS / OR-Tools — **全部 IEEE 754 double precision**:
- LP solver の中核は数値線形代数
- pivot で誤差累積、EPS=1e-9 で「ほぼゼロ」を判定
- B&B で「ほぼ整数」かどうかを 1e-6 で判定
- pricing で "ほぼ negative reduced cost" の pattern を取り損ねる

「**正しさ**」は工業上は十分な精度だが、**理論上は近似解**。

### 1.2 既知の数値ノイズ実例（本プロジェクトで観測済）

我々の `bb/lp.js`（float tableau simplex）でも観測した:
- CASE-6 で my LP=719,128 vs HiGHS LP=719,350（**222 mm の drift**）
- B&B child node で `unbounded` 偽陽性（数値ノイズ起因、防御コードで prune）
- LP-rounded vs B&B-bb で 1mm 差（CASE-3 の 239,000 vs 238,000、丸めの誤差幅内）

これらはすべて **float 演算の累積誤差**。実用上は OK だが、**「証明可能な最適」を主張するなら exact 演算が必要**。

### 1.3 文献調査

- **Exact LP solvers (general)**:
  - GMP-based simplex: 学術界で 90 年代から研究、SCIP の exact mode 等
  - QSopt-Exact: David Applegate 2000 年代、教育 / 検証用
- **Browser-based CSP solver**:
  - 我々の TORIAI と HiGHS-WASM くらい
- **Browser-based exact CSP**:
  - **ゼロ件**（Claude 知識ベース 2026-01）
- **Algebra-derived optimality certificates for CSP**:
  - **ゼロ件**

→ **世界初の主張は妥当**。

### 1.4 なぜ今だから可能か

- BigInt が ES2020 で標準化、modern browsers (Chrome 67+, FF 68+, Safari 14+) で利用可能
- Phase 1 algebra で pattern を symbolic に扱う基礎ができている
- JS-native B&B の infra が揃っている (今日の研究 5)

→ **2020 年以前は browser で BigInt 演算が標準で出来なかった**。今だからこそ。

---

## 2. 仮説

### H1（強、main）
BigInt rational arithmetic で simplex を実装すれば、CSP の LP 緩和は**厳密に**解ける。

### H2（中）
H1 のもとで B&B prune 判定が**厳密**になり、float 版で起きていた数値ノイズ起因の bug（unbounded 偽陽性等）が消滅する。

### H3（強、stretch）
exact LP の reduced cost を Phase 1 algebra の term として表現すれば、**最適性証明** (algebraic certificate) を生成可能。

### H4（理論、超 stretch）
exact 演算で float 版より「**良い解**」が見つかるケースが存在する（数値ノイズで取り逃していた pattern が拾える）。

### H5（実用、neg）
exact 演算は float の 10-100 倍遅い。**実用速度では超えない**ことを honest に認める。

---

## 3. 形式化

### 3.1 Rational number

```
Rational = { num: BigInt, den: BigInt }
```
不変条件:
- `den > 0`
- `gcd(|num|, den) == 1` (canonical form)
- `0` は `{0, 1}` で表現

演算:
- `add(a, b) = { a.num*b.den + b.num*a.den, a.den*b.den } → reduce`
- `mul(a, b) = { a.num*b.num, a.den*b.den } → reduce`
- 比較: `a < b ⇔ a.num*b.den < b.num*a.den` (sign-preserving)
- 整数判定: `a.den == 1`

### 3.2 Rational Simplex

`bb/lp.js`（float tableau simplex）を Rational に置き換え:
- tableau: 2D array of Rational
- pivot 操作: rational 演算（誤差なし）
- comparisons: 厳密（EPS 不要）
- Bland's rule で degeneracy 回避（同じ）

API（互換性最大化）:
```js
solveLPExact(spec) → {
  status: 'optimal' | 'infeasible' | 'unbounded' | 'iterlimit',
  x: Rational[],          // 厳密解
  objective: Rational,    // 厳密最適値
  iterations: number,
  // 互換用
  xFloat: number[],       // toNumber() 変換版
  objectiveFloat: number
}
```

### 3.3 整数性 / 最適性

LP 解 `x*` が整数か:
```
isIntegerLP(x*) ⇔ ∀p: x*_p.den == 1
```

MIP 整数最適 `x_int` と LP 緩和 `x*` の関係（exact）:
```
gap = (c·x_int − c·x*) / |c·x*|     # 全部 Rational、誤差なし
```

CSP の near-LP-tightness を**厳密に**測れる。

### 3.4 Algebraic Certificate (H3 stretch)

LP optimum の simplex 過程を pivot 列として記録:
```
PivotTrace = [(enter_var, leave_var, pivot_value)] × n_pivots
```

各 pivot は Rational 値で記録される。最適解の reduced cost ≤ 0 を「すべての非基底変数で
`c_j − Σ y_i a_{i,j} ≥ 0`」の形で出力できる（y は最終 dual）。

これは **algebraic certificate of optimality** — float では証明にならないが、Rational なら正式な証明になる。

---

## 4. 段階分割（4 セッション）

### K-1（本セッション）
- RESEARCH_DUAL_ALGEBRA.md 起草（本ドキュメント）
- `Rational` class 実装 + tests
- `solveLPExact` 実装（two-phase simplex on Rational）+ tests
- 教科書 LP で exact result 一致確認
- CASE-2 / CASE-6 で float LP と exact LP の数値差分を測定

### K-2（次セッション以降）
- `solveMIPExact` 実装（B&B with rational LP）
- 既存 MIP テスト群を exact 版でも pass 確認
- 整数 gap の exact 測定

### K-3（さらに後）
- `solveColumnGenExact` 実装（CG 全段 exact）
- CASE-2 / CASE-6 を exact arithmetic で完走
- 速度比較: exact vs float（おそらく 10-100x 遅）

### K-4（最終）
- algebraic certificate 生成 (H3)
- Qiita §11 大幅更新「世界初の exact CSP solver」
- Phase 4 (UI 配線) と統合可能性検討

### この設計の根拠

- K-1 で **rational arithmetic の基礎**を固める。これが他の段階の前提
- K-2, K-3 は K-1 の実装上に直接乗る（API 互換）
- 各段階が独立に commit できる、間で stop しても部分的に成果が残る

---

## 5. 期待される結果

### K-1 で得られるもの
- `Rational` class: 数値計算ライブラリの基礎
- `solveLPExact`: 教科書 LP を exact に解く
- 観察: 数値ドリフトの量化（CASE-6 で my-LP vs HiGHS-LP の 222mm 差は浮動小数点 EPS の累積か、formulation 差か）

### K-1 のリスク
- BigInt 演算が想定より遅い（pivot あたり 100ms+ → CASE-6 で実用外）
- 大きい number で BigInt が overflow しないが、ratio の reduce が重くなる
- gcd の効率（Euclidean は OK だが、毎演算で gcd するか）

### 性能予測

```
CASE-2 (m≈5, n≈7): float 138ms → exact ~1-5 sec
CASE-6 (m≈62, n≈80): float 22 sec → exact ~5-30 min（実用外）
```

実用上は CASE-6 を exact で解くのは厳しい。
だが「**exact で動く実装が存在する**」「**理論上は exact**」が世界初の根拠になる。

---

## 6. Falsification

- **H1 棄却条件**: rational simplex が小規模 LP で誤った解を返す（実装バグ）
- **H2 棄却条件**: B&B with rational LP が float 版より少ない異常検出
- **H3 はチャレンジ**: certificate が algebra term として表現できなければ stretch 棄却
- **H4 はデータ次第**: float vs exact で異なる解が見つかるか実測
- **H5 は受容**: 速度では超えない、これは honest

---

## 7. 「超える」とは何か（v0.3）

K で超えるのは:

❌ 計算速度（float に勝てない）
❌ 大規模 instance の現実的解時間（exact は遅い）

✅ **数値正しさ**: 浮動小数点誤差ゼロの CSP 解
✅ **証明可能性**: algebra-based optimality certificate
✅ **世界初**: browser で動く exact CSP solver
✅ **Qiita §11**: "TORIAI is the first browser-based exact-arithmetic CSP solver"

これは半世紀の OR が「速度」一本足で発展してきたのに対し、
**TORIAI は browser × exact × algebra という別軸でユニーク**になる。

---

## 8. 進捗ログ

- 2026-05-04 **08:00** v0.1 起草、K-1 着手
