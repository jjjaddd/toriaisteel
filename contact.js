var GAS_URL = 'https://script.google.com/macros/s/AKfycbzdy3iDrtieC8qcpkMejASM1y1tAMVA1LeXstAYC6bOCyCcVpYzlcgwqJzAXD2RaP-h/exec';

function getContactFormPayload() {
  var name = ((document.getElementById('contactName') || {}).value || '').trim();
  var company = ((document.getElementById('contactCompany') || {}).value || '').trim();
  var email = ((document.getElementById('contactEmail') || {}).value || '').trim();
  var category = ((document.getElementById('contactCategory') || {}).value || '').trim();
  var message = ((document.getElementById('contactMessage') || {}).value || '').trim();

  var subjectParts = [];
  if (category) subjectParts.push('[' + category + ']');
  if (company) subjectParts.push(company);
  if (name) subjectParts.push(name);

  var messageLines = [];
  if (email) messageLines.push('メールアドレス: ' + email);
  if (company) messageLines.push('会社名: ' + company);
  if (category) messageLines.push('お問い合わせ種別: ' + category);
  if (messageLines.length) messageLines.push('');
  if (message) messageLines.push(message);

  return {
    name: name,
    email: email,
    company: company,
    category: category,
    subject: subjectParts.join(' '),
    message: messageLines.join('\n')
  };
}

function showContactStatus(msg, type) {
  var el = document.getElementById('contactStatus');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';

  if (type === 'success') {
    el.style.background = '#0b0b0b';
    el.style.border = '2px solid #18c964';
    el.style.color = '#d5ffe6';
    return;
  }
  if (type === 'error') {
    el.style.background = '#0b0b0b';
    el.style.border = '2px solid #ff6467';
    el.style.color = '#ffe1e1';
    return;
  }

  el.style.background = '#0b0b0b';
  el.style.border = '2px solid #ffffff';
  el.style.color = '#ffffff';
}

function setContactSubmitting(isSubmitting) {
  var submitBtn = document.getElementById('contactSubmitBtn');
  if (!submitBtn) return;
  submitBtn.disabled = !!isSubmitting;
  submitBtn.innerHTML = isSubmitting ? '送信中...' : '送信する <span class="arr">→</span>';
}

function submitContactForm(event) {
  if (event) event.preventDefault();

  var payload = getContactFormPayload();
  if (!payload.name || !payload.category || !payload.subject || !payload.message) {
    showContactStatus('ニックネーム、お問い合わせ種別、お問い合わせ内容を入力してください。', 'error');
    return;
  }
  if (!GAS_URL || GAS_URL === 'YOUR_GAS_URL_HERE') {
    showContactStatus('お問い合わせ送信先が設定されていません。', 'error');
    return;
  }

  setContactSubmitting(true);
  showContactStatus('送信しています。しばらくお待ちください。', 'info');

  var callbackName = '__toriaiContactCallback_' + Date.now();
  var cleanup = function() {
    try { delete window[callbackName]; } catch (_) {}
    var script = document.getElementById(callbackName);
    if (script && script.parentNode) script.parentNode.removeChild(script);
  };

  var timeout = setTimeout(function() {
    cleanup();
    setContactSubmitting(false);
    showContactStatus('送信に失敗しました。時間をおいてもう一度お試しください。', 'error');
  }, 12000);

  window[callbackName] = function(result) {
    clearTimeout(timeout);
    cleanup();
    setContactSubmitting(false);
    if (!result || result.status !== 'ok') {
      showContactStatus('送信に失敗しました。もう一度お試しください。', 'error');
      return;
    }
    showContactStatus('送信しました。ご連絡ありがとうございます。', 'success');
    var form = document.getElementById('contactForm');
    if (form) form.reset();
  };

  var params = [
    'callback=' + encodeURIComponent(callbackName),
    'name=' + encodeURIComponent(payload.name),
    'subject=' + encodeURIComponent(payload.subject),
    'message=' + encodeURIComponent(payload.message)
  ];

  var script = document.createElement('script');
  script.id = callbackName;
  script.src = GAS_URL + '?' + params.join('&');
  script.onerror = function() {
    clearTimeout(timeout);
    cleanup();
    setContactSubmitting(false);
    showContactStatus('送信に失敗しました。通信状態をご確認ください。', 'error');
  };
  document.body.appendChild(script);
}
