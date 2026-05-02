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

## 2026-04-30

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
- 作業ログ追加分は次の commit 予定
**未完了 / 引継ぎ**: なし
