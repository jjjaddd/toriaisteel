(function(global) {
  'use strict';

  var ns = global.Toriai.ui.contact = global.Toriai.ui.contact || {};

  ns.buildFeedbackBody = function buildFeedbackBody() {
    var client = (document.getElementById('jobClient') || {}).value || '';
    var jobName = (document.getElementById('jobName') || {}).value || '';
    var note = (document.getElementById('jobWorker') || {}).value || '';
    var feedbackType = (document.getElementById('contactType') || {}).value || 'ご意見';
    var sender = (document.getElementById('contactSender') || {}).value || '';
    var reply = (document.getElementById('contactReply') || {}).value || '';
    var body = (document.getElementById('contactBody') || {}).value || '';
    return [
      'お世話になっております。',
      '',
      'TORIAI ベータ版について、以下の内容を共有します。',
      '',
      '種別: ' + feedbackType,
      '顧客名: ' + client,
      '工事名: ' + jobName,
      '送信者名: ' + sender,
      '返信先: ' + reply,
      'メモ: ' + note,
      '',
      '【内容】',
      body || '',
      '',
      'よろしくお願いいたします。'
    ].join('\n');
  };

  ns.buildFeedbackMailto = function buildFeedbackMailto() {
    return 'mailto:support.toriai@gmail.com?subject=' + encodeURIComponent('TORIAI お問い合わせ') + '&body=' + encodeURIComponent(ns.buildFeedbackBody());
  };

  ns.buildFeedbackGmailUrl = function buildFeedbackGmailUrl() {
    var params = [
      'view=cm',
      'fs=1',
      'to=' + encodeURIComponent('support.toriai@gmail.com'),
      'su=' + encodeURIComponent('TORIAI お問い合わせ'),
      'body=' + encodeURIComponent(ns.buildFeedbackBody())
    ];
    return 'https://mail.google.com/mail/?' + params.join('&');
  };

  ns.openFeedbackMailDefault = function openFeedbackMailDefault() {
    global.location.href = ns.buildFeedbackMailto();
  };

  ns.openFeedbackMailGmail = function openFeedbackMailGmail() {
    global.open(ns.buildFeedbackGmailUrl(), '_blank');
  };

  ns.submitFeedbackViaGAS = function submitFeedbackViaGAS() {
    var GAS_URL = 'https://script.google.com/macros/s/AKfycbzdy3iDrtieC8qcpkMejASM1y1tAMVA1LeXstAYC6bOCyCcVpYzlcgwqJzAXD2RaP-h/exec';

    var feedbackType = (document.getElementById('contactType') || {}).value || 'ご意見';
    var sender       = ((document.getElementById('contactSender') || {}).value || '').trim();
    var reply        = ((document.getElementById('contactReply')  || {}).value || '').trim();
    var body         = ((document.getElementById('contactBody')   || {}).value || '').trim();

    var statusEl  = document.getElementById('feedbackStatus');
    var submitBtn = document.getElementById('feedbackSubmitBtn');

    function setStatus(msg, type) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.style.display = 'block';
      var styles = {
        success: { background:'#f0fdf4', border:'1px solid #86efac', color:'#15803d' },
        error:   { background:'#fff1f2', border:'1px solid #fca5a5', color:'#b91c1c' },
        info:    { background:'#f8f8fc', border:'1px solid #e0e0ea', color:'#5a5a78' }
      }[type] || {};
      Object.assign(statusEl.style, styles);
    }

    if (!body) {
      setStatus('内容を入力してください。', 'error');
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '送信中...'; }
    setStatus('送信しています。しばらくお待ちください。', 'info');

    var message = '種別: ' + feedbackType + '\n送信者: ' + (sender || '（未記入）') + '\n返信先: ' + (reply || '（未記入）') + '\n\n' + body;
    var subject = '【' + feedbackType + '】TORIAI お問い合わせ';

    function onSuccess() {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '送信する →'; }
      setStatus('送信しました。ご意見ありがとうございます。', 'success');
      ['contactType','contactSender','contactReply','contactBody'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = (el.tagName === 'SELECT') ? el.options[0].value : '';
      });
    }

    function onError() {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '送信する →'; }
      setStatus('送信に失敗しました。接続状態をご確認ください。', 'error');
    }

    var payload = JSON.stringify({
      name: sender || '匿名',
      subject: subject,
      message: message
    });

    if (typeof fetch !== 'undefined') {
      var tid = setTimeout(function() { onError(); }, 15000);
      fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: payload
      }).then(function() {
        clearTimeout(tid);
        onSuccess();
      }).catch(function() {
        clearTimeout(tid);
        onError();
      });
      return;
    }

    var callbackName = '__foContactCb_' + Date.now();
    var cleanup = function() {
      try { delete global[callbackName]; } catch (_) {}
      var s = document.getElementById(callbackName);
      if (s && s.parentNode) s.parentNode.removeChild(s);
    };

    var timeout = setTimeout(function() {
      cleanup();
      onError();
    }, 12000);

    global[callbackName] = function(result) {
      clearTimeout(timeout);
      cleanup();
      if (!result || result.status !== 'ok') { onError(); return; }
      onSuccess();
    };

    var params = [
      'callback=' + encodeURIComponent(callbackName),
      'name='     + encodeURIComponent(sender || '匿名'),
      'subject='  + encodeURIComponent(subject),
      'message='  + encodeURIComponent(message)
    ];
    var script = document.createElement('script');
    script.id = callbackName;
    script.src = GAS_URL + '?' + params.join('&');
    script.onerror = function() { clearTimeout(timeout); cleanup(); onError(); };
    document.body.appendChild(script);
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
