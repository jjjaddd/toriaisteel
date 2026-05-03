# Phase 4 配線プラン — JS-native B&B をブラウザ本番に届ける

**Status**: Phase 4 着手済 (bb/* dual-mode 完了)、Phase 4.5 未着手
**Last updated**: 2026-05-03 22:30

---

## 0. ゴール

ブラウザで CASE-6 を `solveColumnGen` 経由で **723,500 (LP-tight 0.69%)** で解けるようにする。
Node テスト (`tests/bb/integration.test.js`) で確認済の挙動を、本番 UI から呼べる状態にする。

---

## 1. 現状

### 1.1 完了 (Phase 4)

- ✅ `bb/*.js` 4 ファイルを **dual-mode (Node + Browser)** に変換
  - `bb/lp.js`, `bb/algebraBranching.js`, `bb/branchAndBound.js`, `bb/mipFromPatterns.js`
  - Node では `module.exports`、Browser では `globalThis.Toriai.calculation.yield.bb.*`
  - `_resolveBbDep` ヘルパで require と global namespace の両対応
- ✅ `index.html` に script タグ追加（algorithmV3 直後）
- ✅ Node test 25/25 pass、CASE-6 still 723,500
- ✅ vm sandbox での browser branch 動作確認

### 1.2 未完了 (Phase 4.5)

- [ ] `arcflow/columnGen.js` の dual-mode 化
  - 依存: `highsAdapter.js`, `solver.js` の `solveMultiStockGreedy`
- [ ] `arcflow/highsAdapter.js` の `module.exports` 部分を dual-mode に
- [ ] `solveMultiStockGreedy` を `solver.js` から抽出して dual-mode 小ファイル化
  - or: `solver.js` 全体 (836 行) を dual-mode に
  - or: ブラウザ FFD は既存 `algorithmV3.js` を使う pluggable 設計に
- [ ] HiGHS-WASM CDN 配線
  - CSP 既に `cdn.jsdelivr.net` 許可済
  - `globalThis.highsLoader` を index.html で設定
- [ ] Worker (`yieldWorker.js`) に `cgBb` mode 追加
  - `importScripts` で arcflow + bb をロード
  - async handler で `solveColumnGen` を呼ぶ
- [ ] UI からの handoff
  - 大規模ケース判定 (k > 30 or n > 100) で worker に投げる
  - or: 設定で「深い最適化」トグル

---

## 2. リスクと判断

### 2.1 `solver.js` の扱い

`columnGen.js` は `ffdSolver.solveMultiStockGreedy` を初期パターンに使う。
`solver.js` は 836 行で graph.js に依存（Arc-Flow グラフ構築用、columnGen には不要）。

**案 A**: `solveMultiStockGreedy` 周辺だけ抽出して `arcflow/multiStockFfd.js` に独立化（推奨）
**案 B**: `solver.js` 全体を dual-mode に（手間が大きく、不要な graph.js 依存も持ち込む）
**案 C**: `columnGen.js` の `ffdSolver` を pluggable にし、ブラウザでは既存 `algorithmV3` を渡す

→ 案 A が最小工数。Phase 4.5 で着手する。

### 2.2 HiGHS-WASM の bundle 戦略

CDN (jsdelivr) から `highs-js` を読み込む方式が CSP 的に通る。
ローカル static で配信する場合は `worker-src 'self' blob:` 設定で十分（既存 CSP 準拠）。

### 2.3 Worker での async 扱い

Worker の onmessage は同期だが、内部で async 呼び出し → postMessage は問題なし:

```js
self.onmessage = async function(e) {
  if (e.data.mode === 'cgBb') {
    try {
      const result = await ns.arcflow.columnGen.solveColumnGen(spec, opts);
      self.postMessage({ ok: true, result, mode: 'cgBb' });
    } catch (err) {
      self.postMessage({ ok: false, error: err.message, mode: 'cgBb' });
    }
  }
};
```

---

## 3. 段階別マイルストーン

### M1: arcflow dual-mode 化（Phase 4.5 step 1）
- `solveMultiStockGreedy` 抽出 → `arcflow/multiStockFfd.js`
- `arcflow/highsAdapter.js` の export 部 dual-mode 化
- `arcflow/columnGen.js` の require / module.exports dual-mode 化
- Node test 全 pass 維持

### M2: HiGHS-WASM ブラウザ配線
- index.html に `<script src="https://cdn.jsdelivr.net/.../highs-js"></script>`
- `globalThis.highsLoader = highs;` 設定
- 簡易 smoke test page で `solveColumnGen` を直接呼んで結果確認

### M3: Worker 統合
- `yieldWorker.js` の `importScripts` に arcflow/bb を追加
- 新 mode 'cgBb' を追加
- `workerClient.js` 経由で UI から呼べるように

### M4: UI handoff
- 大規模 (CASE-6 級) を判定 → worker に cgBb mode で投げる
- 結果を既存の bars / stockTotal フォーマットに統合
- 進行状況 UI（worker の中間 postMessage で進捗表示）

### M5: 本番 deploy + 動作確認
- toriai.app に push
- 実機 CASE-6 で 723,500 出るか確認
- パフォーマンス計測 (wall time、メモリ)

---

## 4. 推定工数

| Milestone | 推定 |
|---|---|
| M1: arcflow dual-mode | 1-2h |
| M2: HiGHS-WASM 配線 | 30-60min |
| M3: Worker 統合 | 1h |
| M4: UI handoff | 1-2h |
| M5: 本番確認 | 30min |
| **合計** | **4-6 時間** |

次セッション 1-2 回で完遂できる規模。
