# TORIAI リファクタリング 引継ぎ

次に作業する AI 向け。`REFACTOR_TODO.md` と各ファイルの内容は閲覧できる前提なので、
ここでは **TODO に書いていない暗黙知 / 落とし穴 / 直近の判断軌跡** をまとめる。

---

## 1. 現在の状態（最終確認 2026-04-29）

| 指標 | 値 |
|---|---|
| 最新コミット | `400541f` (auth entry freeze) ／ origin/main と同期済 |
| `src/main.js` | **削除済み**。起動処理は `src/features/calc/calcInit.js` の `Toriai.features.calc.init` / `global.init` |
| `src/styles/core.css` | 分割済み。残りは細かな UI/inline handler 整理が中心 |
| ルート直下 | `index.html` / `service-worker.js` / `CNAME` / `.nojekyll` / `sitemap.xml` / `REFACTOR_TODO.md` / `HANDOFF.md` のみ |
| テスト | `npx.cmd jest tests/storage.test.js --runInBand` + `npx.cmd jest tests/calc.test.js --runInBand` = **7 passed**。stress.test.js は重いため通常確認から外す |

---

## 2. 暗黙ルール（重要・絶対遵守）

### 2-1. 後置き上書き禁止
これが過去最大の負債源。`final-overrides.js` が 1500 行に膨らんで保守不能になった。

```js
// ❌ NG
fnName = function() { ... }
var _baseFn = fnName; fnName = function() { _baseFn(...); ... }

// ✅ OK
// 元の責務ファイル（main.js / storage.js / src/features/*）を直接修正する
```

メモリ `feedback_no_override_pattern.md` にも保存済。次のセッションでも自動読込される。

### 2-2. 1 ファイル 1 責務 / レイヤー分離

| レイヤー | 場所 | 責務 |
|---|---|---|
| data | `src/data/` | 静的鋼材・規格データ。**ロジック禁止** |
| calculation | `src/calculation/` | 純関数。**DOM・UI 依存禁止** |
| features | `src/features/<feature>/` | 機能単位の実装。UI とロジックをつなぐ |
| services | `src/services/` | 外部通信・保存処理 |
| utils | `src/utils/` | 汎用ヘルパー |
| ui | `src/ui/` | 横断 UI infrastructure |
| startup | `src/features/calc/calcInit.js` | init / 接続のみ。処理本体禁止 |

### 2-3. 機能追加前の手順
1. **着手前に説明する**（追加ファイル / 触る既存ファイル / どのレイヤー / 影響範囲 / 移行手順）
2. 新機能は `src/features/<feature>/` を起点
3. 終了後、変更したファイル一覧を報告

---

## 3. 設計上の落とし穴

### 3-1. グローバル関数 + namespace の二重公開
レガシーコードが多数のグローバル関数（`escapeHtml`, `getCart`, `renderHistory` 等）を
直接呼んでいる。新モジュールは:

- `Toriai.ui.X.foo()` 名前空間で公開
- 同時に `global.foo = ns.foo` でグローバルにもエクスポーズ

`src/compat/legacyGlobals.js` がブリッジ集約場所。**新しいブリッジを増やさない**こと。
呼び出し元を namespace 直書きに置き換えながら、ブリッジを段階的に減らす方針。

### 3-2. スクリプト読み込み順
`index.html` の script タグ順で関数が定義される。`function fn() {}` 宣言は同一スクリプト内で
hoisting されるが、別スクリプト間では「ロード順」が効く。

特に注意:
- `src/data/steel/<kind>/specs.js` 群 → `src/data/sectionDefinitions.js` の順（specs.js が
  グローバルや provider を作り、sectionDefinitions が消費）
- `src/calculation/yield/*` → `src/calculation/orchestration.js` の順
- `src/features/calc/calcInit.js` → 各 `src/features/*` の順（`global.init` 互換は calcInit 側で公開）

### 3-3. ラッパーパターンが既に解体済
過去に main.js の以下関数は wrapper パターンで拡張されていた:
`saveCutHistory` / `cartAdd` / `printCard` / `renderCartModal` / `render` / `renderInventoryPage`

