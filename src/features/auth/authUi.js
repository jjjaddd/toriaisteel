// ============================================================
// toriai-auth-ui.js
// ログイン / 新規登録 / 事業所作成 / 招待 の画面
// window.Toriai.authUI として公開
//
// 使い方:
//   Toriai.authUI.openLogin();       // ログイン/サインアップモーダル
//   Toriai.authUI.openOrgCreate();   // 事業所作成
//   Toriai.authUI.openInvite(orgId); // 招待コード発行
//   Toriai.authUI.openMembers(orgId); // メンバー一覧
//   Toriai.authUI.openJoin();        // 招待コード入力
//   Toriai.authUI.mountSwitcher(el); // ヘッダーに事業所スイッチャーを取り付け
// ============================================================
(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  var doc = global.document;

  // ── 小ヘルパ ────────────────────────────────────────────
  function el(tag, attrs, children) {
    var n = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function(k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'style') n.setAttribute('style', attrs[k]);
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function(c) {
        if (c == null) return;
        n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
      });
    }
    return n;
  }

  function setText(node, text) { if (node) node.textContent = text == null ? '' : String(text); }

  function fmtErr(e) {
    if (!e) return 'エラーが発生しました';
    if (typeof e === 'string') return e;
    var m = e.message || '';
    // Supabase の英語メッセージをざっくり日本語化
    if (/Invalid login credentials/i.test(m)) return 'メールアドレスかパスワードが違います';
    if (/User already registered/i.test(m)) return 'このメールアドレスはすでに登録済みです';
    if (/Password should be/i.test(m)) return 'パスワードは6文字以上で設定してください';
    if (/Email rate limit/i.test(m)) return '送信回数が多すぎます。しばらく待ってから再度お試しください';
    if (/Email not confirmed/i.test(m)) return 'メールの確認がまだです。届いたリンクをクリックしてください';
    return m || 'エラーが発生しました';
  }

  // ── モーダル基盤 ────────────────────────────────────────
  function openModal(builder, opts) {
    // 既存モーダルがあれば閉じる
    closeModal();
    var overlay = el('div', { class: 'tauth-overlay' });
    var modal = el('div', { class: 'tauth-modal' + (opts && opts.wide ? ' is-wide' : '') });
    var close = el('button', { class: 'tauth-close', 'aria-label': '閉じる', html: '&times;' });
    close.addEventListener('click', closeModal);
    modal.appendChild(close);
    overlay.appendChild(modal);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay && !(opts && opts.forceOpen)) closeModal();
    });
    doc.body.appendChild(overlay);
    try { builder(modal, overlay); } catch(e) { console.error('[authUI] builder error', e); }
    return { overlay: overlay, modal: modal };
  }
  function closeModal() {
    var olds = doc.querySelectorAll('.tauth-overlay');
    olds.forEach(function(o) { o.parentNode && o.parentNode.removeChild(o); });
  }

  // ── ログイン / サインアップ ─────────────────────────────
  function openLogin(opts) {
    opts = opts || {};
    openModal(function(modal) {
      var mode = 'signin'; // 'signin' | 'signup' | 'reset'
      var title = el('h2', { class: 'tauth-title' }, 'TORIAI にログイン');
      var sub = el('p', { class: 'tauth-sub' }, '業務データは事業所単位で共有されます');

      var tabs = el('div', { class: 'tauth-tabs' }, [
        el('button', { class: 'tauth-tab is-on', 'data-mode': 'signin' }, 'ログイン'),
        el('button', { class: 'tauth-tab', 'data-mode': 'signup' }, '新規登録')
      ]);

      var errBox = el('div', { class: 'tauth-err' });
      var okBox = el('div', { class: 'tauth-ok' });

      var nameField = el('div', { class: 'tauth-field', style: 'display:none' }, [
        el('label', { class: 'tauth-label' }, 'お名前'),
        el('input', { class: 'tauth-input', type: 'text', placeholder: '例：山田 太郎', autocomplete: 'name' })
      ]);
      var emailField = el('div', { class: 'tauth-field' }, [
        el('label', { class: 'tauth-label' }, 'メールアドレス'),
        el('input', { class: 'tauth-input', type: 'email', placeholder: 'you@example.com', autocomplete: 'email' })
      ]);
      var pwField = el('div', { class: 'tauth-field' }, [
        el('label', { class: 'tauth-label' }, 'パスワード'),
        el('input', { class: 'tauth-input', type: 'password', placeholder: '6文字以上', autocomplete: 'current-password' }),
        el('div', { class: 'tauth-hint' }, '6文字以上。英数字の組み合わせを推奨')
      ]);

      var submit = el('button', { class: 'tauth-btn is-primary' }, 'ログイン');
      var actions = el('div', { class: 'tauth-actions' }, [submit]);

      var forgot = el('button', { class: 'tauth-link' }, 'パスワードを忘れた');
      var footer = el('div', { class: 'tauth-footer' }, [forgot]);

      modal.appendChild(title);
      modal.appendChild(sub);
      modal.appendChild(tabs);
      modal.appendChild(errBox);
      modal.appendChild(okBox);
      modal.appendChild(nameField);
      modal.appendChild(emailField);
      modal.appendChild(pwField);
      modal.appendChild(actions);
      modal.appendChild(footer);

      function showErr(msg) { setText(errBox, msg); errBox.classList.add('is-on'); okBox.classList.remove('is-on'); }
      function showOk(msg) { setText(okBox, msg); okBox.classList.add('is-on'); errBox.classList.remove('is-on'); }
      function clearMsg() { errBox.classList.remove('is-on'); okBox.classList.remove('is-on'); }

      function setMode(m) {
        mode = m;
        clearMsg();
        Array.prototype.forEach.call(tabs.querySelectorAll('.tauth-tab'), function(t) {
          t.classList.toggle('is-on', t.getAttribute('data-mode') === m);
        });
        if (m === 'signin') {
          title.textContent = 'TORIAI にログイン';
          nameField.style.display = 'none';
          pwField.style.display = '';
          submit.textContent = 'ログイン';
          pwField.querySelector('input').setAttribute('autocomplete', 'current-password');
          tabs.style.display = '';
          footer.style.display = '';
        } else if (m === 'signup') {
          title.textContent = '新規アカウント登録';
          nameField.style.display = '';
          pwField.style.display = '';
          submit.textContent = 'アカウント作成';
          pwField.querySelector('input').setAttribute('autocomplete', 'new-password');
          tabs.style.display = '';
          footer.style.display = 'none';
        } else if (m === 'reset') {
          title.textContent = 'パスワード再設定';
          nameField.style.display = 'none';
          pwField.style.display = 'none';
          submit.textContent = '再設定メールを送る';
          tabs.style.display = 'none';
          footer.style.display = '';
        }
      }

      Array.prototype.forEach.call(tabs.querySelectorAll('.tauth-tab'), function(t) {
        t.addEventListener('click', function() { setMode(t.getAttribute('data-mode')); });
      });
      forgot.addEventListener('click', function() { setMode('reset'); });

      submit.addEventListener('click', function() {
        clearMsg();
        var email = emailField.querySelector('input').value.trim();
        var password = pwField.querySelector('input').value;
        var displayName = nameField.querySelector('input').value.trim();
        if (!email) return showErr('メールアドレスを入力してください');
        submit.disabled = true;
        var run;
        if (mode === 'signin') {
          if (!password) { submit.disabled = false; return showErr('パスワードを入力してください'); }
          run = ns.auth.signIn(email, password).then(function() {
            closeModal();
            if (opts.onSuccess) opts.onSuccess();
          });
        } else if (mode === 'signup') {
          if (!password || password.length < 6) { submit.disabled = false; return showErr('パスワードは6文字以上で設定してください'); }
          run = ns.auth.signUp(email, password, displayName).then(function(data) {
            // メール確認必須設定の場合は user はあるが session はない
            if (data && data.session) {
              closeModal();
              if (opts.onSuccess) opts.onSuccess();
            } else {
              showOk('確認メールを送信しました。メールのリンクを開いて登録を完了してください。');
            }
          });
        } else if (mode === 'reset') {
          run = ns.auth.resetPassword(email).then(function() {
            showOk('再設定メールを送信しました。メールのリンクからパスワードを設定してください。');
          });
        }
        run.catch(function(e) { showErr(fmtErr(e)); })
          .then(function() { submit.disabled = false; });
      });

      setMode(opts.mode || 'signin');
      setTimeout(function() { emailField.querySelector('input').focus(); }, 50);
    }, { forceOpen: opts.forceOpen });
  }

  // ── 事業所作成 ─────────────────────────────────────────
  function openOrgCreate(opts) {
    opts = opts || {};
    openModal(function(modal) {
      modal.appendChild(el('h2', { class: 'tauth-title' }, '事業所を作成'));
      modal.appendChild(el('p', { class: 'tauth-sub' }, '在庫・案件・材料をメンバー間で共有できる箱です'));

      var errBox = el('div', { class: 'tauth-err' });
      var field = el('div', { class: 'tauth-field' }, [
        el('label', { class: 'tauth-label' }, '事業所名'),
        el('input', { class: 'tauth-input', type: 'text', placeholder: '例：株式会社〇〇 東京営業所' }),
        el('div', { class: 'tauth-hint' }, 'あとから変更できます。事業所IDは自動で発行されます。')
      ]);

      var btn = el('button', { class: 'tauth-btn is-primary' }, '作成する');
      var cancel = el('button', { class: 'tauth-btn is-ghost' }, 'キャンセル');
      cancel.addEventListener('click', closeModal);

      modal.appendChild(errBox);
      modal.appendChild(field);
      modal.appendChild(el('div', { class: 'tauth-actions' }, [btn, cancel]));

      btn.addEventListener('click', function() {
        errBox.classList.remove('is-on');
        var name = field.querySelector('input').value.trim();
        if (!name) { setText(errBox, '事業所名を入力してください'); errBox.classList.add('is-on'); return; }
        btn.disabled = true;
        ns.org.createOrg(name).then(function(org) {
          ns.org.setActiveOrgId(org.id);
          closeModal();
          if (opts.onSuccess) opts.onSuccess(org);
        }).catch(function(e) {
          setText(errBox, fmtErr(e)); errBox.classList.add('is-on');
        }).then(function() { btn.disabled = false; });
      });

      setTimeout(function() { field.querySelector('input').focus(); }, 50);
    });
  }

  // ── 招待コード入力（参加する側） ────────────────────────
  function openJoin(opts) {
    opts = opts || {};
    openModal(function(modal) {
      modal.appendChild(el('h2', { class: 'tauth-title' }, '事業所に参加'));
      modal.appendChild(el('p', { class: 'tauth-sub' }, 'オーナーから受け取った6桁の招待コードを入力してください'));

      var errBox = el('div', { class: 'tauth-err' });
      var field = el('div', { class: 'tauth-field' }, [
        el('label', { class: 'tauth-label' }, '招待コード'),
        el('input', {
          class: 'tauth-input',
          type: 'text',
          placeholder: '000000',
          maxlength: '6',
          style: 'font-family:"Space Grotesk",monospace;letter-spacing:0.3em;text-align:center;font-size:18px;'
        })
      ]);
      var btn = el('button', { class: 'tauth-btn is-primary' }, '参加する');
      var cancel = el('button', { class: 'tauth-btn is-ghost' }, 'キャンセル');
      cancel.addEventListener('click', closeModal);

      modal.appendChild(errBox);
      modal.appendChild(field);
      modal.appendChild(el('div', { class: 'tauth-actions' }, [btn, cancel]));

      btn.addEventListener('click', function() {
        errBox.classList.remove('is-on');
        var code = field.querySelector('input').value.trim();
        if (!code || code.length < 4) { setText(errBox, '6桁のコードを入力してください'); errBox.classList.add('is-on'); return; }
        btn.disabled = true;
        ns.org.acceptInvitation(code).then(function(orgId) {
          if (orgId) ns.org.setActiveOrgId(orgId);
          closeModal();
          if (opts.onSuccess) opts.onSuccess(orgId);
        }).catch(function(e) {
          setText(errBox, fmtErr(e)); errBox.classList.add('is-on');
        }).then(function() { btn.disabled = false; });
      });

      setTimeout(function() { field.querySelector('input').focus(); }, 50);
    });
  }

  // ── 招待コード発行（オーナー側） ────────────────────────
  function openInvite(orgId) {
    openModal(function(modal) {
      modal.appendChild(el('h2', { class: 'tauth-title' }, '招待コードを発行'));
      modal.appendChild(el('p', { class: 'tauth-sub' }, 'コードを相手に伝えてください（有効期限：7日）'));

      var errBox = el('div', { class: 'tauth-err' });
      var emailField = el('div', { class: 'tauth-field' }, [
        el('label', { class: 'tauth-label' }, 'メールアドレス（任意）'),
        el('input', { class: 'tauth-input', type: 'email', placeholder: '特定の相手のみ使える招待にする場合' }),
        el('div', { class: 'tauth-hint' }, '空欄にすると、誰でもコードを入力すれば参加できます')
      ]);
      var genBtn = el('button', { class: 'tauth-btn is-primary' }, 'コードを発行');
      var codeArea = el('div', { style: 'display:none; margin-top:4px;' });
      var codeEl = el('div', { class: 'tinvite-code' }, '------');
      var metaEl = el('div', { class: 'tinvite-meta' }, '');
      var copyBtn = el('button', { class: 'tauth-btn is-ghost' }, 'コードをコピー');
      codeArea.appendChild(codeEl);
      codeArea.appendChild(metaEl);
      codeArea.appendChild(copyBtn);

      copyBtn.addEventListener('click', function() {
        try {
          navigator.clipboard.writeText(codeEl.textContent.trim());
          copyBtn.textContent = 'コピーしました';
          setTimeout(function() { copyBtn.textContent = 'コードをコピー'; }, 1500);
        } catch(e) {}
      });

      var closeBtn = el('button', { class: 'tauth-btn is-ghost' }, '閉じる');
      closeBtn.addEventListener('click', closeModal);

      modal.appendChild(errBox);
      modal.appendChild(emailField);
      modal.appendChild(el('div', { class: 'tauth-actions' }, [genBtn]));
      modal.appendChild(codeArea);
      modal.appendChild(el('div', { class: 'tauth-actions', style: 'margin-top:14px' }, [closeBtn]));

      genBtn.addEventListener('click', function() {
        errBox.classList.remove('is-on');
        var email = emailField.querySelector('input').value.trim();
        genBtn.disabled = true;
        ns.org.createInvitation(orgId, email || null).then(function(inv) {
          setText(codeEl, inv.code);
          var exp = inv.expires_at ? new Date(inv.expires_at) : null;
          setText(metaEl, '有効期限：' + (exp ? exp.toLocaleString('ja-JP') : '7日間'));
          codeArea.style.display = '';
        }).catch(function(e) {
          setText(errBox, fmtErr(e)); errBox.classList.add('is-on');
        }).then(function() { genBtn.disabled = false; });
      });
    });
  }

  // ── メンバー一覧パネル ──────────────────────────────────
  function openMembers(orgId) {
    openModal(function(modal) {
      modal.appendChild(el('h2', { class: 'tauth-title' }, 'メンバー'));
      var sub = el('p', { class: 'tauth-sub' }, '読み込み中…');
      modal.appendChild(sub);
      var list = el('div', { class: 'tmember-list' });
      modal.appendChild(list);

      var actions = el('div', { class: 'tauth-actions', style: 'margin-top:16px' }, [
        el('button', { class: 'tauth-btn is-accent', onclick: function() { openInvite(orgId); } }, '招待コードを発行'),
        el('button', { class: 'tauth-btn is-ghost', onclick: closeModal }, '閉じる')
      ]);
      modal.appendChild(actions);

      Promise.all([
        ns.org.listMembers(orgId),
        ns.auth.getUser()
      ]).then(function(results) {
        var members = results[0]; var me = results[1];
        setText(sub, members.length + ' 名が所属中');
        list.innerHTML = '';
        members.forEach(function(m) {
          var role = el('span', { class: 'tmember-role' + (m.role === 'owner' ? ' is-owner' : '') }, m.role === 'owner' ? 'オーナー' : 'メンバー');
          var info = el('div', {}, [
            el('div', { class: 'tmember-name' }, m.display_name || '(名前未設定)'),
            el('div', { class: 'tmember-email' }, m.email || '')
          ]);
          var right = el('div', { style: 'display:flex;align-items:center;gap:8px;' }, [role]);
          if (me && me.id !== m.user_id) {
            // 自分以外は削除ボタン（権限は RLS 側でチェック）
            var del = el('button', { class: 'tauth-btn is-danger', style: 'padding:4px 8px;font-size:11.5px;' }, '削除');
            del.addEventListener('click', function() {
              if (!confirm(m.display_name + ' を削除しますか？')) return;
              ns.org.removeMember(orgId, m.user_id).then(function() { openMembers(orgId); })
                .catch(function(e) { alert(fmtErr(e)); });
            });
            right.appendChild(del);
          }
          var row = el('div', { class: 'tmember-row' }, [info, right]);
          list.appendChild(row);
        });
      }).catch(function(e) {
        setText(sub, fmtErr(e));
      });
    }, { wide: true });
  }

  // ── ヘッダーの事業所スイッチャー ────────────────────────
  // container に取り付け、事業所切替と "作成/参加/メンバー" のメニューを出す
  function mountSwitcher(container) {
    if (!container) return;
    var btn = el('div', { class: 'torg-switcher' }, [
      el('span', { class: 'torg-dot' }),
      el('span', { class: 'torg-label' }, '読み込み中…'),
      el('span', { class: 'torg-caret' }, '▾')
    ]);
    container.innerHTML = '';
    container.appendChild(btn);

    var dropdown = null;

    function refresh() {
      var activeId = ns.org.getActiveOrgId();
      return ns.org.listMyOrgs().then(function(orgs) {
        var label = btn.querySelector('.torg-label');
        if (!orgs || !orgs.length) {
          setText(label, '事業所を作成');
          return { orgs: [], active: null };
        }
        var active = orgs.filter(function(o) { return o.org_id === activeId; })[0] || orgs[0];
        if (!activeId || activeId !== active.org_id) ns.org.setActiveOrgId(active.org_id);
        setText(label, active.name);
        return { orgs: orgs, active: active };
      }).catch(function() {
        setText(btn.querySelector('.torg-label'), 'オフライン');
        return { orgs: [], active: null };
      });
    }

    function closeDropdown() {
      if (dropdown && dropdown.parentNode) dropdown.parentNode.removeChild(dropdown);
      dropdown = null;
      doc.removeEventListener('click', onDocClick, true);
    }
    function onDocClick(e) {
      if (dropdown && !dropdown.contains(e.target) && !btn.contains(e.target)) closeDropdown();
    }

    function openDropdown() {
      closeDropdown();
      refresh().then(function(state) {
        dropdown = el('div', { class: 'torg-dropdown' });
        state.orgs.forEach(function(o) {
          var row = el('div', {
            class: 'torg-item' + (state.active && o.org_id === state.active.org_id ? ' is-active' : ''),
            onclick: function() {
              ns.org.setActiveOrgId(o.org_id);
              closeDropdown();
              refresh();
            }
          }, [
            el('span', {}, o.name),
            el('span', { class: 'torg-role' }, o.role === 'owner' ? 'オーナー' : 'メンバー')
          ]);
          dropdown.appendChild(row);
        });
        if (state.orgs.length) dropdown.appendChild(el('div', { class: 'torg-divider' }));
        dropdown.appendChild(el('div', {
          class: 'torg-action',
          onclick: function() { closeDropdown(); openOrgCreate({ onSuccess: refresh }); }
        }, ['＋ 事業所を作成']));
        dropdown.appendChild(el('div', {
          class: 'torg-action',
          onclick: function() { closeDropdown(); openJoin({ onSuccess: refresh }); }
        }, ['↪ 招待コードで参加']));
        if (state.active) {
          dropdown.appendChild(el('div', { class: 'torg-divider' }));
          dropdown.appendChild(el('div', {
            class: 'torg-item',
            onclick: function() { closeDropdown(); openMembers(state.active.org_id); }
          }, [el('span', {}, 'メンバー管理'), el('span', { class: 'torg-role' }, '→')]));
          if (state.active.role === 'owner') {
            dropdown.appendChild(el('div', {
              class: 'torg-item',
              onclick: function() { closeDropdown(); openInvite(state.active.org_id); }
            }, [el('span', {}, '招待コード発行'), el('span', { class: 'torg-role' }, '→')]));
          }
        }
        dropdown.appendChild(el('div', { class: 'torg-divider' }));
        dropdown.appendChild(el('div', {
          class: 'torg-item',
          onclick: function() {
            closeDropdown();
            ns.auth.signOut().then(function() {
              ns.org.setActiveOrgId(null);
              global.location.reload();
            });
          }
        }, [el('span', {}, 'ログアウト'), el('span', { class: 'torg-role' }, '→')]));

        // 位置を btn の真下に
        var rect = btn.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = (rect.bottom + 6) + 'px';
        dropdown.style.left = Math.max(8, rect.left) + 'px';
        doc.body.appendChild(dropdown);
        setTimeout(function() { doc.addEventListener('click', onDocClick, true); }, 0);
      });
    }

    btn.addEventListener('click', openDropdown);

    // 外から切替を見張る
    global.addEventListener('toriai:active-org-changed', refresh);

    refresh();
    return { refresh: refresh };
  }

  // ── ブート: ログイン状態チェック → 未ログインならモーダル ─
  function boot(opts) {
    opts = opts || {};
    return ns.auth.getSession().then(function(session) {
      if (!session) {
        if (opts.requireAuth !== false) openLogin({ forceOpen: true, onSuccess: opts.onSuccess });
        return { loggedIn: false };
      }
      return ns.org.listMyOrgs().then(function(orgs) {
        if (!orgs.length) {
          // 事業所未所属なら作成/参加を促す
          openFirstRun();
        }
        return { loggedIn: true, orgs: orgs };
      });
    });
  }

  // ── 初回画面（事業所未所属のユーザー向け） ──────────────
  function openFirstRun() {
    openModal(function(modal) {
      modal.appendChild(el('h2', { class: 'tauth-title' }, 'TORIAI へようこそ'));
      modal.appendChild(el('p', { class: 'tauth-sub' }, 'まずは事業所を作るか、招待コードで参加してください'));
      modal.appendChild(el('div', { class: 'tauth-actions', style: 'margin-top:12px' }, [
        el('button', { class: 'tauth-btn is-primary', onclick: function() { closeModal(); openOrgCreate(); } }, '事業所を作成する'),
        el('button', { class: 'tauth-btn is-ghost', onclick: function() { closeModal(); openJoin(); } }, '招待コードで参加する')
      ]));
    }, { forceOpen: true });
  }

  ns.authUI = {
    openLogin: openLogin,
    openOrgCreate: openOrgCreate,
    openJoin: openJoin,
    openInvite: openInvite,
    openMembers: openMembers,
    openFirstRun: openFirstRun,
    mountSwitcher: mountSwitcher,
    closeModal: closeModal,
    boot: boot
  };
})(window);
