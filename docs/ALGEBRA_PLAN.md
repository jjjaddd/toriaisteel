# Symbolic Pattern Algebra — 実行計画 / TODO / スケジュール / 前提

> 関連: [ALGEBRA_DESIGN.md](./ALGEBRA_DESIGN.md), [ALGEBRA_BUG_LOG.md](./ALGEBRA_BUG_LOG.md), [ALGEBRA_DIARY.md](./ALGEBRA_DIARY.md), [WORK_LOG.md](./WORK_LOG.md)

---

## 0. 並走 AI 向け重要通知（ここを最初に読むこと）

**2026-05-03 から TORIAI 計算エンジン v3「代数版」プロジェクトが進行中**。Claude が主担当、Codex/Gemini と並走可能性あり。

### コミット衝突回避ルール

| ルール | 内容 |
|---|---|
| 編集禁止ファイル | `src/calculation/yield/` 配下の **既存ファイル全部**（V1 / V2）。Phase 4 まで誰も触らない |
| 新規ディレクトリ | `src/calculation/yield/algebra/` と `src/calculation/yield/arcflow/` は本プロジェクト専用 |
| 共有ドキュメント | `docs/ALGEBRA_*.md` は本プロジェクト専用、他 AI は読むだけ |
| WORK_LOG | 今までどおり毎ターン追記 |
| コミット prefix | `feat(algebra):`, `fix(algebra):`, `docs(algebra):`, `test(algebra):`, `chore(algebra):` |
| ブランチ | 当面 `main` 直 push（既存運用踏襲）。荒れたら `feature/algebra` 切る |
| データタブ等の他作業 | 影響しない、並走 OK |

並走 AI が触ってよいもの:
- `src/features/`, `src/data/`, `src/styles/`, `src/ui/` 配下（UI / データ）
- `tests/` 配下（既存テストの修正）
- 既存ドキュメント（CLAUDE.md, AI_RULES.md など）

並走 AI が**触ってはいけない**もの:
- `src/calculation/yield/algebra/**` (本プロジェクト専用)
- `src/calculation/yield/arcflow/**` (本プロジェクト専用)
- `src/calculation/yield/algorithmV3.js` (本プロジェクト専用)
- `src/calculation/yield/{algorithmV2.js, calcCore.js, patternPacking.js, repeatPlans.js, columnGeneration.js, cgClient.js}` (互換維持のため凍結)
- `docs/ALGEBRA_*.md` (本プロジェクト専用)

---

## 1. 開始前チェックリスト

実装着手前に**必ず**全項目をチェック。Phase 1 開始時にユーザーが確認。

### 1.1 環境

- [ ] Node.js / npm が動く（`npm --version`）
- [ ] `npx jest --runInBand` で既存テスト全 pass を確認
- [ ] `git status` がクリーン（または明示的に把握済）
- [ ] `git pull` で最新化済

### 1.2 プロジェクト

- [ ] 失敗ケースの具体データを 1 件以上保管（`docs/ALGEBRA_BUG_LOG.md` の「再現入力」に書く）
- [ ] 現 V2 の挙動をベンチで記録（V3 との比較基準）
- [ ] 凍結ファイルリストを並走 AI に共有済（このファイルがそれ）
- [ ] `algebraConfig.rollback()` の発火条件を合意

### 1.3 設計

- [ ] [ALGEBRA_DESIGN.md](./ALGEBRA_DESIGN.md) v0.1 をユーザーがレビュー済
- [ ] 公理 A1-A9 と簡約規則 R1-R5 に異論なし
- [ ] 純関数原則（副作用なし）を全員合意
- [ ] フォールバック設計を合意

### 1.4 依存

- [ ] HiGHS-WASM の組込判断（Phase 2 までに決定）。MIT ライセンス確認済
- [ ] 追加 npm パッケージは原則ゼロ（`fast-check` だけは property test 用に Phase 1 で検討）

---

## 2. フェーズ別 TODO

### Phase 0: 設計確定（2026-05-03 〜 2026-05-05）

実装ゼロ、ドキュメントのみ。

- [x] [ALGEBRA_DESIGN.md](./ALGEBRA_DESIGN.md) ドラフト作成
- [x] [ALGEBRA_PLAN.md](./ALGEBRA_PLAN.md) ドラフト作成（このファイル）
- [x] [ALGEBRA_BUG_LOG.md](./ALGEBRA_BUG_LOG.md) テンプレ作成
- [x] [ALGEBRA_DIARY.md](./ALGEBRA_DIARY.md) 起筆
- [x] ユーザーレビュー（公理・規則・フォールバック方針）— 2026-05-03 異論なし
- [x] critical pair の事前列挙（紙ベース）— DESIGN §1.6.3 で 15 ペア完備
- [x] V2 の失敗ケース最低 1 件を BUG_LOG に登録 — BUG-V2-001 (1222×334 / blade=3 / endloss=150)
- [ ] V2 ベンチマーク基準値（k=5/10/15/20 で yield, time）を測定して記録 — Phase 4 で実施

