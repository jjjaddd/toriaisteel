var ADMIN_EMAIL = 'konoshima@inoue-kouzai.co.jp';

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var name = data.name || '匿名';
    var subject = data.subject || '未選択';
    var message = data.message || '';
    var now = new Date();

    var body = [
      'TORIAI にお問い合わせが届きました。',
      '',
      'ペンネーム: ' + name,
      '件名: ' + subject,
      '',
      'お問い合わせ内容:',
      message,
      '',
      '受付日時: ' + Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss')
    ].join('\n');

    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: '【TORIAIお問い合わせ】' + subject,
      body: body
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('TORIAI contact mail endpoint is active.')
    .setMimeType(ContentService.MimeType.TEXT);
}
