# Phase 7 監査レポート

日付: 2026-04-29

このファイルは、リファクタリング完了後に見つかったリスク・残タスク・次フェーズ候補をまとめた監査メモです。
日常の管理は `docs/TASK_BOARD.md` を見る。ここは「なぜそのタスクが必要なのか」を思い出すための背景資料として残します。

## 1. 監査範囲

対象:

- リファクタ後のアプリ構成
- UI / security の注意点
- storage / Supabase 境界
- 残っている移行リスク
- Phase 8 で仕上げた内容

今回直接触らない対象:

- `src/calculation/workers/yieldWorker.js`
- `src/calculation/yield/algorithmV2.js`
- `src/calculation/yield/columnGeneration.js`
- `benchmark/`
- `supabase/functions/cg/`
- `package.json` / `package-lock.json`

これらは Claude 側の大規模計算改修・秘匿計算・ベンチマークに関わるため、担当者が明確なときだけ触る。

## 2. 現在の結論

通常のリファクタリングは、いったん完了扱いでよい。

完了した大きな整理:

- `src/main.js` は削除済み
- 起動処理は `src/features/calc/calcInit.js` に集約
- CSS / data / calculation / features / services / storage は分離済み
- `src/compat/legacyGlobals.js` は在庫系 bridge だけに縮小
- `inventoryRemnantRows.js` のような古い上書き残骸は削除済み
- Auth / 事業所共有は有料化まで非表示・凍結

ここから先は、通常リファクタではなく次フェーズ:

- UI イベント移行
- 計算ロジックのサーバーサイド化
- Auth / 事業所共有の本格再開
- Supabase RLS / 課金 / seat 制限

## 3. リスク分析

### 3-1. 読み込み順

- `src/features/calc/calcInit.js` が `global.init` 互換を公開している
- `src/features/calc/cutFlow.js` など旧導線は `init()` を呼ぶため、この互換はまだ必要
- `src/compat/legacyGlobals.js` は `Toriai.ui.inventory` 初期化後に読む必要がある
- `index.html` は `src/calculation/yield/algorithmV2.js` を読む。計算V2改修と一緒に必ず整合確認する

### 3-2. 責務境界

良い状態:

- `src/main.js` は削除済み
- `src/features/*` に機能単位の実装が集まっている
- `src/calculation/*` は計算ロジック中心
- `src/data/*` は鋼材データ中心
- `src/services/*` に storage / Supabase が寄っている

まだ重い場所:

- `src/features/materialStock/inventoryRemnantState.js`
  - 残材UIの描画
  - 選択状態の保存
  - cart modal 互換処理
  - 古い上書き処理
  が混ざっている
- `src/services/storage/inventoryStore.js`
  - 旧 `kind/spec` 型 inventory helper と新しい flat array 型が並走している
- `src/features/weight/*`
  - 直接 localStorage に触る箇所とグローバル entry point がまだ残る

### 3-3. グローバル関数

`src/compat/legacyGlobals.js` はかなり減ったが、まだ 10 bridge 残っている。

残す理由:

- `src/calculation/orchestration.js`
- storage
- 残材 UI
- inline handler

が旧グローバル導線をまだ使っているため。

Phase 8 では、計算V2並走中にここを深追いしない判断にした。

## 4. 保守性監査

### 良い点

- ディレクトリ構成はかなり整理された
- `REFACTOR_TODO.md` は Phase 8 まで更新済み
- `docs/ARCHITECTURE.md` / `docs/AI_RULES.md` / `docs/TASK_BOARD.md` / `docs/DEV_LOG.md` を追加済み
- 起動導線が `calcInit.js` に寄った
- 古い `inventoryRemnantRows.js` は削除済み
- 在庫一覧削除は inline `onclick` からイベント委譲に移行済み
- 手入力残材行は DOM イベントリスナー化済み

### 残る負債

- `inventoryRemnantState.js` は分割候補
- `legacyGlobals.js` は最終的には削除したい
- `index.html` には inline handler がまだ多い
- print 系は `document.write` を使う
- weight / dataTab / customMaterials に直接保存処理が残る

