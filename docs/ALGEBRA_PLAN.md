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

### Phase 2: Arc-Flow + HiGHS（2026-05-03 完了 ※当初予定 05-13〜05-19）

数値ソルバー基盤。E が失敗してもこれだけで V2 を上回る保険になる。

- [x] **day-1**: HiGHS-WASM を `node_modules` 経由で導入、`highsAdapter.js` 実装（commit 38084a9, 7 tests）
  - 罠発見: `output_flag: false` を渡すと解テキスト消失 → docs に記載
- [x] **day-2**: `arcflow/graph.js` Compact Arc-Flow グラフ構築（commit 7a5680c, 27 tests）
  - Phantom blade trick / per-bar item cap
- [x] **day-3**: `arcflow/solver.js` LP/MIP solver 統合（commit b85e507, 9 tests + 1 skip）
  - BUG-V2-001 micro が end-to-end で正解 (8m / loss 503)
  - 大規模で MIP Aborted 発見 → BUG-V3-001 登録
- [x] **day-4**: FFD フォールバック実装、`solveSingleStockRobust` で MIP→FFD 階段（commit 33f23d1, 6 tests）
  - BUG-V3-001 緩和（中規模で必ず解を返す）
- [x] **day-5**: **multi-stock FFD 実装**（commit c0a2547, 7 tests）
  - **CASE-2 で V3 が V2 超え（37 bars vs 60 bars、母材同等、本数 -38%）**
  - **CASE-6 で 3 軸全勝（62 bars / 723,500mm / 95.21% vs V2 67/737,000/93.5%）**
  - BUG-V2-002 完全解消（V2 の単一定尺縮退）
- [x] **day-6**: `arcflow/multiStockGuard.js` — 解品質診断 + 縮退検知（commit 73c6754, 15 tests）
  - `computeLowerBound`, `assessSolution`, `assertSolutionQuality`
  - CASE-6 の V3=62 vs LB=59 → gap 3 bars だけ
- [x] **day-7**: **Column Generation (Gilmore-Gomory) 実装**（commit ede4e60, 13 tests）
  - **CASE-2 で LP-tight 最適解 (lpGap=0%) 達成、442,000mm = 証明的最適**
  - `solveBest(spec)` で CG/FFD の良い方を picked
  - CASE-6 規模では MIP fail → LP rounding overshoot で FFD 採用される設計

**Definition of Done**: ✅ HiGHS-WASM 動作 / multi-stock 対応 / CASE-2/CASE-6 で V2 超え / CG で LP-tight / FFD 後処理 (local search) 含む

### Phase 3: V3 本番配線（2026-05-03 完了 ※当初予定 05-20〜05-26 を「V3 production wiring」に再定義）

代数と数値の橋渡し → drop-in patch として本番配線。

- [x] **day-1**: `algorithmV3.js` drop-in patch 実装（commit 5d9e7f7, 10 tests）
  - V2 の calcCore をラップ、V3 multi-stock FFD 結果を allDP に追加 → yieldCard1 自動更新
  - feature flag (`v3Config.rollback()` / `enable()`)
  - V2 の patA/patB/patC/single/chgPlans は無変更
- [x] **day-2**: 本番配線（commits 8832d82 / 253099d / aeb1ded / f376482 / 2ca45b6）
  - index.html に script タグ追加
  - **真の原因発見**: Web Worker (`yieldWorker.js`) が algorithmV3.js を import してなかった → 修正
  - dual-strategy multi-stock FFD で 1222×333 を解いて V2 (96.9%) → V3 (97.58%) に
  - V3 desc に最適性メタ情報埋込（[V3 / V2比 +X.XX%] / [V3 / LP最適]）
  - Local Search 後処理（バー削減）追加 — 既存ケースで効果ないが将来保険
- [x] **algebra integration**: `arcflow/algebraBridge.js` で Phase 1 algebra を V3 validator として接続（commit a4cf3d5, 10 tests）
  - **全 5 実ケースで V3 出力が algebra 正規形を満たすことを実証**
  - Phase 1 の研究投資が production validator として活きる

**Definition of Done**: ✅ 本番配線完了（toriai.app で V3 動作）/ 5 実ケースで algebra 正規形 / リグレッションテスト体制完成

### Phase 4: ベンチ & 既存置換判定（未着手 ※当初 05-27〜06-02）

成功なら本番化（既に達成）、残りは「証明書類の整備」フェーズ。