**Definition of Done**: ユーザー承認 ✓ + critical pair 列挙完了 ✓ + V2 基準値記録（後送り）

### Phase 1: Term と正規形（2026-05-03 完了 ※当初予定 05-06〜05-12 を大幅前倒し）

代数の心臓部。コードはここから。

- [x] `src/calculation/yield/algebra/term.js` — TERM/PATTERN/PLAN コンストラクタ + バリデータ（commit 20bbeee, 29 tests）
- [x] `src/calculation/yield/algebra/axioms.js` — 公理 A1-A9 検証述語 + concatPlan/planEquivalent（commit c8ea3c3, 35 tests）
- [x] `src/calculation/yield/algebra/rewriteRules.js` — R1-R5 純関数 + step ディスパッチャ（commit 53d3255, 34 tests）
- [x] `src/calculation/yield/algebra/normalForm.js` — fixed-point 簡約器 + isNormalForm + normalizeWithMetrics
- [x] `tests/algebra/term.test.js` — 構築 / バリデーション（29 tests）
- [x] `tests/algebra/normalForm.test.js` — confluence / termination / 同型検出（18 tests）
- [x] `tests/algebra/criticalPairs.test.js` — DESIGN §1.6.3 全 15 ペア合流確認（18 tests）
- [x] termination 証明を [ALGEBRA_DESIGN.md §1.6](./ALGEBRA_DESIGN.md) に追記（v0.2 で完備）

**Definition of Done**: 全テスト pass ✓（142 / 142）+ confluence 文書化 ✓ + V3 はまだ非配線 ✓

**Phase 1 副産物**:
- BUG-V2-001 が **`normalize(v2Plan, ctx)` を 1 回呼ぶだけで Optimal plan に到達** することを実コード実証（trace = ['R5.dominance(plan)']、母材 420,000mm → 418,000mm = -2,000mm）
- DESIGN A3 の表記不正確を発見（v0.3 で訂正予定）
- AI_RULES §9 として WORK_LOG 並走編集プロトコルを追加（並走衝突事故対応）

### Phase 2: Arc-Flow + HiGHS（2026-05-13 〜 2026-05-19）

数値ソルバー基盤。E が失敗してもこれだけで V2 を上回る保険になる。

- [ ] HiGHS-WASM を `node_modules` 経由 or 静的同梱で導入
- [ ] `src/calculation/yield/arcflow/graph.js` — DAG 構築
- [ ] `src/calculation/yield/arcflow/highsAdapter.js` — ソルバー呼出
- [ ] `src/calculation/yield/arcflow/lpRelaxation.js` — LP 緩和と下界
- [ ] `src/calculation/yield/arcflow/multiStockGuard.js` — 単一定尺縮退検知
- [ ] `tests/arcflow/*.test.js` — 小規模インスタンスで V1 と一致確認
- [ ] WASM lazy load の動作確認

**Definition of Done**: k=10/20/30 で V1 と同一結果、複数定尺縮退ゼロ、WASM 初期ロード <500ms

### Phase 3: 等価類圧縮 → MIP 統合（2026-05-20 〜 2026-05-26）

代数と数値の橋渡し。これが本プロジェクトの目玉。

- [ ] `src/calculation/yield/algebra/equivClasses.js` — 等価類管理
- [ ] `src/calculation/yield/algebra/dualReasoning.js` — 双対変数のシンボリック推論
- [ ] `src/calculation/yield/algebra/solver.js` — 代数 → MIP の変換
- [ ] 5 種既存パターン（歩留最大/A/B/C/残材優先）の目的関数定義
- [ ] `src/calculation/yield/algorithmV3.js` — drop-in patch、V2 を patch
- [ ] `tests/algebra/equivClasses.test.js`
- [ ] `tests/algebra/integration.test.js` — V1 出力との diff テスト

**Definition of Done**: V1 出力と一致 + V2 の選択ミス再現せず + フォールバック経路テスト pass

### Phase 4: ベンチ & 既存置換判定（2026-05-27 〜 2026-06-02）

成功なら本番化、失敗なら rollback デフォルト ON で延命。

