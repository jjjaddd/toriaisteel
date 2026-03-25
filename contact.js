/**
 * contact.js  —  お問い合わせフォーム送信ロジック
 *
 * ★ GASをデプロイ後、下の GAS_URL を書き換えてください。
 *   例: 'https://script.google.com/macros/s/AKfyc.../exec'
 */
var GAS_URL = 'https://script.google.com/macros/s/AKfycby0sGxXqDuSagHSiwapu38yRhtjnE7THRKp4lLiR8E0aAkLnxuXuy0i1t1hFq6NVAQMIg/exec';

function getContactFormPayload() {
  return {
    name: (document.getElementById('contactName').value || '').trim(),
    email: (document.getElementById('contactEmail').value || '').trim(),
    subject: (document.getElementById('contactSubject').value || '').trim(),
    message: (document.getElementById('contactMessage').value || '').trim()
  };
}

/**
 * フォーム送信処理
 */
function submitContactForm(event) {
  event.preventDefault();

  var payload = getContactFormPayload();
  var name = payload.name;
  var email = payload.email;
  var subject = payload.subject;
  var message = payload.message;

  // ─── バリデーション ───────────────────────────────────
  if (!name || !email || !subject || !message) {
    showContactStatus('すべての項目を入力してください。', 'error');
    return;
  }
  // 簡易メール形式チェック
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showContactStatus('メールアドレスの形式が正しくありません。', 'error');
    return;
  }
  // GAS URLが未設定の場合
  if (GAS_URL === 'YOUR_GAS_URL_HERE') {
    showContactStatus('【設定未完了】GAS URLがまだ設定されていません。contact.js の GAS_URL を更新してください。', 'error');
    return;
  }

  // ─── 送信ボタンをロック ──────────────────────────────
  var submitBtn = document.getElementById('contactSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '送信中...';
  showContactStatus('送信しています。しばらくお待ちください…', 'info');

  // ─── GASへ送信（no-cors モードでCORS問題を回避） ─────
  fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',            // GAS側でCORSヘッダー不要
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(function() {
    // no-cors では response body は読めないが、送信自体は完了している
    showContactStatus('✅ 送信しました！担当者よりご連絡差し上げます。', 'success');
    document.getElementById('contactForm').reset();
  })
  .catch(function(err) {
    console.error('ContactForm error:', err);
    showContactStatus('❌ 送信に失敗しました。ネットワークを確認して再度お試しください。', 'error');
  })
  .finally(function() {
    submitBtn.disabled = false;
    submitBtn.textContent = '送信する →';
  });
}

/**
 * ステータスメッセージを表示
 * @param {string} msg   - 表示テキスト
 * @param {string} type  - 'success' | 'error' | 'info'
 */
function showContactStatus(msg, type) {
  var el = document.getElementById('contactStatus');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  if (type === 'success') {
    el.style.background = '#f0fdf4';
    el.style.border     = '1px solid #86efac';
    el.style.color      = '#15803d';
  } else if (type === 'error') {
    el.style.background = '#fff1f2';
    el.style.border     = '1px solid #fca5a5';
    el.style.color      = '#b91c1c';
  } else {
    el.style.background = '#f0f9ff';
    el.style.border     = '1px solid #7dd3fc';
    el.style.color      = '#0369a1';
  }
}
