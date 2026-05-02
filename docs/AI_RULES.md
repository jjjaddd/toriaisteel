# TORIAI AI Project Rules

AI に開発を依頼するときは、このファイルを最初に渡す。

## 1. 絶対ルール

- 既存機能を壊さない
- Claude / Gemini / Codex が並走している可能性があるため、担当外の差分を勝手に戻さない
- 計算V2 / Column Generation / benchmark / `supabase/functions/cg/` は、明示されない限り触らない
- `src/calculation/yield/columnGeneration.js` と `supabase/` は秘匿領域。GitHub Pages に出さない
- 有料化までログイン / 事業所共有の機能拡張はしない
- 後置き上書き禁止。`fn = function(){...}` で既存関数を包んで拡張しない
- `final-overrides.js` のような応急処置ファイルを作らない
- `src/compat/legacyGlobals.js` の bridge は増やさない
- **計算 V3「代数版」プロジェクト進行中（2026-05-03〜）**。`docs/ALGEBRA_PLAN.md` の凍結ファイルリストを必ず確認。`src/calculation/yield/algebra/` と `src/calculation/yield/arcflow/` は Claude 主担当の専用領域。既存 V1/V2 関連ファイル（`algorithmV2.js` / `calcCore.js` / `patternPacking.js` / `repeatPlans.js` / `columnGeneration.js` / `cgClient.js`）は Phase 4 まで凍結
- **作業ログ必須**。ユーザーから指示が来たら、その都度 `docs/WORK_LOG.md` に **1 ユーザーターン = 1 エントリ** で追記する。フォーマットと詳細は `docs/WORK_LOG.md` の冒頭を参照。コード変更が無い「確認だけ」のターンも結論を 1 行残す

## 2. 作業開始時に必ず確認すること

- `git status --short`
- `docs/WORK_LOG.md`（最新エントリ＝同日内に何が起きたか）
- `docs/ALGEBRA_PLAN.md`（V3 進行中の凍結ファイル / 並走 AI 注意事項）
- `docs/ARCHITECTURE.md`（全体構成）
- 該当機能の `src/features/*`
- 計算に触る場合は、ユーザーに Claude 側作業と衝突しないか確認する
- 旧ドキュメント（旧 `REFACTOR_TODO.md` / `HANDOFF.md` / `TODO.md` / `TASK_BOARD.md` / `DEV_LOG.md` / `NOTES.md` / `PHASE7_AUDIT.md` / `SECURITY_ACTIONS.md`）はリポジトリルートの `OLD_DOC/` に隔離済。**過去経緯を知りたいときだけ参照、運用ルールはこの AI_RULES.md と ALGEBRA_PLAN.md が正本**

## 3. 変更前に説明すること

作業開始前に以下を短く説明する。

- 追加するファイル
- 触る既存ファイル
- 所属レイヤー
- 影響範囲
- 既存を壊さない移行手順

## 4. レイヤールール

- `src/data/`: 静的データのみ。ロジック禁止
- `src/calculation/`: 純粋計算。DOM / UI / localStorage 依存禁止
- `src/features/`: 機能単位の UI と業務フロー
- `src/ui/`: 横断 UI helper
- `src/services/`: Supabase / storage / gateway
- `src/storage/`: localStorage repository
- `src/utils/`: 汎用 helper
- `src/styles/`: CSS
- `src/core/`: namespace などの土台
- `src/compat/`: 旧互換のみ。増やさない

## 5. デザインルール

- 基調は白 / 黒 / グレー
- 薄紫はアクセント程度。ベタ塗り紫の大ボタンは禁止
- 丸いカードを増やしすぎない
- 業務ツールなので、派手なヒーローや装飾よりも可読性と操作効率を優先
- ボタンは用途が分かる短い文言にする
- 画面上の説明文を増やしすぎず、操作そのものが分かる配置にする
- モバイル / デスクトップでテキストがはみ出さないようにする

## 5.1 データタブ断面図ルール

- データタブの断面図は、鋼種ごとの正式ひな形を正本にする
- 実装前に `docs/DATA_TAB_DIAGRAM_TODO.md` を確認する
- SVG は「数値を流し込むテンプレート」として扱い、鋼種データと描画ロジックを混ぜない
- 図の外形線、寸法線、補助線、寸法文字、余白、枠に対する比率を鋼種ごとに定義する
- 単純な拡大縮小だけで解決しない。図面として見やすい位置、距離、文字サイズに調整する
- ひな形にない寸法値を推測で作らない。必要なら TODO に残す
- SVG 出力に `NaN` / `undefined` が混ざらないことを確認する

## 6. 技術ルール

- 素の HTML / CSS / JavaScript が基本
- ビルド不要で GitHub Pages に載せられる構成を維持
- CSS は外部ファイルに分ける
- JS は機能単位で `src/features/*` へ寄せる
- 直接 `innerHTML` を使う場合は必ず escape を確認する
- 新規 UI はできるだけ `createElement` / `addEventListener` を使う
- 旧 inline handler の全面撤去は次フェーズ。小さく安全な箇所から進める
- `service-worker.js` 変更時は `CACHE_NAME` を上げる
- **スクリプト読込順は `index.html` の `<script>` タグ順で決まる**。別スクリプト間では hoisting が効かないため、依存先（`src/data/steel/<kind>/specs.js` → `src/data/sectionDefinitions.js`、`src/calculation/yield/*` → `src/calculation/orchestration.js`、`src/features/calc/calcInit.js` → 各 `src/features/*` 等）の順序を破壊しない。drop-in patch（`algorithmV2.js` / 今後の `algorithmV3.js`）は本体のロード後に置く

## 7. テスト / 確認

通常確認:

```bash
npx.cmd jest tests/storage.test.js --runInBand
npx.cmd jest tests/calc.test.js --runInBand
```

構文確認:

```bash
node --check path/to/file.js
```

注意:

- `stress.test.js` は重いので通常確認には含めない
- `node_modules/` があると package 不整合に気づきにくい

## 8. Git ルール

- ユーザーに頼まれるまでコミットしない
- コミットする時は担当範囲だけ stage する
- Claude 側の差分を混ぜない
- 秘匿ファイルを stage しない
- push 前に `git status --short` を確認する

## 9. AI に渡す短縮プロンプト

```text
TORIAI の開発を手伝ってください。
まず docs/AI_RULES.md / docs/ARCHITECTURE.md / docs/ALGEBRA_PLAN.md / docs/WORK_LOG.md を読んでください。
既存機能を壊さず、担当外の差分を戻さず、計算V2 / Column Generation / benchmark / supabase/functions/cg / 計算 V3 algebra プロジェクトの凍結ファイル（ALGEBRA_PLAN.md 冒頭参照）は明示されない限り触らないでください。
変更前に、追加ファイル / 触るファイル / レイヤー / 影響範囲 / 移行手順を説明してください。
作業ログ（docs/WORK_LOG.md）にユーザーターン毎に 1 エントリ追記してください。
旧ドキュメントは OLD_DOC/ に隔離済。過去経緯参照のみで運用ルールには使わないでください。
```
