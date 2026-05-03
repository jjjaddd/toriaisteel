# TORIAI Architecture Map

TORIAI の全体構造とディレクトリマップ。新しい開発者や AI は、作業開始前にまずこのファイルと `docs/AI_RULES.md` を読むこと。

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
- **V3「代数版」プロジェクトについて**: 新規の記号代数エンジンはローカルのWASM（HiGHS）で完結させるため公開領域に置くが、既存の V2 (ヒューリスティクス) と V1 はフォールバック用としてそのまま維持する。

## 5. ディレクトリ構成（詳細版）

```text
/
  index.html              # アプリ本体のHTML。全JSスクリプトの読込順をここで厳密に制御する
  service-worker.js       # PWA のオフラインキャッシュ制御。更新時は CACHE_NAME を上げる
  CNAME / .nojekyll       # GitHub Pages デプロイ用の設定ファイル群
  sitemap.xml             # SEO用サイトマップ
  OLD_DOC/                # 旧ドキュメント群（TASK_BOARD, DEV_LOG, 過去の引継ぎ等）の隔離領域
  docs/                   # プロジェクトの正本となるアクティブなドキュメント群
    ARCHITECTURE.md       # このファイル（全体構成）
    AI_RULES.md           # 開発時の絶対ルール、コーディング規約、AIへのプロンプト
    WORK_LOG.md           # 開発作業の全ログ（1ターン1エントリ。並走AIによる衝突回避プロトコルあり）
    DATA_TAB_DIAGRAM_TODO.md # データタブのSVG断面図テンプレート化の進捗管理
    ALGEBRA_*.md          # V3「代数版」プロジェクト専用の設計書・計画・バグ履歴・開発日記
  src/
    assets/               # PWA用アイコン、ロゴ画像、manifest.json 等の静的リソース
    auth/                 # [凍結中] ログイン・セッション管理の旧ヘルパー
    calculation/          # 計算ロジック本体。純関数原則を守り、DOM/UI/localStorageには一切依存させない
      common/             # 計算の共通処理（入力の正規化 normalizeInput.js、バリデーション等）
      section/            # 断面寸法からの塗装面積計算 (paintArea.js)、規格名パーサ等
      weight/             # 重量計算ロジック (calculateWeight.js 等)
      yield/              # 歩留まり計算・切断最適化関連
        algebra/          # [進行中] V3「代数版」の心臓部（項書換系、等価類圧縮）。Claude専用
        arcflow/          # [進行中] V3の数値ソルバー基盤（HiGHS-WASM連携）。Claude専用
        columnGeneration.js # [秘匿] V2の列生成ロジック。Git公開禁止
        algorithmV2.js    # 現在の計算V2エントリポイント。長考モード等を管理し calcCore を呼ぶ
        algorithmV3.js    # 開発中のV3エントリポイント。V2を後ろから上書きする(Drop-in patch)
        calcCore.js       # 歩留まり計算の中核。残材優先充当、DP割当等を統合し最適な切断計画を返す
        patternPacking.js # 貪欲法(Greedy)やFFDによる1次元パッキングロジック群
        repeatPlans.js    # パターンの繰り返しを抽出・評価するロジック
        bundlePlan.js     # 束ね切りプランの計算ロジック
      orchestration.js    # UIからの計算要求受付、Web Worker起動管理、複数アルゴリズムの制御と結果統合
    compat/               # 旧グローバル変数 (`window.xxx`) を維持するためのブリッジ。新規追加禁止
    core/                 # `Toriai` 名前空間の定義など、アプリの最も基礎となる基盤
    data/                 # 鋼種ごとの規格寸法や重量などの静的データ。計算ロジックはここに入れない
      steel/              # 各鋼種（hBeam, pipe, flatBar 等）の specs.js (規格と重量) / stockLengths.js (定尺)
        index.js          # 鋼材データアクセス用の共通API (getRowsByKind, getDefaultStockLengths 等)
        registry.js       # 鋼材データの登録基盤
      sectionDefinitions.js # データタブ断面図描画用の定義群
    features/             # 画面の機能単位（タブ等）でまとめたUI制御と業務フロー
      calc/               # 「取り合い計算タブ」のUI
        calcInit.js       # 計算タブ（アプリ全体）の初期化エントリポイント
        appState.js       # 計算タブの入力状態（規格、長さ、数量等）を収集・状態管理
      dataTab/            # 「データタブ」のUI
        sectionSvg.js     # 断面図描画ロジック。寸法データを受け取りSVG文字列を生成する
      weight/             # 「重量タブ」のUI
        state.js          # 重量シミュレーターの状態管理
        rowOps.js         # 行データの追加・削除・計算更新などの操作ロジック
      cart/               # 出力トレイ・カートモーダルのUIとフロー
      historyInventory/   # 履歴・在庫統合タブUI
      materialStock/      # 在庫管理UI
      orderHistory/       # 履歴UI
      print/              # 印刷・帳票出力用機能
      customMaterials/    # カスタム鋼材追加モーダル等のUI
    inventory/            # [凍結中] 在庫管理サービスのUIとロジック
    services/             # 外部API通信、および一部のブラウザストレージ操作
      storage/            # ドメイン固有のデータを扱うリポジトリ群 (settingsStore.js, inventoryStore.js 等)
      supabase/           # Supabase連携API
    storage/              # localStorageの読み書きをラップする基盤・リポジトリ層
      local-store.js      # localStorage に対する低レベルのラッパー（読み書き、パース）
    styles/               # UIを構成するCSSファイル群
    ui/                   # 複数機能（features）から使い回される汎用UIコンポーネント（ボタン、モーダル等）
      page-state.js       # ページ遷移やタブ切り替えの状態管理
      interfaceChrome.js  # 画面の枠組み等のUI管理
      toast.js            # トースト通知UI
    utils/                # フォーマット変換等、UIに依存しない汎用ヘルパー関数 (html.js, dateUtils.js, jisRound.js 等)
  staging-auth-org/       # [凍結中] 事業所共有・ログイン機能再開用の試作コード原本
  supabase/               # [秘匿] Edge Functions等のバックエンド処理。Git管理対象外
  tests/                  # Jest による単体テスト、結合テスト群 (`npm run test`)
  tools/                  # Google Apps Script (GAS) 等の外部連携・補助ツール
  benchmark/              # V1/V2/V3アルゴリズムの性能検証用スクリプトと秘匿ドキュメント
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

