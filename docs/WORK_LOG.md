# TORIAI 作業ログ

複数の AI エージェント（Claude / Codex / Gemini など）が並走するため、
**ユーザーから指示が来たら、その都度ここに 1 エントリを追加する**。

## ルール

- **1 ユーザーターン = 1 エントリ**（ユーザーが 1 回話しかけたら 1 件）
- 指示が雑談・確認だけ等で「コード変更なし」のときも、結論を 1 行残す
- 新しい日付になったら `## YYYY-MM-DD` 見出しを追加し、その下にエントリを並べる
- **常に最新の日付が一番上**（時系列を逆順にしない。下に追記していく）
- エントリは新しい順 → 古い順で 1 ファイル内に並ぶ
- 日付見出しは `## YYYY-MM-DD`、エントリ見出しは `### HH:MM [エージェント名]`

## エントリのフォーマット

```markdown
### HH:MM  [Claude]
**依頼**: <ユーザーが言ったことの要約>
**やったこと**:
- <箇条書きで簡潔に>
**ファイル**: `path/to/file.js`, `path/to/other.css`
**Commit**: `<hash>` または「未コミット」
**未完了 / 引継ぎ**: <なければ「なし」>
```

### 細目

- **エージェント名**: `[Claude]` / `[Codex]` / `[Gemini]` 等。並走確認用
- **時刻**: 24 時間表記。ローカルタイム（JST）で OK
- **依頼**: ユーザーの言った内容を 1〜2 行で要約。コピペ全文は不要
- **やったこと**: コード変更だけでなく「調査だけして実装は先送り」「質問して確認」も含めて書く
- **ファイル**: 実際に編集したファイル。読んだだけは含めない
- **Commit**: 複数あれば全部書く。push 済か未 push かも `(未push)` で明記
- **未完了 / 引継ぎ**: 次エージェントが続きをやるときに必要な情報。なければ `なし` と書く

---

## 2026-05-03

### 15:15  [Gemini]
**依頼**: algebraはクロードだけでやるからさわらなくていいよ！
**やったこと**:
- 指示を了解。今後、計算V3「代数版 (algebra)」および「arcflow」関連のタスクやファイルには一切触れず、Claudeに一任することを確認した。
**ファイル**: `docs/WORK_LOG.md`
**Commit**: 未コミット
**未完了 / 引継ぎ**: Claudeがalgebraを進める間、Geminiは他のタスク（データタブのSVG断面図など）を担当可能。指示待ち。

### 15:00  [Gemini]
**依頼**: docをすべて読んでルールを理解して、内容を説明してみて
**やったこと**:
- 提供された8つのドキュメント（AI_RULES, ALGEBRA_PLAN等）をすべて読み込み、プロジェクトの全体像と開発ルールを把握。
- v3「代数版」プロジェクトがPhase 1に入るタイミングであること、既存計算エンジンの凍結ルール、WORK_LOG記帳義務などを確認し、要約して返答。
**ファイル**: `docs/WORK_LOG.md`
**Commit**: 未コミット
**未完了 / 引継ぎ**: ユーザーからの具体的な実装指示（Phase 1の開始など）待ち

### 14:30  [Claude]
**依頼**: 刃厚 3mm / 端ロス両端 150mm 確定 / critical pair 列挙 GO / 世界初狙う
**やったこと**:
- BUG-V2-001 に確定値（blade=3, endloss=150）を反映、V2 出力 2,503mm を手計算で完全再現確認
- 最適解候補を計算: 41×10m + 1×9m → 母材 419,000mm（V2 比 -1,000mm）/ 41×10m + 1×8m → 418,000mm
- ALGEBRA_DESIGN.md §1.6 を全面拡張（v0.1 → v0.2）:
  - §1.6.1 規則の決定論化（R1-R5 の選択肢を一意化、特に R5 は最小 S\* lift）
  - §1.6.2 Termination の単調量を辞書式順序で定義（厳密減少の証明）
  - §1.6.3 全 15 critical pair を表形式で列挙、すべて合流確認
  - §1.6.4 Newman の補題で confluence 結論
  - §1.6.5 Phase 1 の経験的検証義務（property-based test 10,000 ケース）