**現在は全て元ファイル直接修正に統合済**（295816b の前段で実施）。再導入しないこと。

### 3-4. cart modal の DOM 構造に注意
`#cartModalBody` 内に静的 HTML（`#cartSectionCut` のアクションボタン群）がある。
`renderCartModal()` で `body.innerHTML = ...` すると **ボタン群が消える**（2026-04-27 に
発生したバグ）。書き込み先は `#cartCutList`、`#cartSectionCut` は維持する。

### 3-5. 山形鋼のソート問題
`src/data/steel/equalAngle/specs.js` の末尾に追加された 5 件（L-20×20×3, L-30×30×5,
L-75×75×6, L-130×130×9, L-200×200×15）は定義順そのままだと UI で末尾に出てしまう。

修正済: `src/data/steel/index.js#getRowsByKind` で `compareSpecRowsByName` により
寸法数値順ソート。**他の鋼種の specs.js に追加するときも自動でソートされる** が、
念のため新規追加時に dropdown を目視確認すること。

### 3-6. service-worker キャッシュ
`service-worker.js` の `CACHE_NAME` (現在 `steel-optimizer-v94`) は precache list 用。
非リスト ファイルも fetch 後にキャッシュされるので、ユーザーが古い版を掴むことが多い。

**主要アセット（index.html / core.css / 起動系 JS 等）に変更を入れた際は CACHE_NAME を
バンプする** こと。それ以外のファイルでも、ユーザーが古いまま掴む可能性があるなら
ハードリロード（Ctrl+Shift+R）を案内する。

---

## 4. 直近の事故と教訓

### 2026-04-27: refactor commit `944e7fd` がローカルで巻き戻された
ユーザーの `git reset HEAD~1` 相当の操作で 944e7fd がブランチから外れ、working tree も
復元された。**reflog に残っていたため `git reset --hard 944e7fd` で完全救出**。

教訓:
- **大きな refactor の後はすぐ `git push` する**（リモートに保険を作る）
- ローカルで `git reset` を案内するときは、reflog の使い方も同時に伝える

### 2026-04-27: stress.test.js が OOM で失敗
`yield pack 1000 pieces with 30 distinct lengths` が Node の heap (4GB 設定済) を使い切る。
**既存問題**（refactor 前から発生）。calc/storage tests は通っているので、refactor の
正しさ自体は保証されている。

優先度低い改善案:
- pack の memo化が漏れている可能性
- テストを軽量化する（500 pieces など）か、`--expose-gc` で GC を促す

---

## 5. 次にやるべきこと（優先順）

### A. core.css の細分化（タスク 5、未着手）
- `src/styles/core.css` 3741 行を base / calc / history / inventory / contact など
  タブ単位に分割
- **cascade が壊れやすい** ので、必ずブラウザで全タブ動作確認してから commit
- 境界候補は `core.css` のコメント `/* HEADER */` `/* CALC PAGE LAYOUT */` `/* HISTORY PAGE */`
  `/* 2026 refresh */` `/* データタブ */` 等。ただし `2026 refresh` セクション（l.957-2596）は
  巨大かつ多くの要素に影響するので慎重に
- すでに 6 ファイルに 1 段分割済（`core.css` / `dataTabLayout.css` / `changelog.css` /
  `gearPopup.css` / `weightTable.css` / `overrideLayers.css`）

### B. main.js の撤去（完了）
`src/main.js` は削除済み。`index.html` と `service-worker.js` からも読み込みを外した。
`init()` 互換は `src/features/calc/calcInit.js` が `global.init` として公開している。

### C. legacyGlobals.js のブリッジ削減
呼び出し元（旧コード由来の散在）を `Toriai.ui.X.foo()` 直書きに置き換え、最終的に
`src/compat/legacyGlobals.js` を削除する。膨大な変更になるので段階的に。

### D. innerHTML 危険箇所の削減
`Toriai.utils.html.escapeHtml` を経由せず生 HTML を innerHTML している箇所が残っている。
`grep -rn "innerHTML\s*=" src/` で洗い出し、優先度順に修正。

