var GAS_URL = 'https://script.google.com/macros/s/AKfycbzdy3iDrtieC8qcpkMejASM1y1tAMVA1LeXstAYC6bOCyCcVpYzlcgwqJzAXD2RaP-h/exec';

function getContactFormPayload() {
  var validation = window.Toriai && window.Toriai.utils && window.Toriai.utils.validation;
  var sanitize = validation && typeof validation.sanitizeFreeText === 'function'
    ? validation.sanitizeFreeText
    : function(value, maxLength) {
        var text = value == null ? '' : String(value).trim();
        return typeof maxLength === 'number' ? text.slice(0, maxLength) : text;
      };

  var name = sanitize((document.getElementById('contactName') || {}).value || '', 80);
  var company = sanitize((document.getElementById('contactCompany') || {}).value || '', 120);
  var email = sanitize((document.getElementById('contactEmail') || {}).value || '', 160);
  var category = sanitize((document.getElementById('contactCategory') || {}).value || '', 80);
  var message = sanitize((document.getElementById('contactMessage') || {}).value || '', 4000);

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

  var params = [
    'name=' + encodeURIComponent(payload.name),
    'subject=' + encodeURIComponent(payload.subject),
    'message=' + encodeURIComponent(payload.message)
  ];

  function onSubmitSuccess() {
    setContactSubmitting(false);
    showContactStatus('送信しました。ご連絡ありがとうございます。', 'success');
    var form = document.getElementById('contactForm');
    if (form) form.reset();
  }

  function onSubmitError(message) {
    setContactSubmitting(false);
    showContactStatus(message || '送信に失敗しました。通信状態をご確認ください。', 'error');
  }

  if (typeof fetch !== 'undefined') {
    var fetchDone = false;
    var fetchTimeout = setTimeout(function() {
      if (fetchDone) return;
      fetchDone = true;
      onSubmitError('送信に失敗しました。時間をおいてもう一度お試しください。');
    }, 12000);

    fetch(GAS_URL + '?' + params.join('&'), {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store'
    }).then(function() {
      if (fetchDone) return;
      fetchDone = true;
      clearTimeout(fetchTimeout);
      onSubmitSuccess();
    }).catch(function() {
      if (fetchDone) return;
      fetchDone = true;
      clearTimeout(fetchTimeout);
      onSubmitError();
    });
    return;
  }

  var callbackName = '__toriaiContactCallback_' + Date.now();
  var cleanup = function() {
    try { delete window[callbackName]; } catch (_) {}
    var script = document.getElementById(callbackName);
    if (script && script.parentNode) script.parentNode.removeChild(script);
  };

  var timeout = setTimeout(function() {
    cleanup();
    onSubmitError('送信に失敗しました。時間をおいてもう一度お試しください。');
  }, 12000);

  window[callbackName] = function(result) {
    clearTimeout(timeout);
    cleanup();
    if (!result || result.status !== 'ok') {
      onSubmitError('送信に失敗しました。もう一度お試しください。');
      return;
    }
    onSubmitSuccess();
  };

  var script = document.createElement('script');
  script.id = callbackName;
  script.src = GAS_URL + '?callback=' + encodeURIComponent(callbackName) + '&' + params.join('&');
  script.onerror = function() {
    clearTimeout(timeout);
    cleanup();
    onSubmitError();
  };
  document.body.appendChild(script);
}
