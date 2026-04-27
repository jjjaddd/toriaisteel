# TORIAI Auth + Org 統合手順

Codex のコード編集が終わったあと、以下の順番で既存コードに差し込めば動く状態になるようにしてあります。既存ファイルを触らずに `staging-auth-org/` に置いてある状態が現在です。

## 0. 事前作業（コード編集ゼロ）

Supabase 側の準備。

1. `schema.sql` を Supabase の SQL Editor に貼って実行
   - プロジェクト：`pryogyuclybetietopjm`（既に使用中のもの）
   - これで `profiles / organizations / org_members / invitations / projects / project_assignees / inventory / remnants / cut_plans / weight_calcs / custom_materials / custom_stock_lengths` が作られ、RLS ポリシーと triggers / RPC も入る
2. Supabase Dashboard → Authentication → Providers → Email を有効化
   - "Confirm email" は最初は OFF でデモを軽くするのがオススメ（本番化時にON）
3. Authentication → URL Configuration → Site URL に本番 URL を登録

## 1. ファイル配置

`staging-auth-org/` の JS/CSS を本体側にコピー。supabase 関連は `src/services/supabase/` に集約済みなので、認証・組織関連も同じディレクトリに揃える。

```
cp staging-auth-org/toriai-auth-service.js   src/services/supabase/authService.js
cp staging-auth-org/toriai-org-service.js    src/services/supabase/orgService.js
cp staging-auth-org/toriai-org-storage.js    src/services/supabase/orgStorage.js
cp staging-auth-org/toriai-auth-ui.js        src/features/auth/authUi.js
cp staging-auth-org/toriai-auth-ui.css       src/styles/authUi.css
```

## 2. index.html への追加

### 2-1. `<head>` に CSS を追加

```html
<link rel="stylesheet" href="src/styles/authUi.css?v=1">
```

### 2-2. `</body>` 直前、`src/services/supabase/client.js` より **あと** に JS を追加

既存 `src/services/supabase/client.js` は `window.supabaseClient` を作っている。これに依存するので順序を間違えない。

```html
<!-- 既存 -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="src/services/supabase/client.js"></script>
<script src="src/services/supabase/sync.js"></script>

<!-- 追加（この順で） -->
<script src="src/services/supabase/authService.js?v=1"></script>
<script src="src/services/supabase/orgService.js?v=1"></script>
<script src="src/services/supabase/orgStorage.js?v=1"></script>
<script src="src/features/auth/authUi.js?v=1"></script>
```

### 2-3. ヘッダーに事業所スイッチャー用の入れ物を追加

既存のヘッダー（ブランド名の近く）に 1 箇所。どこでもよいが右端が自然。

```html
<div id="toriaiOrgSwitcher"></div>
```

### 2-4. ブート処理を追加

アプリの初期化スクリプト（`main.js` の末尾 or DOMContentLoaded）に：

```js
// 認証ブート
Toriai.authUI.boot({
  requireAuth: true,        // 未ログインなら強制モーダル
  onSuccess: function() { location.reload(); }
});
// ヘッダーに事業所スイッチャーをマウント
var sw = document.getElementById('toriaiOrgSwitcher');
if (sw) Toriai.authUI.mountSwitcher(sw);

// 事業所切替時は該当タブを再描画
window.addEventListener('toriai:active-org-changed', function() {
  if (typeof renderInventory === 'function') renderInventory();
  if (typeof renderRemnants === 'function') renderRemnants();
});
```

## 3. 既存保存処理の置き換え（在庫・端材だけ Phase A）

デモでまず共有したいのは **在庫と端材**。Codex が触っている `storage.js` が落ち着いたあとに、ここだけ差し替える。

### 3-1. 在庫（storage.js `saveInventory` 付近）

現状は `localStorage.setItem('so_inventory_v2', JSON.stringify({...}))` → `sbUpsert('inventory', data)` の流れ。

差し替え：

```js
function saveInventory(state) {
  // 既存の localStorage 書き込み（オフラインキャッシュとして残す）
  localStorage.setItem('so_inventory_v2', JSON.stringify(state));

  // 事業所スコープで Supabase へ
  if (window.Toriai && Toriai.orgStorage && Toriai.org && Toriai.org.getActiveOrgId()) {
    Toriai.orgStorage.saveInventory(state.items || []);
  }
}

async function loadInventory() {
  // 優先：Supabase（事業所データ）
  if (window.Toriai && Toriai.orgStorage && Toriai.org && Toriai.org.getActiveOrgId()) {
    try {
      var rows = await Toriai.orgStorage.loadInventory();
      var state = { items: rows };
      localStorage.setItem('so_inventory_v2', JSON.stringify(state));
      return state;
    } catch(e) { console.warn('inventory load fallback to localStorage', e); }
  }
  // フォールバック：localStorage
  try { return JSON.parse(localStorage.getItem('so_inventory_v2')) || { items: [] }; }
  catch(e) { return { items: [] }; }
}
```

