# TORIAI Refactor TODO

見た目を壊さずに、`data` を核にした保守しやすい構成へ段階的に寄せるための TODO です。

## 開発ルール（重要・絶対遵守）

### 機能追加時のフロー
1. 着手前に必ず以下を説明する：**追加するファイル / 触る既存ファイル / どのレイヤーに属するか / 影響範囲 / 既存を壊さない移行手順**
2. 新機能は `src/features/<feature>/` を起点に作る。既存ファイルを直接肥大化させない
3. 計算が必要なら `src/calculation/` に純関数を追加（DOM・UI 依存禁止）
4. データが必要なら `src/data/` に追加（ロジック禁止、静的定義のみ）
5. 保存が必要なら `src/services/` または `src/utils/` に追加（localStorage 直書き禁止、ラッパー経由）
6. `main.js` は機能の初期化とイベント登録だけ。処理本体を入れない
7. 終了後、変更したファイル一覧を報告する

### コーディング規約
- **後置き上書き禁止。** `fnName = function() {...}` での再代入、`_baseFn = fnName; fnName = function(){...}` の wrap で機能を継ぎ足さない。元の責務ファイルを直接修正する。時間がかかっても守る
- `final-overrides.js` のような応急処置ファイルを増やさない
- `main.js` に処理を詰め込まない（接続点だけ）
- UI / 計算 / データ / 保存処理を分離する
- 鋼材データは `src/data/` に集約
- 歩留まり / 重量 / 断面性能 / 取り合いパターン計算は `src/calculation/` に分離
- 取り合い・カート・見積・CSV・残材管理・案件履歴などは `src/features/` に機能単位で
- localStorage / Supabase 保存は `src/utils/` か `src/services/` にまとめる
- 1 ファイル 1 責務、ファイル名は中身が分かる具体名（`utils.js` / `data.js` / `feature.js` のような曖昧名 NG）
- 既存機能を壊さない（挙動変更を伴う移動は段階的に）
- `innerHTML` 直接生成を控える
- グローバル変数を増やさない、`window.Toriai.*` 依存も最小化
- 既存の上書きラッパー（`saveCutHistory` / `cartAdd` / `printCard` / `renderCartModal` / `render` / `renderInventoryPage` 等）は過渡的措置。順次「元ファイル直接修正」に置き換え wrapper を消す
- `src/compat/legacyGlobals.js` の bridge も増やさず、呼び出し元を namespace 直書きに置き換える

### 各レイヤーの責務
- **data**: 静的な鋼材・規格データ。ロジック禁止
- **calculation**: 純粋計算ロジック。DOM・UI 依存禁止
- **features**: アプリ機能ごとの実装。UI とビジネスロジックをつなぐ層
- **utils**: 汎用ヘルパー（localStorage / validation / 日付フォーマット 等）
- **services**: 外部通信、保存処理、Supabase などの gateway
- **main.js**: アプリ初期化、各機能エントリ接続、画面遷移 / イベントフックのみ。処理本体は持たない

### NG / OK 命名例
- NG: `utils.js`, `data.js`, `feature.js`
- OK: `steelData.js`, `calculateBundlePlan.js`, `cartAddItem.js`, `exportCsvFeature.js`

## Phase 1: 土台づくり
- [x] `src/` 配下に責務別ディレクトリを作成
- [x] 共通 namespace を `src/core/toriai-namespace.js` に整理
- [x] `storage` の共通 key / local store の入口を作成
- [x] `services` の外部接続入口を作成
- [x] 鋼種ごとの `stockLengths.js` を追加
- [x] `calculation/weight` の純関数を追加

## Phase 2: data / storage の移設
- [x] 鋼種ごとに `stockLengths.js` を分離
- [x] 規格別の定尺差分を `specStockLengths.js` に分離
- [x] `SECTION_DATA` の specs を鋼種ごとの `specs.js` へ移設
- [x] `src/data/steel/index.js` に鋼材データ入口を整理
- [x] 重量タブ保存を `src/storage/weight-store.js` へ分離
- [x] 通常動線から `window.STEEL` の本体依存を外す
- [x] 案件保存・履歴保存　 `storage` / repository 層へ寄せる