- §6 OQ-1（R5 が confluence を壊す可能性）を解決済へ更新
- ALGEBRA_DIARY.md に Phase 0 完了エントリ（V2 数字検証 / (R3,R5) 解決 / Newman の強さ）
**ファイル**: `docs/ALGEBRA_BUG_LOG.md`, `docs/ALGEBRA_DESIGN.md`, `docs/ALGEBRA_DIARY.md`, `docs/WORK_LOG.md`
**Commit**: これから 1 件作成（Phase 0 完了）
**未完了 / 引継ぎ**:
- Phase 0 完了。コミット後 Phase 1 着手（最初の 1 行: `src/calculation/yield/algebra/term.js` の TERM 型）

### 13:30  [Claude]
**依頼**: 設計レビュー異論なし / V2 失敗ケース受領（1222mm × 334本で 10m × 42 本、最後 1 本だけ端材 2503mm）/ 設計書 4 つを `docs(algebra): bootstrap project docs` で 1 コミット + push
**やったこと**:
- BUG-V2-001 に具体データを追記（部材長 1222 × 334 / V2 出力スクリーンショット内容 / 期待される 9m or 8m 採用ケース / 推定原因 3 点 / V3 受け入れテスト方針）
- 単一部材長（k=1）でも定尺選択ミスが起きる事実を発見。V3 評価条件に追加
- コミット計画を 2 commit に分割（docs reorganization と algebra bootstrap を別ロジカルにする）:
  1. `chore(docs): archive obsolete docs to OLD_DOC and promote rules to AI_RULES`
  2. `docs(algebra): bootstrap V3 project docs and register V2 failure case`
- 刃厚 / 端ロスの値を後続でヒアリング必要（再現テスト作成のため）
**ファイル**:
- 更新: `docs/ALGEBRA_BUG_LOG.md`, `docs/WORK_LOG.md`
**Commit**: これから 2 件作成
**未完了 / 引継ぎ**:
- 刃厚 / 端ロスの実値ヒアリング待ち（Phase 0 完了条件、テスト作成のため）
- コミット後 push、その後 Phase 0 残タスク（critical pair 列挙）→ Phase 1 着手

### 13:00  [Claude]
**依頼**: docs 整理。不要候補（DEV_LOG/HANDOFF/NOTES/PHASE7_AUDIT/REFACTOR_TODO/TASK_BOARD/TODO/SECURITY_ACTIONS）を OLD_DOC へ隔離。必要なルールは AI_RULES.md に昇格
**やったこと**:
- リポジトリルートに `OLD_DOC/` 作成
- 8 ファイル隔離（git 追跡分は git mv で履歴保持、未追跡分は plain mv）:
  - `docs/DEV_LOG.md` → `OLD_DOC/DEV_LOG.md`（git mv）
  - `docs/HANDOFF.md` → `OLD_DOC/HANDOFF.md`（git mv）
  - `docs/PHASE7_AUDIT.md` → `OLD_DOC/PHASE7_AUDIT.md`（git mv）
  - `docs/REFACTOR_TODO.md` → `OLD_DOC/REFACTOR_TODO.md`（git mv）
  - `docs/TASK_BOARD.md` → `OLD_DOC/TASK_BOARD.md`（git mv）
  - `SECURITY_ACTIONS.md` → `OLD_DOC/SECURITY_ACTIONS.md`（git mv, ルートから）
  - `docs/NOTES.md` → `OLD_DOC/NOTES.md`（plain mv, 未追跡）
  - `docs/TODO.md` → `OLD_DOC/TODO.md`（plain mv, 未追跡）
- `docs/AI_RULES.md` 更新:
  - §1: 計算 V3「代数版」凍結ファイル通知を追加（V1/V2 関連 6 ファイル + algebra/arcflow ディレクトリ）
  - §2: 旧 REFACTOR_TODO.md / HANDOFF.md 参照を `ALGEBRA_PLAN.md` / `ARCHITECTURE.md` に差替、OLD_DOC 隔離通知を追加
  - §6: スクリプト読込順ルールを新規追加（HANDOFF §3-2 の暗黙知を昇格）
  - §9: 短縮プロンプトを新ドキュメント構成に合わせて全面書換
