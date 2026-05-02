# TORIAI セキュリティ対応・残作業リスト

最終更新: 2026-05-01

---

## ✅ 完了した対応（私側）

### 1. cgClient.js の配線除去
- `index.html` から `<script src="...cgClient.js">` を除去
- CG/B&P を使わない方針に従い、フロントから Edge Function を叩く経路を断った
- ローカルファイル `src/calculation/yield/cgClient.js` 自体は残してあるが、誰からも呼ばれていない

### 2. CSP（Content Security Policy）導入
- `index.html` の `<head>` 内に `<meta http-equiv="Content-Security-Policy">` を追加
- `benchmark.html` にも同様に追加
- 許可した外部ホスト：
  - **script-src**: cdn.jsdelivr.net / *.posthog.com / *.umami.is
  - **connect-src**: pryogyuclybetietopjm.supabase.co / *.posthog.com / *.umami.is / script.google.com
  - **font-src**: fonts.gstatic.com
- inline onclick が 138 箇所あるため `'unsafe-inline'` は維持（除外には大規模な refactor が要る）
- それでも「外部スクリプトを差し込む」「データを別ドメインに exfil する」攻撃は遮断される

公開後にコンソールで `Refused to load ... violates Content Security Policy` が出たら、そのドメインを許可リストに追加してください。

---

## 🔴 ユーザー側で必須の作業

### A. Supabase ダッシュボードで Edge Function `cg` を削除（最優先）

CG/B&P を使わない方針なので、デプロイ済みの Edge Function を **完全に削除**してください。今のままだと URL を知っている人なら誰でも計算リソースを消費させられます（DoS / 課金枠食い潰しのリスク）。

**手順**:

1. https://supabase.com/dashboard にログイン
2. プロジェクト **pryogyuclybetietopjm** を選択
3. 左メニュー **「Edge Functions」** を開く
4. `cg` 関数があれば **「Delete function」** で完全削除
5. 念のため `curl https://pryogyuclybetietopjm.supabase.co/functions/v1/cg` を打って 404 が返ることを確認

確認できたら、ローカルの `supabase/functions/cg/` フォルダも削除して構いません（gitignore 済みで GitHub には出てません）。

---

### B. RLS（Row Level Security）の確認（最優先）

`org_inventory`, `org_remnants`, `org_custom_materials`, `org_custom_stock_lengths`, `org_members`, `organizations` などのテーブルが、**anon ロールで読み書きできない設定になっているか**を確認してください。これが緩いと顧客の在庫情報が外部から漏洩します。

**手順**:

1. Supabase ダッシュボード → プロジェクト → **「Authentication」 → 「Policies」** を開く
2. 各テーブルについて以下を確認：
   - **RLS が「Enabled」になっている** （オレンジの「RLS not enabled」表示が出ていないこと）
   - ポリシーが「`auth.uid()` ベースで自分の組織のデータだけ見える」ものになっている
   - **anon ロール用のポリシーは無い**（または明示的に「無効」）
3. もし RLS 無効なテーブルがあれば、**「Enable RLS」をクリック**

RLS が無効なテーブルは、SUPABASE_KEY を持っている人なら誰でも全件取得できます（フロントエンドのコードを見れば SUPABASE_KEY は必ず見える）。

確認後、各テーブル名と RLS 状態を私に教えてもらえれば、ポリシー設計のレビューもします。

---

### C. PostHog の API キー保護

`phc_CBrYMEE88DPS7MfaqozGkV4FxxwdJfXNaTAb5zzGediC` は client-side 公開前提のキーですが、攻撃者が大量にイベントを送るとイベント枠を消費されます。

**手順**:

1. PostHog ダッシュボード → 左メニュー「Project Settings」
2. **「Authorized URLs」** で `https://toriai.app` のみ許可（他のドメインから送られたイベントを無視）
3. **「Anonymous events」** のレートリミットがあれば設定

---

### D. GAS（feedback フォーム）の保護

`https://script.google.com/macros/s/AKfycbz.../exec` がフロントに hardcoded されており、誰でも叩けます。スパム送信を防ぐためトークン検証を入れてください。

**手順** (Google Apps Script 側):

```javascript
function doPost(e) {
  // 簡易 honeypot: フォームに見えない hidden field "website" を仕込み、
  // 値が入っていたら bot とみなして拒否
  var data = JSON.parse(e.postData.contents);
  if (data.website) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'rejected' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // 簡易 token 検証: フロントが投げる固定トークン（公開してもいいが、雑な spam bot は弾ける）
  if (data.token !== 'TORIAI_FEEDBACK_v1') {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'invalid token' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // 既存の処理...
}
```

honeypot field をフォームに追加：
```html
<input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">
```

これだけで bot 経由の spam の 9 割は止まります。

---

## 🟡 中優先・推奨

### E. innerHTML への顧客データ流入箇所の手動レビュー

`escapeHtml` ユーティリティはあるが、innerHTML 128 箇所のうち**顧客名・工事名・自由記述メモ**が混ざる経路が一部あります。XSS 入力を投げ込まれた時に発火する可能性があります。

CSP が入ってる今は影響限定的ですが、念のため確認したい箇所：

- `src/features/calc/calcRender.js` （顧客名・工事名表示）
- `src/features/cart/cartModal.js` （部材リスト）
- `src/features/orderHistory/historyRender.js` （履歴表示）
- `src/features/cart/cartCopy.js` （印刷用 HTML）

私側で 1〜2 時間かけて監査できます。やりますか？

---

### F. プライバシーポリシー / 利用規約

商用化（Pro 課金など）するなら必須。GitHub Pages で `privacy.html` と `terms.html` を立てて、フッターからリンク。

LLM 図面抽出機能を入れる場合は、**「画像を Anthropic API に送信する」「Anthropic はデータを訓練に使わない」「ユーザーが同意した上で送信」**を明記する必要があります。

テンプレートが必要なら作ります。

---

### G. Subresource Integrity (SRI)

CDN から読み込んでいる外部スクリプトに `integrity="sha384-..."` を追加すれば、CDN 改ざん攻撃を防げます。

対象：
- `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- `https://cdn.jsdelivr.net/npm/chart.js@4.4.1/...`

工数 30 分程度。

---

## ⚪ 低優先・将来

- npm audit を CI で定期実行（`.github/workflows/test.yml` に追加）
- 依存パッケージの自動更新（dependabot）
- HSTS / Permissions-Policy（GitHub Pages では `<meta>` 経由で設定可能だが効果限定的）
- Cloudflare 経由化（HTTP ヘッダーをきちんと付けたい場合）

---

## 💡 設計上の議論

### Pro 化を見据えるなら

LLM 図面抽出 / 残材組織 DB を入れる時の認証フローを先に固めるべき：

1. Supabase Auth（email + password）でユーザー識別 ← 既に実装あり
2. Stripe で月額課金、`is_pro = true` フラグを `auth.users.user_metadata` に保存
3. **特定機能は `auth.uid()` + Pro フラグで認可ゲート**
4. Edge Function を再導入する時は必ず JWT 検証

この設計が固まってない状態で機能追加すると、認証穴が後から大量発生します。

### 顧客データの扱いを明確にする

「顧客名」「工事名」が入る部材リストは取引先の機密情報です。

- ローカル localStorage のみ → 個人利用、漏洩リスクは端末紛失程度
- Supabase 同期する → クラウドに置かれる、暗号化・RLS必須・退会時削除手順必須
- LLM API に送信 → 第三者（Anthropic）にデータが渡る、明示的同意必須

それぞれのモードを UI で**ユーザーが選べる**ようにすると、商用化時の説明責任が果たせます。