## Phase 3: calculation の分離
- [x] `calc.js` から `STEEL` データ本体を削除
- [x] `groupBars / calcMetrics` を `src/calculation/yield/barMetrics.js` へ移設
- [x] `pack / packWithRemnants / dpBestPat / packDP / calcChargeMin` を `src/calculation/yield/patternPacking.js` へ移設
- [x] `enumAllPatterns / bnbSolve / findRepeatPlans / calcPatternA / calcPatternB / calcPatternC` を `src/calculation/yield/repeatPlans.js` へ移設
- [x] `calcBundlePlan` を `src/calculation/yield/bundlePlan.js` へ移設
- [x] `calcCore` を `src/calculation/yield/calcCore.js` へ移設
- [x] Worker 実行クライアントを `src/calculation/yield/workerClient.js` へ移設
- [x] `worker.js` を `src/calculation/yield/*` を使う thin dispatcher に整理
- [x] `calc.js` を orchestration 専用にさらに縮小
- [x] 塗装面積計算（10 関数）を `src/calculation/section/paintArea.js` へ分離
- [x] 断面性能計算（残りの helpers / parsers）を `src/calculation/section/` へさらに分離

## Phase 4: UI と security
- [x] 計算結果状態更新を `src/ui/calc/resultState.js` へ分離
- [x] 計算結果メタ生成を `src/ui/calc/resultMeta.js` へ分離
- [x] 計算入力収集を `src/ui/calc/inputState.js` へ分離
- [x] 実行ボタン状態と Worker 実行フローを `src/ui/calc/executionFlow.js` へ分離
- [x] 取り合い検索ドロップダウンの `innerHTML` 依存を削減
- [x] 重量検索ドロップダウンの `innerHTML` 依存を削減
- [x] データタブ規格候補ドロップダウンの `innerHTML` 依存を削減
- [x] 在庫残材の選択・同期ロジックを `src/ui/inventory/remnantSelection.js` へ分離
- [x] 履歴描画を `src/ui/history/renderHistory.js` へ分離
- [x] 履歴プレビュー / 単票印刷組み立てを `src/ui/history/preview.js` へ分離
- [x] 規格選択パネルの開閉補助を `src/ui/calc/specPanelBehavior.js` へ分離
- [x] 材料手配メール生成を `src/ui/cart/purchaseSection.js` へ分離
- [x] お問い合わせ送信補助を `src/ui/contact/feedback.js` へ分離
- [x] 印刷ペイロード組み立てを `src/ui/history/printPayload.js` へ分離
- [x] `saveCutHistory` ラッパーを `src/ui/history/saveCutHistory.js` へ分離
- [x] `cartAdd` ラッパーを `src/ui/cart/cartAdd.js` へ分離
- [x] `renderCartModal` 拡張を `src/ui/cart/cartModalDecorations.js` へ分離
- [x] カード残材描画 (`render` ラッパー / `hydrateCardRemnantLists`) を `src/features/calc/cardRemnants.js` へ分離
- [x] `printCard` / `autoRegisterAfterPrint` を `src/ui/history/printCard.js` へ分離
- [x] 旧グローバル名 → namespace のブリッジを `src/compat/legacyGlobals.js` に集約
- [x] `final-overrides.js` を削除
- [x] `innerHTML` を使う危険箇所を優先度順に削減
- [x] 入力バリデーションを `utils/validation` 側へさらに集約
- [x] `src/ui/*` の wrapper パターンを解体し、元の責務ファイル直接修正へ置き換え：
  - `saveCutHistory` の wrapper を削除し、`src/services/storage/cutHistoryStore.js` の base に `entry.printedCardId` 直接設定 + `getLatestPrintedHistoryRemnants` を追加
  - `cartAdd` の wrapper を削除し、`src/main.js` の base に payload-based bars/remnants/meta/remHtml 直接設定
  - `renderCartModal` の wrapper を削除し、`src/main.js` の base に材料手配セクション組立を直接統合
  - `render` の wrapper を削除し、`src/main.js` の render 末尾に `hydrateCardRemnantLists()` を直接呼び出し
  - `renderInventoryPage` の wrapper を削除し、`src/main.js` の base を namespace 版（inv-card-new レイアウト + グルーピング）の logic に置き換え
  - `buildSpec` / `selectKind` の wrap は dead reference のため `specPanelInit.js` / `specPanelBehavior.js` から削除