### E. Phase 7（リスク分析 / セキュリティ / サーバーサイド化 / INTEGRATION.md）
- 大幅構成変更後の全コード再読込（複数ラウンド）
- `staging-auth-org/INTEGRATION.md` に従い Supabase auth + 事業所統合
- 計算ロジック（歩留まり / 取り合い）を Supabase Edge Functions / Cloudflare Workers へ移行

### F. その他の累積タスク（REFACTOR_TODO.md 参照）
- 案件保存・履歴保存を `services` / repository 層へ寄せる
- 入力バリデーションを `utils/validation` 集約
- 断面性能計算（残り）を `src/calculation/section/` へ
- localStorage 直書き削減（→ Supabase 切り替えしやすく）
- `core.css` のタブ別細分化と並行して `theme.css` も検討

---

## 6. テスト・検証の作法

```bash
# Jest 形式テスト（calc + storage）
npx jest tests/calc.test.js tests/storage.test.js --runInBand

# 全テスト（stress 含む。stress は OOM で失敗するが既知）
npm test

# 単一ファイル構文チェック
node --check src/path/to/file.js
```

UI 変更を加えたら必ずブラウザで:
- 各タブ（取り合い / 重量計算 / データ / 在庫 / 履歴 / お問い合わせ）の遷移
- 取り合い計算 → 結果表示 → カート追加 → カートモーダル → 印刷 / コピー / PDF / 重量タブ送り
- 重量計算 → 行追加 → 印刷 → CSV 出力
- 履歴・在庫の検索 / フィルター / 削除
- ダーク / ライトモード切替

---

## 7. 命名規約 と NG 例

| ❌ NG | ✅ OK |
|---|---|
| `utils.js` | `escapeHtml.js` / `dateUtils.js` / `jisRound.js` |
| `data.js` | `sectionDefinitions.js` / `equalAngle/specs.js` |
| `feature.js` | `cartAddItem.js` / `historyRender.js` |
| `helpers.js` | `paintArea.js` / `stockHelpers.js` |

---

## 8. 連絡事項

- **ユーザー（jjjad）はコミットメッセージを日本語で書く**。`refactor:` / `fix:` / `feat:`
  プレフィックスは Conventional Commits 風だが、本文は日本語
- **コミット作成は明示的に頼まれてから**（`コミットして` / `commit して`）。勝手にコミット
  しない。push も同様
- **大規模リファクタは波（Wave）で分け、各 Wave 後に動作確認**。テストだけでは UI が
  壊れていてもパスする
- メモリ機構が有効: `feedback_no_override_pattern.md` と `feedback_architecture_rules.md`
  が次回セッションで自動読込される

---

## 9. Auth / 事業所共有機能の引継ぎ（2026-04-29 時点）

このセクションは次に作業する AI 向け。ユーザー判断により、**ログイン機能・事業所共有機能はここで一旦凍結**する。
本格実装は **有料化のタイミング以降** に再開する想定。通常のリファクタリング作業では、この機能を広げないこと。

### 9-1. 現在の方針

- ログイン / 事業所 / 招待コード / メンバー一覧の試作コードは入っているが、MVP 完成扱いではない
- 現時点では「将来有料化するときの土台」として残す
- 有料化前に以下を進めない:
  - 強制ログイン化
  - 既存データの自動移行 UI
  - 課金プラン / seat 制限 UI
  - Stripe 連携
  - 計算ロジックのサーバーサイド化
  - 事業所単位での履歴 / 案件 / 重量計算の完全共有

### 9-2. 関連ファイル

本体側:
- `src/services/supabase/authService.js`
- `src/services/supabase/orgService.js`
- `src/services/supabase/orgStorage.js`
- `src/features/auth/authUi.js`
- `src/features/auth/authBoot.js`
- `src/styles/authUi.css`
- `index.html`
- `service-worker.js`

staging 側:
- `staging-auth-org/INTEGRATION.md`
- `staging-auth-org/schema.sql`
- `staging-auth-org/toriai-auth-service.js`
- `staging-auth-org/toriai-org-service.js`
- `staging-auth-org/toriai-org-storage.js`
- `staging-auth-org/toriai-auth-ui.js`
- `staging-auth-org/toriai-auth-ui.css`