- [ ] ベンチマークスクリプト `tests/algebra/bench.js`
- [ ] V1 / V2 / V3 を同条件で 50 ケース比較
- [ ] yield / time / memory の三軸でスコア化
- [ ] 成功条件（[DESIGN §5.1](./ALGEBRA_DESIGN.md#5-成功条件--失敗条件)）の合否を文書化
- [ ] 成功 → `index.html` の script 順に `algorithmV3.js` を追加し本番化
- [ ] 失敗 → `algebraConfig.rollback()` を index.html ロード直後に呼んで V2 動作

**Definition of Done**: 成功/失敗どちらでもユーザー判断材料が揃う

### Phase 5: 並走（全期間）

- [ ] 各 Phase 着手前に WORK_LOG / DIARY 更新
- [ ] バグや想定違いはその場で BUG_LOG に登録
- [ ] フォールバック経路は **常に動く状態**を維持
- [ ] commit prefix `feat(algebra):` 等を厳守
- [ ] Qiita 公開を見据えて DIARY を読み物として整える

---

## 3. スケジュール

```
2026-05-03 (Sun) ┬ Phase 0 開始
2026-05-04 (Mon) │
2026-05-05 (Tue) ┴ Phase 0 終了 → ユーザーレビュー
2026-05-06 (Wed) ┬ Phase 1 開始（term.js, normalForm.js）
2026-05-07 (Thu) │
2026-05-08 (Fri) │
2026-05-09 (Sat) │
2026-05-10 (Sun) │
2026-05-11 (Mon) │
2026-05-12 (Tue) ┴ Phase 1 終了
2026-05-13 (Wed) ┬ Phase 2 開始（HiGHS-WASM 統合）
                 │
2026-05-19 (Tue) ┴ Phase 2 終了
2026-05-20 (Wed) ┬ Phase 3 開始（等価類 + MIP）
                 │
2026-05-26 (Tue) ┴ Phase 3 終了
2026-05-27 (Wed) ┬ Phase 4 開始（ベンチ + 本番化判定）
                 │
2026-06-02 (Tue) ┴ Phase 4 終了 → 成否確定
2026-06-03 (Wed) → 成功時: Qiita 公開記事整備
                 → 失敗時: 何が学べたかを DIARY に総括
```

バッファ: 各 Phase に +2 日の余裕。1 Phase 遅延なら全体 +2 日、全 Phase 遅延なら最大 +10 日まで許容（2026-06-12 まで）。

---

## 4. 失敗時の rollback 詳細

### 4.1 rollback の階段

```
レベル 0: V3 を使う（デフォルト目標）
レベル 1: algebraConfig.rollback()  → V2 動作
レベル 2: algorithmV2Config.rollback() → V1 動作
レベル 3: index.html から V3 / V2 のスクリプト除去 → 完全 V1 復帰
```

### 4.2 自動 fallback トリガー

`algorithmV3.js` の wrapper が以下のいずれかで自動的に V2 へ委譲:

1. 例外発生
2. 結果の `isValid` チェック失敗
3. `yield < V2 の yield` を検出
4. 計算時間が `options.deadlineMs` を超過
5. `Toriai.calculation.yield.algebraConfig.kill()` が呼ばれた状態

ユーザーは設定画面 or コンソールで `algebraConfig.kill()` を実行できる（Phase 3 で実装）。

### 4.3 完全撤退手順

V3 を完全に消したい場合:

```
1. index.html の <script src="...algorithmV3.js"> を削除
2. (任意) src/calculation/yield/algebra/ ディレクトリを削除
3. (任意) src/calculation/yield/arcflow/ ディレクトリを削除
4. 関連 docs/ALGEBRA_*.md は履歴として残す
```

V1 / V2 ファイルは Phase 4 まで一切変更されないので、撤退すれば**ビット単位で 2026-05-03 の状態に戻る**。

---

## 5. テスト戦略

### 5.1 単体テスト

- Jest（既存）
- カバレッジ目標: `algebra/*` で 90%+
- property-based test を `fast-check` で導入（Phase 1）

### 5.2 統合テスト

- V1 の出力をゴールデンとして V3 と diff
- ゴールデン更新は手動承認制

### 5.3 ベンチマーク

- `tests/algebra/bench.js` で V1/V2/V3 を同条件比較
- 入力サイズ: k ∈ {5, 10, 15, 20, 30}, n ∈ {20, 50, 100, 200, 500}
- 出力: yield, 時間, メモリ, 単一定尺縮退の有無

### 5.4 リグレッション

- 既存 `tests/calc.test.js`, `tests/storage.test.js` は無傷で pass し続ける
- BUG_LOG に登録した失敗ケースを再現テスト化

---

## 6. リスクトラッキング

[ALGEBRA_DESIGN.md §6](./ALGEBRA_DESIGN.md#6-リスクと未解決課題) に転記。重大度が変わったらここで再評価。