- [x] `src/features/calc/cardRemnants.js` の `hydrateCardRemnantLists` / `renderCardRemnantSection` を専用モジュールへ移動
- [x] `src/compat/legacyGlobals.js` のブリッジ削減：呼び出し元（`main.js` / `calc.js` / `weight.js` / `custom-materials.js`）を `Toriai.ui.*` 直書きに段階的に置き換える
- [x] localStorage 直接書きを減らし、将来 Supabase へ差し替えやすくする

## Phase 5: 将来拡張の準備
- [x] `auth/` にログイン関連モジュールを追加
- [x] `inventory/` に共有在庫・事業所在庫ロジックを追加
- [x] `services/supabase/` に接続窓口を整理
- [x] ユーザー単位・事業所単位のデータ分離を見越した状態設計に寄せる

## Phase 6: ルート整理 / ディレクトリ構成 v2 への移行

### 残してよいファイル（ホスティング・PWA 制約）
`index.html` / `service-worker.js` / `manifest.json` / `CNAME` / `.nojekyll` / `sitemap.xml` / `icon-512.png` / `logo-*.svg` / `REFACTOR_TODO.md`
（最終的には icon・logo・manifest も `src/assets/` へ移動して参照書き換えする計画）

### Wave 1: leaf 系ファイル移動（低リスク）
- [x] `contact.js` → `src/features/contact/contactPage.js`
- [x] `supabase-client.js` → `src/services/supabase/client.js`
- [x] `supabase-sync.js` → `src/services/supabase/sync.js`
- [x] `custom-materials.js` → `src/features/customMaterials/customMaterials.js`
- [x] `gas-contact-script.js` → `tools/gas/contactScript.js`
- [x] `calc.test.js` → `tests/calc.test.js`（`PROJECT_ROOT` で相対解決）
- [x] `src/services/supabase-gateway.js` → `src/services/supabase/gateway.js`（同ディレクトリ集約）
- [x] `index.html` のスクリプトタグ書き換え
- [x] `staging-auth-org/INTEGRATION.md` のパス更新

### Wave 2: worker / CSS
- [x] `worker.js` → `src/calculation/workers/yieldWorker.js`（`workerClient.js` の `getExternalWorkerUrl` を更新）
- [x] `style.css` → `src/styles/style.css`（移動のみ。タブ別分割は別タスクとして残す）
- [x] `toriai-theme.css` → `src/styles/theme.css`
- [x] `data-tab.css` → `src/styles/dataTab.css`
- [x] `service-worker.js` のキャッシュ一覧と `CACHE_NAME` を v79 にバンプして新パスへ更新
- [x] `style.css` (6016 行) をレイヤー別 6 ファイルに分割：
  - `core.css` (3736) — リセット / 変数 / ヘッダー / レイアウト / 計算ページ / 履歴・在庫 UI / 2026 refresh / 詳細設定タブ / dropdown override / dark mode 等
  - `dataTabLayout.css` (342) — データタブ新レイアウト（案A + 案B）
  - `changelog.css` (327) — 更新履歴モーダル
  - `gearPopup.css` (94) — 詳細設定（歯車）ボタン+ポップアップ
  - `weightTable.css` (264) — 重量タブ明細テーブル
  - `overrideLayers.css` (1253) — Final overrides（calc / sidebar / history-inventory / unified sidebar）
- [x] `service-worker.js` の `CACHE_NAME` を v82 へバンプ
- [x] `core.css` を更にタブ単位（base / calc / history / inventory / contact 等）に細分化 — `calc.css` / `historyInventory.css` / `refresh2026.css` / `contact.css` / `settings.css` / `cartModal.css` / `dataPage.css` / `darkMode.css` に分割
- [x] `toriai-theme.css` の必要に応じた分割 — `themeCalc.css` / `themeHistoryInventory.css` / `themeDataWeight.css` / `themeContact.css` / `themeSidebar.css` / `themeCartSettings.css` / `themeDarkSupplement.css` / `themePolish.css` に分割