- 残された docs/ は AI_RULES / ARCHITECTURE / WORK_LOG / DATA_TAB_DIAGRAM_TODO / ALGEBRA_*.md の 8 ファイルのみ（クリーン）
**ファイル**:
- 新規: `OLD_DOC/` 配下 8 ファイル
- 更新: `docs/AI_RULES.md`
- 移動: 上記 8 ファイル
**Commit**: 未コミット
**未完了 / 引継ぎ**:
- ALGEBRA 4 ファイル新規 + AI_RULES 更新 + 8 ファイル移動の一括コミット可否確認待ち
- 設計書レビュー後 Phase 0 残タスク（V2 失敗ケース受領 / ベンチ基準値 / critical pair 列挙）に進む

### 12:30  [Claude]
**依頼**: E 採用 GO / 複数定尺強制ではないが計算量増えても単一定尺縮退は NG / 失敗時 V2 戻し / 並走 AI コミット注意 / 計画書・TODO・スケジュール・前提・バグ履歴・Qiita 用日記すべて準備して
**やったこと**:
- `docs/ALGEBRA_DESIGN.md` 作成（公理 A1-A9、簡約規則 R1-R5、正規形定義、等価類縮約、双対変数推論、純関数原則、drop-in patch 方式、フォールバック、成功条件、リスク表）
- `docs/ALGEBRA_PLAN.md` 作成（並走 AI 凍結ファイル通知、開始前チェックリスト、Phase 0-5 タスク、カレンダースケジュール、rollback 階段、テスト戦略）
- `docs/ALGEBRA_BUG_LOG.md` 作成（V2 既知バグ 2 件登録、エントリフォーマット、SLA、rollback 履歴枠）
- `docs/ALGEBRA_DIARY.md` 作成（着工日エントリ、Qiita 公開用メモ、章立て案、図表メモ）
- 多目的設計を「複数定尺強制せず、ただし時間圧で単一縮退する経路をコード上に存在させない」に修正
- 凍結ファイル: `src/calculation/yield/{algorithmV2,calcCore,patternPacking,repeatPlans,columnGeneration,cgClient}.js` を Phase 4 まで凍結通知
- コミット prefix `feat(algebra):` 等を運用ルール化
**ファイル**:
- 新規: `docs/ALGEBRA_DESIGN.md`, `docs/ALGEBRA_PLAN.md`, `docs/ALGEBRA_BUG_LOG.md`, `docs/ALGEBRA_DIARY.md`
- 更新: `docs/WORK_LOG.md`
**Commit**: 未コミット
**未完了 / 引継ぎ**:
- ユーザーレビュー待ち（公理系 / 簡約規則 / フォールバック方針 / スケジュール）
- レビュー後に Phase 0 残タスク（V2 失敗ケース具体データ受領、V2 ベンチマーク基準値測定、critical pair 列挙）に着手
- 設計書承認後にコミット予定（4 ファイル一括 `docs(algebra): bootstrap project docs`）
- 並走 AI（Codex / Gemini）への通知: 上記凍結リスト遵守

### 12:00  [Claude]
**依頼**: E（Symbolic Pattern Algebra）で行く / 金かからないこと最終確認
**やったこと**:
- ランニングコスト 0 を確認（純 JS/TS ブラウザ完結、HiGHS-WASM は MIT 静的ファイル、API 課金なし）
- ファイル配置案を提示（`src/calculation/yield/algebra/` と `arcflow/` を新規、既存は触らず）
- Phase 0〜5 の段階計画を提示（Phase 0 = 設計書のみ、コード 0）
- アーキテクチャ責務分離ルール（src/features 起点 / calculation 純関数）に準拠した配置
- Phase 0「`docs/ALGEBRA_DESIGN.md` ドラフト作成」着手の許可をユーザーに確認中
**ファイル**: `docs/WORK_LOG.md`
**Commit**: 未コミット
**未完了 / 引継ぎ**:
- Phase 0 着手 GO 待ち
- GO 出たら最初の産出物は `docs/ALGEBRA_DESIGN.md`（コード変更なし）

