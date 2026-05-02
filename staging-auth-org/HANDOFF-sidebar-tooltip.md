# データタブ サイドバー検索ツールチップ 実装メモ

## やりたいこと

データタブの左サイドバーに検索ワードを入れたとき、
カテゴリボタンをホバーするとマッチした規格名がツールチップで表示される機能を追加する。

## 動作フロー

1. ユーザーがサイドバー検索ボックスに「100」などを入力
2. マッチした規格を持つカテゴリだけ表示（この絞り込みは既存機能として実装済み）
3. カテゴリボタンにホバー → そのカテゴリ内でヒットした規格名がツールチップに縦並びで表示
4. クリック → 通常通り右エリアに規格チップが展開される

## ツールチップの仕様（未確認・要確認）

- カテゴリボタンの右横にフローティングパネルとして表示
- 中身：ヒットした規格名を縦に列挙
  例：
  ```
  H-100×100×6×8
  H-100×50×5×7
  H-100×100×6×10
  …
  ```
- 件数が多い場合の上限と「他○件」表示：**ユーザーと未確認、要確認**
- 検索ワードがない（通常表示）ときはツールチップなし

## 関連ファイル

| ファイル | 役割 |
|----------|------|
| `src/features/dataTab/kindSidebar.js` | サイドバー描画・検索・クリック処理。ここが主な変更箇所 |
| `src/features/dataTab/specPicker.js` | 右エリアの規格チップ描画。参考として読む |
| `src/features/dataTab/state.js` | `_dataKind`, `_dataSpecIdx` など状態変数 |
| `index.html` | `#dtKindList`, `#dtSbSearch` など関連DOM |

## 実装方針メモ

- `renderKindSidebar()` 内でクエリがある場合、各カテゴリのマッチ規格名を `data-tips` 属性に持たせる
- フローティングtootltip用のdivを1つだけDOMに追加（`id="dtSbTooltip"`）
- `.data-sb-item` の `mouseenter` / `mouseleave` でtooltipを表示・非表示
- 位置はボタンの `getBoundingClientRect()` を使って右横に `position:fixed` で配置
- スタイルは `toriai-auth-ui.css` や既存の `.torg-dropdown` クラスを参考に合わせる

## 既存コードのポイント

`kindSidebar.js` の `renderKindSidebar()` 内、クエリがある場合のspec絞り込みロジック（L.44-49）：

```js
if (!hit && Array.isArray(data.specs)) {
  hit = data.specs.some(function(s) {
    return normalizeDataSpecText(s.name || '').indexOf(query) >= 0;
  });
}
```

ここで `some` → `filter` に変えてヒットした規格名リストを取得し、ボタンの `data-tips` に渡す。

## デザイントークン（参考）

- フォント: `"Space Grotesk", "Noto Sans JP"`
- アクセントカラー: `var(--ac, #ff6b35)`
- サーフェス: `var(--surface, #fff)`
- ボーダー: `rgba(0,0,0,0.08)`
- シャドウ: `0 18px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)`
