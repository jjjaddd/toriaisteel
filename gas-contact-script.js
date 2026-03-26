var ADMIN_EMAIL = 'konoshima@inoue-kouzai.co.jp';
var SENDER_ALIAS = 'support.toriai@gmail.com';

function sendContactMail(subject, body) {
  var options = {
    name: 'TORIAI'
  };

  try {
    var aliases = GmailApp.getAliases();
    if (aliases && aliases.indexOf(SENDER_ALIAS) !== -1) {
      options.from = SENDER_ALIAS;
      options.replyTo = SENDER_ALIAS;
    }
  } catch (err) {
    // Alias lookup failed; fall back to the executing account.
  }

  GmailApp.sendEmail(
    ADMIN_EMAIL,
    '【TORIAIお問い合わせ】' + subject,
    body,
    options
  );
}

function buildMailPayload(data) {
  var now = new Date();
  var name = data.name || '匿名';
  var subject = data.subject || '未選択';
  var message = data.message || '';

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

  sendContactMail(subject, body);
}

function jsonpResponse(callback, payload) {
  var body = callback + '(' + JSON.stringify(payload) + ');';
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doGet(e) {
  var callback = e && e.parameter && e.parameter.callback;
  if (!callback) {
    return ContentService
      .createTextOutput('TORIAI contact mail endpoint is active.')
      .setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    buildMailPayload({
      name: e.parameter.name,
      subject: e.parameter.subject,
      message: e.parameter.message
    });
    return jsonpResponse(callback, { status: 'ok' });
  } catch (err) {
    return jsonpResponse(callback, { status: 'error', message: String(err) });
  }
}

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    buildMailPayload(data);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