### Wave 3: utils / weight
- [x] `utils.js` を `src/utils/` 配下に責務別分割：
  - `jisRound.js` — JIS 丸め
  - `escapeHtml.js` — HTML エスケープ（旧来のグローバル名互換）
  - `dateUtils.js` — `parseDateValue` / `toLocalYMD` / `normDateStr`
  - `uiHelpers.js` — `paginateItems` / `lc` / `mk`
- [x] `weight.js` → `src/features/weight/weight.js`（一旦そのまま移動）
- [x] `src/features/weight/weight.js` (1660 行) を責務別 9 ファイルに分割：
  - `state.js` — モジュール状態 + format helpers（`jisRound`/`jisRoundKg` の重複定義は削除済み、`src/utils/jisRound.js` を参照）
  - `init.js` — `wInit` / `wNextOptOrAdd` / `wSetupEnter`
  - `undoOptions.js` — undo/redo + オプション + 重量逆算
  - `kindSpecPreview.js` — 鋼種/規格選択 + プレビュー
  - `rowOps.js` — 行 CRUD + 一括編集 + ノート
  - `render.js` — `wRenderRows`
  - `saveLoad.js` — CSV 出力 + 計算保存/読込
  - `printCart.js` — 印刷 + カート（dead な `wPrint` 重複 3 件を削除し、有効な定義 1 件のみに整理済み）
  - `commandPalette.js` — `wCmd*` コマンドパレット

### Wave 4: data
- [x] `data.js` を 2 ファイルに分割：
  - `src/data/sectionDefinitions.js`（鋼材定義 + 寸法計算ヘルパー、l.1-985）
  - `src/features/dataTab/dataTab.js`（断面 SVG 描画 + データタブ UI、l.986-2331）
- [x] `data.js` を削除
- [x] `src/data/sectionDefinitions.js` の dead fallback 配列を削除（per-kind `specs.js` で完全に置き換え済みを件数比較で確認）：
  - `CHANNEL_DATA` / `C_CHANNEL_DATA` / `LIGHT_GAUGE_CHANNEL_DATA`
  - `SQUARE_PIPE_DATA` / `SQUARE_PIPE_DATA_REST` / `RECT_PIPE_DATA` / `SQUARE_PIPE_MARKET` / `RECT_PIPE_MARKET` / `ECONOMY_PIPE_DATA`
  - `SMALL_SQUARE_PIPE_DATA` / `SMALL_RECT_PIPE_DATA`
  - `FLAT_BAR_DATA` / `FLAT_BAR_DATA_EXTRA` / `FLAT_BAR_DATA_PART2`
  - 中間 const（`H_SHAPES_JIS_ALL` / `I_BEAM_DATA` / `SGP_PIPE_DATA` / `BCR295_DATA` / `ROUND_BAR_DATA` / `SQUARE_BAR_DATA`）も廃止
  - `getSteelSpecsFromData` の `fallbackFactory` 引数廃止
  - 945 → 327 行（618 行削減）
- [x] `src/features/dataTab/dataTab.js` (1346 行) を機能別 8 ファイルに分割：
  - `sectionSvg.js` — 断面 SVG 描画 10 関数
  - `state.js` — データタブ状態 + 並び順ヘルパー
  - `init.js` — `dataInit` / `dtCustomOpen|Close` / `buildSelectorBar`
  - `kindSidebar.js` — 鋼種タブ + サイドバー検索
  - `specPicker.js` — 規格ピッカー（チップ / 検索 / ドラッグ / ドロップダウン）
  - `renderSpec.js` — `renderDataSpec` + `toggleDataPerfSection`
  - `stdLengths.js` — 規格別流通定尺の編集
  - `notes.js` — 殴り書きメモ + 規格選択ハンドラ + 互換 IIFE

