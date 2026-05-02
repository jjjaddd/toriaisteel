# TORIAI Dev Log

エラー備忘録。目的は「未来の自分が同じところで溶けない」こと。

## 書き方

```text
## YYYY-MM-DD タイトル

状況:
- 何をしていたか

症状:
- 出たエラー / おかしな挙動

原因:
- 分かったこと

解決:
- 実際に効いた手順

再発防止:
- 次からどうするか
```

---

## 2026-04-29 GitHub Pages にログイン導線が残った

状況:
- Auth / 事業所共有機能を有料化まで凍結する方針にした
- ハンバーガーメニューのログインボタンを消した

症状:
- 本番 `https://toriai.app/` のヘッダー右側にまだ `ログイン` が表示された

原因:
- ハンバーガーメニューとは別に、`#toriaiOrgSwitcher` が `authBoot` 経由でログインボタンを動的にマウントしていた

解決:
- `index.html` の `#toriaiOrgSwitcher` を `hidden style="display:none"` にした
- `src/features/auth/authBoot.js` に `AUTH_ORG_UI_ENABLED = false` を置き、auth UI を起動しないようにした
- `service-worker.js` の `CACHE_NAME` を更新した
- commit `400541f fix: hide auth entry while frozen` を push

再発防止:
- 表示を消すときは HTML 直書きだけでなく、起動JSが後からマウントしていないか確認する
- 本番反映後はシークレットウィンドウか強制更新で確認する

---

## 2026-04-29 `.git/HEAD.lock` が残ってコミットできなかった

状況:
- ログイン導線非表示の修正をコミットしようとした

症状:
- `fatal: cannot lock ref 'HEAD'`
- `.git/HEAD.lock` が残っていた

原因:
- `git.exe rev-parse HEAD` のプロセスが残り、古い lock file が残骸化していた

解決:
- `Get-Process git` で残プロセス確認
- `Get-CimInstance Win32_Process -Filter "ProcessId=..."` で内容確認
- 残プロセス停止後、0バイトの `.git/HEAD.lock` を削除
- 再度 `git commit`

再発防止:
- lock エラー時は、いきなり削除せず先に Git プロセスを確認する

---

## 2026-04-29 Phase 8 リファクタ仕上げ

状況:
- リファクタリング最後の 5% を整理

実施:
- `src/main.js` 削除
- `inventoryRemnantRows.js` 削除
- `legacyGlobals.js` bridge 削減
- 在庫削除 / 手入力残材の inline handler を一部イベントリスナー化
- `service-worker.js` precache 方針を確認

確認:
- `npx.cmd jest tests/storage.test.js --runInBand`
- `npx.cmd jest tests/calc.test.js --runInBand`
- `node --check`
- `git diff --check`

残り:
- inline handler の全面移行は別フェーズ
- `legacyGlobals.js` 残り 10 件は旧導線維持のため保持

---

## 2026-04-30 データタブ断面図テンプレ調整

状況:
- データタブの断面形状が小さく、寸法線も読みづらかった
- まず溝形鋼、続いて平鋼の断面図を鋼種別テンプレとして整えた

実施:
- 溝形鋼は `H / B / t1 / t2 / r1 / r2` を実データから流し込む図に整理
- 溝形鋼の寸法補助線を鋼材から離し、R1 / R2 / t1 / t2 の指し位置を調整
- 平鋼は `B / T` 表記にし、薄い規格でも読める表示厚補正を追加
- 更新履歴は `v1.0.5` に統合し、ユーザーには最新の更新内容だけを表示する方針に変更

確認:
- 溝形鋼 16 規格 SVG 生成 OK
- 平鋼 207 規格 SVG 生成 OK
- `node --check`
- `git diff --check`
- `npx.cmd jest tests/calc.test.js --runInBand`

再発防止:
- 図の大きさは SVG 内部ではなく、TORIAI 側の白い図枠を基準に判断する
- 寸法線は鋼材に直接当てすぎず、図面として読みやすい距離を確保する