### 9-3. 現在の UI 状態

- 有料化までログイン導線は非表示。ハンバーガーメニューにもヘッダーにも出さない
- `src/features/auth/authBoot.js` の `AUTH_ORG_UI_ENABLED = false` で、事業所スイッチャー / ログイン導線を起動しない
- 将来再開時は、ヘッダー上部に事業所オンラインバッジ、ログイン操作はハンバーガーメニューへ戻す想定
- バッジの丸は薄紫 `#cbb8ff`
- 所属済みユーザーには `＋ 事業所を作成` / `招待コードで参加` を表示しない
- `メンバー管理` 表記は強すぎるため `メンバー一覧` に変更済み
- メンバー一覧の user id は表示しない
- 招待コード発行ボタンはベタ紫禁止。薄紫背景 + 黒文字
- ドロップダウンは画面右端で欠けないよう、表示後に幅を測って viewport 内へ収める

### 9-4. Supabase / DB 側の注意

- 既存の device_id 方式テーブルと名前衝突しないよう、事業所共有用は `org_` 接頭辞を使う
  - `org_inventory`
  - `org_remnants`
  - `org_weight_calcs`
  - `org_custom_materials`
  - `org_custom_stock_lengths`
- `inventory` / `remnants` / `custom_materials` / `weight_calcs` など既存名は触らない
- `schema.sql` は途中で何度か修正している。再開時は必ず最新の `staging-auth-org/schema.sql` を読む
- 事業所作成は直接 `organizations.insert()` ではなく、RPC `create_organization(p_name)` 経由に寄せた
- 招待コードは DB default に頼り切らず、アプリ側でも `code` と `expires_at` を渡すようにしている
- メンバー一覧は Supabase の relationship 推論に頼らず、まず `org_members` を直接読む安全側に倒している

### 9-5. 既知の未完了 / 再開時 TODO

- Supabase Dashboard 側の設定確認:
  - Authentication > Providers > Email
  - Authentication > URL Configuration の Site URL / Redirect URLs
  - パスワード再設定メールの送信設定
- パスワード再設定後に戻ってきたときの `PASSWORD_RECOVERY` UI は未完成
- メンバー一覧は名前解決を簡略化している。将来は `profiles` を安全に読める RPC か view を作る
- 事業所メンバー削除 / 招待 / オーナー移譲 UI は試作レベル
- 既存ローカルデータを事業所へ取り込む UI は未接続
- `orgStorage` は在庫 / 端材中心。履歴・案件・重量計算の共有化は未完了
- RLS の本番監査は未完了。課金実装前に必ず再監査する

### 9-6. 触らないでよいもの

有料化前の通常リファクタでは、以下は原則触らない:

- `staging-auth-org/` 以下の auth / org 実装拡張
- `src/features/auth/` の機能追加
- `src/services/supabase/orgStorage.js` の共有対象拡張
- 強制ログイン化
- 課金 / seat / plan 判定

バグ修正や軽微な表示崩れだけは可。ただしその場合も、auth 機能を広げず最小修正に留める。

### 9-7. 再開時の推奨順

1. `staging-auth-org/INTEGRATION.md` とこのセクションを読み直す
2. Supabase の現行 schema / RLS / Auth 設定を確認する
3. `schema.sql` を本番前提で整理し、RPC / view / policy を再設計する
4. パスワード再設定フローを完成させる
5. profiles / org_members のメンバー表示を RPC で安全に実装する
6. 既存 localStorage データの事業所取り込み UI を実装する
7. 有料プラン / seat 制限 / Stripe 連携へ進む

### 9-8. 直近の検証状況

Auth / org UI の修正後に以下は確認済み:

```bash
node --check src/features/auth/authBoot.js
node --check src/features/auth/authUi.js
node --check src/services/supabase/authService.js
node --check src/services/supabase/orgService.js
npx.cmd jest tests/storage.test.js --runInBand
npx.cmd jest tests/calc.test.js --runInBand
git diff --check
```

ただし、Supabase 実環境でのログイン / 招待 / パスワード再設定 / RLS 分離の完全確認は未完了。
