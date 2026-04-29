# TORIAI Task Board

シンプルなカンバン。細かい議論は別ファイルに逃がし、ここは状態だけを見る。

## ToDo

| ID | 種別 | タスク | メモ |
|---|---|---|---|
| T-001 | UI | inline handler を段階的にイベントリスナー化 | 画面全体に影響するため小分け |
| T-002 | Compat | `src/compat/legacyGlobals.js` の残り 10 bridge 削減 | 計算V2並走中は慎重に |
| T-003 | Auth | 有料化前に auth / org 設計を再監査 | 現在は非表示で凍結 |
| T-004 | Server | Pro / Business 用 CG を `supabase/functions/cg/` で運用設計 | 秘匿領域 |
| T-005 | Docs | Supabase 本番運用手順を書く | schema / RLS / URL / Email |
| T-006 | UI | データタブ断面図を鋼種別ひな形ベースへ刷新 | 詳細は `docs/DATA_TAB_DIAGRAM_TODO.md` |
| B-001 | Bug | 本番キャッシュが古い表示を残す問題の手順化 | SW更新 / 強制更新案内 |

## Doing

| ID | 種別 | タスク | 担当 | メモ |
|---|---|---|---|---|
| D-001 | Docs | 構造マップ / AIルール / タスク表 / 開発日記を整備 | Codex | 2026-04-29 開始 |
| D-002 | UI | 溝形鋼の断面図テンプレート統合方針を整理 | Codex | データタブ断面図刷新の最初の鋼種 |

## Done

| ID | 種別 | 完了内容 | 日付 | メモ |
|---|---|---|---|---|
| R-001 | Refactor | `src/main.js` 削除、起動は `calcInit.js` に集約 | 2026-04-29 | Phase 8 |
| R-002 | Refactor | 旧 `inventoryRemnantRows.js` 削除 | 2026-04-29 | 上書きされていた残骸 |
| R-003 | Refactor | 在庫削除ボタンをイベント委譲化 | 2026-04-29 | `deleteInventoryGroup` bridge 削除 |
| R-004 | Refactor | 手入力残材行を DOM イベント化 | 2026-04-29 | inline handler 削減 |
| R-005 | Auth | 有料化までログイン導線を非表示 | 2026-04-29 | `AUTH_ORG_UI_ENABLED = false` |

## 使い方

- 新しい作業は `ToDo` に追加
- 着手したら `Doing` に移動
- コミットまたは検証完了したら `Done` に移動
- バグは `B-xxx`
- 機能は `F-xxx`
- リファクタは `R-xxx`
- ドキュメントは `D-xxx`