### 11:30  [Claude]
**依頼**: どれができたらすごい？ Claude がワクワクするやつを選んで
**やったこと**:
- 5 案を革新度でランキング → **E: Symbolic Pattern Algebra** を一押しに選定
- 理由: B/C は「新しい組合せ」、E は「新しい技法そのもの」で前例ゼロ。OR × 自動定理証明の交点に入る話
- Claude の強み（代数規則設計・整合性検証・反例生成）と直接マッチすることを説明
- 失敗確率 30-40% / 工期 4-6 週 を正直開示
- バランス案として「A: Arc-Flow + ④: 複数定尺強制 を基礎工事 → E は研究ブランチで並走」を提示
- B/C/D が E と協調する全部入り構成図も描いた
**ファイル**: `docs/WORK_LOG.md`
**Commit**: 未コミット
**未完了 / 引継ぎ**:
- E に賭けるか / A 単発で固めるか の選択待ち
- 並走研究ブランチの許容可否
- 実装着手は明示指示待ち

### 11:00  [Claude]
**依頼**: 時間かかってもいいから Claude ならではの革新的な最適解を / 必ず複数定尺の提案 / 量が増えても単一定尺に縮退しないこと
**やったこと**:
- 革新案 5 つ提示:
  1. LLM-Distilled Pattern Library（dev時に Claude が辞書蒸留 → runtime ゼロコストで warm-start）
  2. Symbolic Pattern Algebra（パターンを代数式扱い、theorem-prover 的アプローチ、前例ゼロ）
  3. Pareto Front Generator（5 パターン廃止 → 連続 Pareto 曲線 UI）
  4. Mandatory Multi-Stock Diversity（縮退防止のハード制約、ε-improvement ルール）
  5. Anytime Algorithm + Live Optimality Gap View
- 段階導入プラン（A: Arc-Flow基礎 → B: LLM蒸留 → C: Pareto UI → D: Anytime → E: 記号代数）
**ファイル**: `docs/WORK_LOG.md`
**Commit**: 未コミット
**未完了 / 引継ぎ**:
- 革新トリオ B/C/E のどれを採用するか回答待ち
- 既存 5 パターン → Pareto Front 化の UI 大改修許容可否
- 辞書サイズ許容範囲確認待ち
- 実装着手は明示指示待ち

### 10:30  [Claude]
**依頼**: V1 精度のまま k/n をスケールできる現代最強のアルゴリズムを WEB 上で実現したい。言語は何でもよい。早く・正確に・大量に。現在 5 パターン（歩留まり最大 / A/B/C / 残材優先）あり、ボタン押下で常に残材消費 → 最適化
**やったこと**:
- 現代の 1D-CSP 最適化の本命として **Arc-Flow 定式化 (Valério de Carvalho 1999) + HiGHS-WASM MIP ソルバー** を提案
- パターン列挙が指数爆発しない・k/n に対し疑似多項式・5 パターン全てを目的関数差替えで統一できる利点を整理
- 3-tier ハイブリッド構成（FFD瞬時 → CG-LP 下界 → Arc-Flow MIP 証明的最適）を提示
- Rust + wasm-pack 案 / JS + HiGHS-WASM 案 / 純 JS 案の比較
- 2 週間程度で V1/V2 完全置換のロードマップ提示
**ファイル**: `docs/WORK_LOG.md`（このログのみ）
**Commit**: 未コミット
**未完了 / 引継ぎ**:
- 方式選択（Arc-Flow + HiGHS-WASM / 純 JS / Rust-WASM のどれか）回答待ち
- V1/V2 完全削除 vs 追加上書きの方針確認待ち
- 失敗ケース具体データ提供待ち
- 実装は明示指示が来てから着手