### Wave 5: storage
- [x] `storage.js` → `src/services/storage/storage.js`（一旦そのまま移動）
- [x] `src/services/storage/storage.js` をドメイン別 9 ファイルに分割：
  - `storageKeys.js` — `LS_*` 定数 + モジュール状態（`_lastCalcResult` / `_lastAllDP` / `_lastPatA` / `_lastPatB`）
  - `settingsStore.js` — `saveSettings` / `loadSettings`
  - `remnantsStore.js` — `saveRemnants` / `loadRemnants`
  - `piecesHistoryStore.js` — `savePiecesHistory` / `getPiecesHistory` / `loadPiecesFromHistory` / `getJobInfo` / `getZoneInfo`
  - `inventoryStore.js` — Inventory CRUD + `registerRemnants` / `consumeInventoryBars` / `consumeSelectedInventoryRemnants` 等
  - `cutHistoryStore.js` — Cut history + `buildResultMeta` / `buildCardSelectionPayload` / `buildRemnantsFromBars` / `saveCutHistory` / `extractRemnants`
  - `cartStore.js` — Cart CRUD
  - `weightHistoryStore.js` — `saveWeightHistory`
  - `importExportStore.js` — `exportAllData` / `importAllData`
- [x] `service-worker.js` の `CACHE_NAME` を v81 にバンプ、ASSETS を新パスへ更新

### Wave 6: calc
- [x] `calc.js` → `src/calculation/orchestration.js`

### Wave 7: main
- [x] `main.js` → `src/main.js`（一旦そのまま移動）
- [x] `src/main.js` を機能別に分割 → 各 `src/features/*/` に配置し、`src/main.js` を初期化と接続のみに縮小（**最重要・後続タスク**）
  - [x] **Wave 7-A**: 重複 `escapeHtml` 削除 / `gearPopup` / `changelogModal` / `calcOnboarding` / `headerMenu` を `src/features/*` 等へ（約 220 行削減、4676 → 4454）
  - [x] **Wave 7-B**: カート系 4 ファイル (`cartModal` / `cartFlow` / `cartActions` / `cartCopy`) を `src/features/cart/` へ（838 行削減、4454 → 3616）
  - [x] **Wave 7-C**: 履歴 (`historyRender.js`) + 在庫 (`inventoryRender.js`) を `src/features/orderHistory/` / `src/features/materialStock/` へ（390 行削減、3616 → 3226）
  - [x] **Wave 7-D1**: コマンドパレット (`commandPalette.js`) を `src/features/calc/` へ（307 行削減、3226 → 2919）
  - [x] **Wave 7-D2**: 計算結果 render + 切断図描画 (`calcRender.js` / `clearParts.js` / `cardDisplay.js`) を `src/features/calc/` へ（663 行削減）
  - [x] **Wave 7-E**: 印刷組み立て (`printPages.js` / `printHeader.js` / `buildPrintBarHtml.js`) を `src/features/print/` へ（181 行削減）
  - **累計**: main.js 4676 → 2141 行（**54%、2535 行削減**）／171 → 90 関数
  - [x] **Wave 7-F1**: calc 12 ファイル + UI 2 ファイル抽出（`steelCatalog.js` / `specStockInput.js` / `calcResultActions.js` / `stockControls.js` / `cutFlow.js` / `manualRemnants.js` / `calcToolbar.js` / `calcUtils.js` + `inventoryRemnantState.js` / `inventoryRemnantRows.js` + `toast.js` / `sectionToggle.js`）。962 行抽出
  - [x] **Wave 7-F2**: 履歴・在庫サイドバー → `src/features/historyInventory/sidebar.js`（323 行抽出）
  - [x] **Wave 7-F3**: `inventoryDropdowns.js` (83 行) + `historyRows.js` (128 行) を `src/features/materialStock/` / `src/features/orderHistory/` へ
  - [x] **Wave 7-F4**: `partsTable.js` (283 行) + `pageNav.js` (113 行) + `interfaceChrome.js` (53 行) + `customSelect.js` (137 行) を `src/features/calc/` / `src/ui/` へ
  - **最終結果**: main.js **4676 → 61 行（98.7% 削減、4615 行除去）／171 → 1 関数（init() のみ、`confirmCutDone` から呼ばれる reset 関数）**
  - [x] init() を `src/features/calc/calcInit.js` 等に移して main.js を完全に空にする — 後続候補