### 3-2. 端材（remnants 側 も同じ要領）

`so_remnants` を読み書きしている箇所を、`Toriai.orgStorage.saveRemnants` / `loadRemnants` に寄せる。

## 4. 既存の device_id データ → 事業所データへ取り込み

ユーザーが初めてログインした直後に、「これまでのデバイスのデータを `〇〇事業所` に取り込みますか？」のダイアログを出す想定。いまはコードだけ置いてあって UI からは呼んでいない。

呼び出し側（例）：

```js
// 事業所作成直後のコールバック内
if (confirm('このブラウザに残っている在庫・端材・カスタム材をこの事業所に取り込みますか？')) {
  Toriai.orgStorage.migrateFromLocalStorage().then(function() {
    alert('取り込みました');
    location.reload();
  });
}
```

UI は Phase A-4 のタスク。MVP デモではひとまず **新規事業所＝ゼロから** で出すのも有り。

## 5. supabase-sync.js の扱い

- `supabase-sync.js` の `SB_TABLE_MAP` のうち `inventory / remnants / custom_materials` は Phase A 以降不要になる
- ただし `cut_history / weight_history / weight_calcs` はまだ device_id ブロブのまま残すのが安全（Phase B 以降で個別移行）
- `SB_TABLE_MAP` から `inventory / remnants / custom_materials` を外すだけで衝突しない状態になる

## 6. 動作確認チェックリスト（デモ用 MVP）

- [ ] schema.sql を Supabase で実行した
- [ ] Auth → Email provider 有効化
- [ ] 新規 email でサインアップ → 事業所作成ダイアログが出る
- [ ] 事業所作成 → ヘッダーに事業所名が出る
- [ ] 招待コード発行 → 別ブラウザ / シークレットモードで新規登録 → 招待コードで参加
- [ ] 2 名とも同じ在庫リストが見える
- [ ] オーナーがメンバーを削除できる
- [ ] ログアウト → 再ログインで元の事業所に戻る
- [ ] 事業所切替ドロップダウンで切り替えるとタブが再描画される

## 7. 既知の未実装（MVP 後）

- パスワード再設定メールのリダイレクト先ページ（index.html に PASSWORD_RECOVERY を拾う仕組みが必要。UI 側に実装済みの onAuthStateChange から発火）
- `cut_plans` / `weight_calcs` / `weight_history` の org 共有化
- オーナー移譲 UI（API は `Toriai.org.transferOwnership` で用意済み）
- 事業所アーカイブ UI（API は `Toriai.org.archiveOrg` で用意済み）
- フリープランの回数制限・watermark
- Stripe 連携

## 8. 切り戻し手順

問題が出たら：

1. index.html から `<script src="toriai-auth-*">` 4 行と `<link ... toriai-auth-ui.css>` を消す
2. storage.js の 3-1 / 3-2 を元に戻す
3. supabase-sync.js の `SB_TABLE_MAP` を元に戻す

これで完全に旧状態に戻る（新規 Supabase テーブルを残してもアプリは古い経路で動く）。

## 9. 公開 API 早見表

```js
// 認証
Toriai.auth.signUp(email, password, displayName)
Toriai.auth.signIn(email, password)
Toriai.auth.signOut()
Toriai.auth.resetPassword(email)
Toriai.auth.getUser()
Toriai.auth.getSession()
Toriai.auth.getProfile()
Toriai.auth.onAuthStateChange(cb)

// 事業所
Toriai.org.getActiveOrgId()
Toriai.org.setActiveOrgId(orgId)
Toriai.org.listMyOrgs()
Toriai.org.createOrg(name)
Toriai.org.listMembers(orgId)
Toriai.org.removeMember(orgId, userId)
Toriai.org.createInvitation(orgId, email)
Toriai.org.acceptInvitation(code)
Toriai.org.transferOwnership(orgId, newOwnerUserId)

// 保存
Toriai.orgStorage.saveInventory(items)
Toriai.orgStorage.loadInventory()
Toriai.orgStorage.saveRemnants(items)
Toriai.orgStorage.loadRemnants()
Toriai.orgStorage.saveCustomMaterials(items, { shared: true })
Toriai.orgStorage.loadCustomMaterials()
Toriai.orgStorage.migrateFromLocalStorage()

// UI
Toriai.authUI.boot({ requireAuth: true })
Toriai.authUI.openLogin()
Toriai.authUI.openOrgCreate()
Toriai.authUI.openJoin()
Toriai.authUI.openInvite(orgId)
Toriai.authUI.openMembers(orgId)
Toriai.authUI.mountSwitcher(containerEl)
```

## 10. イベント

```js
// 事業所切替
window.addEventListener('toriai:active-org-changed', function(e) {
  console.log('active org ->', e.detail.orgId);
});

// Supabase Auth
Toriai.auth.onAuthStateChange(function(event, session) {
  // event = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY'
});
```