## 5. 脆弱性 / 安全面

### 5-1. innerHTML / document.write

まだ残っている。優先的に見る場所:

- `src/features/materialStock/inventoryRemnantState.js`
- `src/features/orderHistory/historyRender.js`
- `src/ui/history/preview.js`
- `src/features/cart/cartCopy.js`
- `src/features/print/printPages.js`
- `src/features/weight/printCart.js`
- `src/features/dataTab/renderSpec.js`

判断:

- アプリ生成HTMLだけなら短期的には許容
- imported data / user input / job name / memo / customer name は必ず escape する
- print window の `document.write` は、app-generated payload に限定する

### 5-2. 入力バリデーション

`src/utils/validation.js` はあるが、まだ各 feature で直接 `parseInt` / `Number` を使う箇所が残る。

将来追加したい validator:

- `src/utils/validation/steelInputValidation.js`
- `src/utils/validation/inventoryValidation.js`
- `src/utils/validation/weightValidation.js`

### 5-3. 保存データ

localStorage に残る主な業務データ:

- 履歴
- 在庫
- 残材
- カスタム鋼材
- データタブメモ
- 重量計算の保存
- 案件名 / 顧客名 / メモ

これらは credential ではないが、業務上は機密情報になり得る。
クラウド同期や共有を本格化する前に、ユーザー / 事業所スコープと RLS を必ず確認する。

## 6. Auth / Supabase

現在:

- Auth / 事業所共有 UI は試作コードとして存在
- 有料化まで非表示
- `src/features/auth/authBoot.js` の `AUTH_ORG_UI_ENABLED = false` で起動を止めている
- `staging-auth-org/` は再開用の原本として残す

本格再開の完了条件:

- Supabase Auth の Site URL / Redirect URLs / Email 設定確認
- `schema.sql` の整理
- RLS policy の再監査
- 事業所作成 / 招待 / メンバー一覧 / パスワード再設定の動作確認
- localStorage から org scope への取り込み UI
- 課金 / seat 制限 / Stripe 連携

## 7. Service Worker

現在:

- `CACHE_NAME`: `steel-optimizer-v94`
- 実ロード: 184 件
- precache: 51 件

判断:

- fetch 時に動的キャッシュする設計
- precache は初回表示に必要な核だけに留める
- 全ファイルを precache すると install 失敗や更新遅延のリスクが上がる

ルール:

- `index.html`
- `service-worker.js`
- 起動系 JS
- CSS の主要ファイル

を変えたら `CACHE_NAME` を上げる。

## 8. 次フェーズ候補

### A. UI イベント移行

目的:

- `onclick="..."` / `oninput="..."` / `onchange="..."` を減らす
- global function surface を減らす
- XSS / 保守性リスクを下げる

進め方:

1. 画面単位でやる
2. 1回のPR/commitで1領域だけ
3. 先にイベント委譲の入口を作る
4. 動作確認してから inline handler を消す

候補順:

- 在庫 / 履歴 sidebar
- カート modal
- 重量タブ保存リスト
- データタブ notes / std lengths
- 計算結果カード

### B. inventoryRemnantState.js 分割

分けたい責務:

- selected inventory remnant state store
- remnant section shell rendering
- inventory remnant list rendering
- cart modal compatibility code

### C. server-side calculation

目的:

- Pro / Business 版の計算ロジック秘匿
- `supabase/functions/cg/` に CG / HiGHS を置く
- クライアントは入力 → API → 結果表示の薄い層にする

注意:

- 無料版の公開計算と Pro 版の秘匿計算を分ける
- `supabase/` は `.gitignore` 対象
- GitHub Pages に秘匿計算を載せない

## 9. 推奨運用

- 日々のタスクは `docs/TASK_BOARD.md`
- AI に渡すルールは `docs/AI_RULES.md`
- 構造の見取り図は `docs/ARCHITECTURE.md`
- エラー備忘録は `docs/DEV_LOG.md`
- 長い引継ぎは `HANDOFF.md`
- リファクタ履歴は `REFACTOR_TODO.md`

このファイルは、Phase 7 時点の監査スナップショットとして残す。