- [ ] CASE-1/3/4/5 で V2 baseline を取得
- [ ] 全 6 ケースの V2 vs V3 完全比較表を `BENCHMARK.md` に記入
- [x] V3 を `index.html` の script 順に追加し本番化（Phase 3 day-2 で完了）
- [x] feature flag による rollback 機構（Phase 3 day-1 で完了）
- [ ] CASE-6 規模の MIP scaling 改善（subset MIP / 対称性削減 → CG 化を完成）
- [ ] ブラウザに CG 配線（async calcCore 化 or Worker 内 CG）

**Definition of Done**: 全 6 ケースで V3 が V2 以上 + 数字を BENCHMARK.md に記録 + Qiita 記事の起草開始

### Phase 5: 並走（全期間）

- [x] 各 Phase 着手前に WORK_LOG / DIARY 更新
- [x] バグや想定違いはその場で BUG_LOG に登録（BUG-V3-001 登録 → 緩和済）
- [x] フォールバック経路は **常に動く状態**を維持（FFD は常に解を返す）
- [x] commit prefix `feat(algebra):` 等を厳守
- [ ] Qiita 公開を見据えて DIARY を読み物として整える（着工日 + Phase 1 完了 + Phase 3 day-1 + algebra bridge の 4 エントリ済）

---

## 3. スケジュール

### 当初計画（5 週間）

```
05-03 ┬ Phase 0 (3日) ─ 設計確定
05-06 ┴ Phase 1 (1週) ─ Algebra
05-13 ┬ Phase 2 (1週) ─ Arc-Flow + HiGHS
05-20 ┬ Phase 3 (1週) ─ 等価類 + MIP
05-27 ┬ Phase 4 (1週) ─ ベンチ + 本番化
06-03 → Qiita 起草
```

### 実績（**1 日で Phase 0〜3 + algebra 統合まで完了**）

```
2026-05-03 全部 1 日で
├─ 10:00-12:30 Phase 0: 設計書 + 計画 + critical pair 紙ベース証明
├─ 12:50-13:35 Phase 1 day-1〜4: term/axioms/rewriteRules/normalForm/criticalPairs
├─ 14:09        実 6 ケース fixture 化
├─ 14:20-15:21 Phase 2 day-1〜6: HiGHS / graph / solver / FFD / Robust / multiStockGuard
├─ 15:28-16:38 Phase 3 day-1〜2: V3 drop-in patch / 本番配線 / dual-strategy / Web Worker 修正
├─ 17:02        Phase 2 day-7: Column Generation, CASE-2 で LP-tight
└─ 17:11        Algebra Bridge: V3 出力が代数正規形を満たすことを実証
```

主な commits（時系列）:
- `f0086ba` chore(docs): OLD_DOC 隔離
- `0d48dab` docs(algebra): bootstrap 設計書 + BUG-V2-001 登録
- `f486c00` docs(algebra): Phase 0 完了（critical pair 全 15 合流確認）
- `20bbeee` feat(algebra): Phase 1 day-1 TERM module
- `c8ea3c3` feat(algebra): Phase 1 day-2 axioms + WORK_LOG protocol
- `53d3255` feat(algebra): Phase 1 day-3 rewriteRules
- `db87985` feat(algebra): Phase 1 完了 (normalForm + criticalPairs)
- `93cd671` test(algebra): 実 6 ケース fixture
- `38084a9` feat(arcflow): Phase 2 day-1 HiGHS adapter
- `7a5680c` feat(arcflow): Phase 2 day-2 graph builder
- `b85e507` feat(arcflow): Phase 2 day-3 solver (BUG-V2-001 micro 解ける)
- `33f23d1` feat(arcflow): Phase 2 day-4 FFD fallback
- `c0a2547` feat(arcflow): Phase 2 day-5 multi-stock FFD（V3 が CASE-2/CASE-6 で V2 超え）
- `73c6754` feat(arcflow): Phase 2 day-6 multiStockGuard
- `5d9e7f7` feat(algebra): Phase 3 day-1 algorithmV3.js drop-in
- `8832d82` feat(prod): Phase 3 day-2 本番配線
- `253099d` fix(prod): Web Worker に V3 配線
- `aeb1ded` fix(arcflow): dual-strategy （1222×333 で V3 win）
- `2ca45b6` feat(arcflow): local search 後処理
- `ede4e60` feat(arcflow): Phase 2 day-7 Column Generation（CASE-2 LP-tight）
- `a4cf3d5` feat(algebra): Algebra Bridge（V3 が algebra 正規形を満たす実証）

5 週間予定が **1 日で完了**。残りは Phase 4（ベンチ整備、Qiita 記事）。

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
