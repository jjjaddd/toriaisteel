/**
 * ============================================================
 *  TORIAI お問い合わせフォーム  —  Google Apps Script (GAS)
 * ============================================================
 *
 * 【使い方】
 *  1. Google スプレッドシートを新規作成する
 *  2. メニュー「拡張機能」→「Apps Script」を開く
 *  3. このファイルの中身を全コピーして貼り付け（既存コードは削除）
 *  4. 上部の adminEmail を自分のGmailアドレスに変更する
 *  5. 「保存」→「デプロイ」→「新しいデプロイ」
 *     - 種類: ウェブアプリ
 *     - 実行ユーザー: 自分
 *     - アクセスできるユーザー: 全員（匿名を含む）
 *  6. 「デプロイ」ボタンを押し、表示された URL をコピー
 *  7. toriai/contact.js の GAS_URL にそのURLを貼り付ける
 * ============================================================
 */

// ★ ここを自分のGmailアドレスに変更する
var adminEmail = 'konoshima@inoue-kouzai.co.jp';

// ============================================================
//  doPost  —  PWAからのフォームデータを受け取る
// ============================================================
function doPost(e) {
  try {
    // JSON データを解析
    var data = JSON.parse(e.postData.contents);

    var name    = data.name    || '（未入力）';
    var email   = data.email   || '（未入力）';
    var subject = data.subject || '（未入力）';
    var message = data.message || '（未入力）';
    var now     = new Date();

    // ── スプレッドシートに保存 ────────────────────────────
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // ヘッダー行がなければ自動作成
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['受信日時', 'お名前', 'メールアドレス', '件名', 'お問い合わせ内容']);
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    }

    sheet.appendRow([
      now,      // 受信日時
      name,     // お名前
      email,    // メールアドレス
      subject,  // 件名
      message   // 内容
    ]);

    // ── 管理者にメール通知 ───────────────────────────────
    var body = [
      'TORIAIサイトにお問い合わせが届きました。',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '■ お名前　　　: ' + name,
      '■ メールアドレス: ' + email,
      '■ 件名　　　　: ' + subject,
      '■ お問い合わせ内容:',
      '',
      message,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '受信日時: ' + Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
      '',
      '※ このメールは自動送信です。'
    ].join('\n');

    MailApp.sendEmail({
      to:      adminEmail,
      subject: '【TORIAIお問い合わせ】' + subject,
      body:    body,
      replyTo: email   // 返信先を送信者のメアドに設定
    });

    // ── 正常終了レスポンス ───────────────────────────────
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', message: '送信完了' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // ── エラーレスポンス ─────────────────────────────────
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
//  doGet  —  ブラウザから直接アクセスした場合の確認用
// ============================================================
function doGet() {
  return ContentService
    .createTextOutput('TORIAI お問い合わせフォーム GAS は正常に稼働しています。')
    .setMimeType(ContentService.MimeType.TEXT);
}