### 10:00  [Claude]
**依頼**: V1 と V2 の違いを説明 / V1 の方が精度高そう / 長考モードは削除済 / V2 で残材3000があるのに長い定尺を選ぶ等の明らかなミス / 列生成等 WEB で動く最強アルゴリズムに一新したい（相談ベース）
**やったこと**:
- `algorithmV2.js`, `calcCore.js`, `patternPacking.js` を読み込み V1/V2 の分岐構造を整理
- V2 が k>13 または n>80 で `packDpGreedy` / `generateSmartPatterns` のヒューリスティクスに落ちる設計上の理由を回答
- 「残材余りなのに長い定尺」の症状は heuristic 候補プール（500件）に最適パターンが含まれない可能性が高いと推定
- 再設計案として既存 `columnGeneration.js` を主アルゴリズムに昇格する案（Gilmore-Gomory 列生成）を提示
- 失敗ケースの具体例 / `columnGeneration.js` 中身読込許可 / 長考モード残骸除去の許可 をユーザーに確認中
**ファイル**: `docs/WORK_LOG.md`（このログのみ）
**Commit**: 未コミット
**未完了 / 引継ぎ**:
- ユーザー回答待ち（具体例 + 列生成方針 GO/NO-GO + 長考モード残骸除去）
- 実装は明示指示が来てから着手

## 2026-04-30

### 14:15  [Claude]
**依頼**: なんか前のほうが計算精度高かった気がする
**やったこと**:
- 精度劣化の可能性箇所を整理（`findRepeatPlansV2` の `MAX_PATTERN_RETURN` 上限、`bnbTimeLimit` 打ち切り）
- 検証手順を提示: ①長考モード ON で確認 ②`Toriai.calculation.yield.algorithmV2Config.rollback()` で V1 と比較 ③履歴と同条件再計算
- 再現条件（規格 / 部材長 / 数値悪化箇所）をユーザーにヒアリング中
**ファイル**: なし（調査のみ、コード変更なし）
**Commit**: なし
**未完了 / 引継ぎ**:
- ユーザーからの再現条件回答待ち
- 計算 V2 はルール上勝手に rollback / 修正しない。明示指示が来てから動く

### 14:05  [Claude]
**依頼**: 今って計算方法 V2 になってる？
**やったこと**:
- `index.html` を確認 → `src/calculation/yield/algorithmV2.js?v=phase2` がロードされている
- l.1101 コメントで `cgClient.js` は「CG/B&P 不採用方針で除去（2026-05-01 セキュリティ対応）」と確認
- `algorithmV2.js` 冒頭を読み、drop-in patch 方式（既存 pack/findRepeatPlans を上書き）+ 長考モード（`MODE_CONFIGS.deep`）が実装済と確認
- 結論: **V2 は本番稼働中、CG は外されている**
**ファイル**: なし（調査のみ）
**Commit**: なし
**未完了 / 引継ぎ**: なし

### 13:50  [Claude]
**依頼**: コデックスがやり残したコミット・プッシュをやる + 作業ログ運用ルールを新設
**やったこと**:
- 未コミット 11 ファイル（データタブ断面図 + サイドバー検索ツールチップの実装メモ）を内容確認
- `npx jest tests/calc.test.js tests/storage.test.js --runInBand` → 8 passed を確認
- まとめてコミット & push
- 作業ログ運用ルールをユーザーと合意（1 ユーザーターン = 1 エントリ、最新を上）
- `docs/WORK_LOG.md` 新設、`docs/AI_RULES.md` に必須ルール追加、メモリ保存
**ファイル**:
- 既存 (Codex 由来): `docs/DATA_TAB_DIAGRAM_TODO.md`, `index.html`, `service-worker.js`, `src/data/sectionDefinitions.js`, `src/data/steel/hBeam/specs.js`, `src/features/dataTab/{kindSidebar,renderSpec,sectionSvg}.js`, `src/features/weight/kindSpecPreview.js`, `src/styles/dataTab.css`, `staging-auth-org/HANDOFF-sidebar-tooltip.md`
- 今セッション追加: `docs/WORK_LOG.md`, `docs/AI_RULES.md`
**Commit**:
- `24c855d` Codex データタブ作業をまとめて commit + push 済
- `17c9d73` 作業ログ運用ルール新設（commit + push 済）
**未完了 / 引継ぎ**: なし
