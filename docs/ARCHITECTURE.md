# TORIAI Architecture Map

TORIAI の全体構造メモ。新しい開発者や AI は、まずこのファイルと `docs/AI_RULES.md` を読む。

## 1. 全体構成

```text
User Browser
  |
  | GitHub Pages
  v
https://toriai.app/
  |
  | static assets
  v
index.html / service-worker.js / src/*
  |
  | optional sync / auth / db
  v
Supabase
  - Auth
  - Postgres / RLS
  - Edge Functions
```

現在の本番 UI は GitHub Pages で動く。ログイン / 事業所共有 UI は試作コードを残しているが、有料化まで非表示。

## 2. URL / Hosting

- 本番 URL: `https://toriai.app/`
- Hosting: GitHub Pages
- PWA: `service-worker.js`
- Manifest: `src/assets/manifest.json`
- Canonical / SEO: `index.html`, `sitemap.xml`

## 3. Supabase 方針

- 認証 / 事業所共有は有料化まで凍結
- Auth UI は `src/features/auth/` にあるが、`src/features/auth/authBoot.js` の `AUTH_ORG_UI_ENABLED = false` で表示しない
- 既存 localStorage 方式と Supabase 方式は移行期間中に並走する
- 既存 device_id テーブルと衝突しないよう、事業所共有テーブルは `org_` 接頭辞を使う

## 4. 秘匿したい計算ロジック

差別化の核になる Column Generation / HiGHS 連携は公開クライアントへ置かない。

- 秘匿先: `supabase/functions/cg/`
- ローカル秘匿ファイル: `src/calculation/yield/columnGeneration.js`
- `.gitignore` で `supabase/` と `src/calculation/yield/columnGeneration.js` は除外
- GitHub Pages に出すのは無料版 / 公開してよい計算ロジックのみ

## 5. ディレクトリ構成

```text
/
  index.html              # 静的アプリ本体の HTML
  service-worker.js       # PWA / cache
  CNAME / .nojekyll       # GitHub Pages
  sitemap.xml             # SEO
  REFACTOR_TODO.md        # リファクタ履歴
  HANDOFF.md              # 次作業者向け引継ぎ
  NOTES.md                # 秘密の開発日記。git 管理しない
  docs/
    ARCHITECTURE.md       # このファイル
    AI_RULES.md           # AI に渡すルール
    TASK_BOARD.md         # タスク / バグ管理
    DEV_LOG.md            # エラー備忘録
  src/
    assets/               # icon / logo / manifest
    auth/                 # 旧 auth session helper
    calculation/          # クライアントに置いてよい計算ロジック
    compat/               # 旧グローバル互換。増やさない
    core/                 # namespace 等の基盤
    data/                 # 鋼材・規格データ。ロジック禁止
    features/             # 機能単位 UI / business flow
    inventory/            # 在庫 service
    services/             # storage / Supabase / gateway
    storage/              # local storage repository
    styles/               # CSS
    ui/                   # 横断 UI helpers
    utils/                # 汎用 helper
  staging-auth-org/       # auth / org 再開用の試作原本
  supabase/               # Edge Functions。git 管理しない
  tests/                  # Jest tests
  tools/                  # GAS 等の補助
  benchmark/              # アルゴリズム検証。秘匿ドキュメントを含む
```

## 6. 起動順の重要ルール

- `src/core/toriai-namespace.js` は早めに読む
- 鋼材 specs は `src/data/steel/index.js` と各 `specs.js` の順序に注意
- 計算系は `src/calculation/yield/*` → `src/calculation/orchestration.js`
- アプリ初期化は `src/features/calc/calcInit.js`
- `src/main.js` は削除済み

## 7. 残っている技術負債

- `index.html` や HTML 文字列内の inline handler がまだ残る
- `src/compat/legacyGlobals.js` の 10 bridge は旧導線維持のため残している
- UI イベント移行は次フェーズ扱い
- Auth / org は凍結中
- サーバーサイド計算は Pro / Business 版の設計として別フェーズ