### Wave 8: assets / manifest
- [x] `manifest.json` → `src/assets/manifest.json`（`scope: "/"` を追加）
- [x] `icon-512.png` → `src/assets/icon-512.png`
- [x] `logo-toriai-outline-3d-*-transparent.svg` 3 種 → `src/assets/`
- [x] `index.html` の `<link rel="manifest">` / `<link rel="apple-touch-icon">` / `<img src=>` 参照更新
- [x] `service-worker.js` のキャッシュ一覧・`CACHE_NAME` を v80 へバンプ

### ルート最終状態
ソースコード・アセットはすべて `src/` 配下へ移動完了。ルートに残るのは以下のみ:
- `index.html`（必須）
- `service-worker.js`（PWA スコープ制約のため必須）
- `CNAME` / `.nojekyll` / `sitemap.xml`（ホスティング・SEO）
- `REFACTOR_TODO.md`（プロジェクト文書）
- `.git` / `.github` / `.claude`（ツール）
- `src/` / `staging-auth-org/` / `tests/` / `tools/`（ディレクトリ）

## Phase 6 補足: src/ui → src/features の集約
（Wave 1〜8 と並行して進める）

最終的な目指す構成:
```
/src
  /components
  /features         （cart / estimate / materialStock / csvExport / orderHistory / calc 等）
  /data/steel/standardLength
  /calculation/cutting
  /calculation/weight
  /calculation/section
  /utils
  /services
  /styles           （タブごとに細かく）
main.js
```


## Phase 7: 完了後の品質ゲート＆サーバーサイド化

- [x] **リスク分析（往復レビュー）**：構成変更後にコード全体を読み直し、責務漏れ・循環依存・グローバル汚染・load 順問題を洗い出す。複数ラウンド実施
- [x] **保守性監査**：1 ファイル 1 責務 / 命名 / 重複コードの最終確認、`src/compat/legacyGlobals.js` が空に近づいているか確認
- [x] **脆弱性監査**：`innerHTML` / 入力バリデーション / XSS / 認証フロー / Supabase RLS / localStorage 機密情報の有無を網羅的に確認
- [ ] **計算ロジックのサーバーサイド化**：歩留まり / 取り合い / 重量計算を Supabase Edge Functions（または Cloudflare Workers 等）へ移行し、クライアントから秘匿。クライアントは入力 → API → 結果表示の薄い層に
- [ ] **INTEGRATION.md を進める**：`staging-auth-org/INTEGRATION.md` の手順に沿って Supabase auth + organization を本体統合。`schema.sql` 適用、Site URL 設定、`toriai-auth-*` / `toriai-org-*` を本体に組み込み、ヘッダーに事業所スイッチャーを設置
- [ ] 統合後の動作確認（ログイン / 事業所切替 / RLS データ分離）

## Phase 8: 最後の 5% 仕上げ

- [x] `src/main.js` の読み込みを完全撤去（`init()` は `src/features/calc/calcInit.js` に移設済み）
- [ ] `src/compat/legacyGlobals.js` の残ブリッジをさらに削減（計算V2 / benchmark には触らない）
- [ ] `index.html` の inline handler を高リスク箇所からイベントリスナー化
  - [x] 在庫追加ボタン `#invUseBtn` の `onclick` を削除し、既存の初期化バインドに一本化
- [ ] 参照のない実行ファイル / stale コメント / 古い引継ぎ記述を整理
  - [x] 有料化までログイン導線を非表示化（ハンバーガーメニューから `ログイン` を撤去）
  - [x] 有料化まで事業所スイッチャー / ヘッダーログイン導線を auth boot 側で無効化
- [ ] `service-worker.js` の precache と実ロードファイルの差分を最終確認
- [x] `node --check` と既存 Jest の確認（Claude の計算改修領域は混ぜない）

## 直近の優先順
1. `src/features/` 構成の素地作り（空ディレクトリ + 1 機能だけ移植して骨格確認）
2. `src/ui/*` の wrapper パターンを解体し、`main.js` / `storage.js` を直接修正する形へ移行
3. `src/compat/legacyGlobals.js` のブリッジ削減
4. `innerHTML` の危険箇所を高優先度から削る
5. 保存処理を `services/` 層へ寄せる
6. Phase 6 完了後 → Phase 7（リスク分析 / サーバーサイド化 / INTEGRATION.md）
