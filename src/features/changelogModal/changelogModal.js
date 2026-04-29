// 更新履歴モーダル
// 新しいバージョンを出すときは TORIAI_CHANGELOG 配列の先頭に追記するだけ。
// ユーザーに表示する更新履歴は最新バージョンのみ。
// date は YYYY-MM-DD、changes は 1 行 1 項目で短く。

var TORIAI_CHANGELOG = [
  {
    version: 'v1.0.5',
    date: '2026-04-30',
    changes: [
      'ハンバーガーメニューに「使い方」を追加し、note のガイドを外部サイト確認つきで開けるようにしました',
      '更新後の自動表示を、使い方オンボーディングから更新履歴に変更しました',
      '使い方オンボーディングの左右操作を、枠の左下・右下に表示される三角ボタンへ変更しました',
      'データタブの溝形鋼と平鋼の断面図を見やすく刷新しました',
      'CSS分割、保存層、断面性能 parser、フェーズ6までのリファクタリングを進めました'
    ]
  },
  {
    version: 'v1.0.4',
    date: '2026-04-24',
    changes: [
      '取り合いタブの工区列幅、13行表示、kg/m表示条件、初期プレースホルダー文言を調整',
      '重量計算タブに印刷タイトル機能を追加し、結果画面でも印刷タイトルを確認できるよう改善',
      'データタブの規格選択ホバー色を薄紫に統一し、断面性能カードの開閉表示を整理',
      'お問い合わせタブの見出し線とカード枠の見え方を調整し、タイトルまわりの表示崩れを修正'
    ]
  },
  {
    version: 'v1.0.3',
    date: '2026-04-24',
    changes: [
      '上部タブ導線を復旧し、取り合い・重量計算・データ・在庫・履歴・お問い合わせの表示崩れを整理',
      '在庫タブのサマリーカード、検索バー、追加ボタン、履歴タブの白カード表示などUIバランスを調整',
      '取り合いタブの作業情報バー、切断図ラベル、セット表示、リストクリア時の結果リセットを改善',
      'データタブの文字感と余白を整理し、断面性能を開閉式に変更'
    ]
  },
  {
    version: 'v1.0.2',
    date: '2026-04-21',
    changes: [
      '取り合い中心の使い方オンボーディングを追加し、更新後に全ユーザーへ自動表示',
      '鋼材種類・規格選択、長さ・数量入力、Ctrl+Enter 実行、最適母材数とカット候補の見方を案内',
      '重量計算・データ・履歴在庫タブの役割も簡易ガイドに追記'
    ]
  },
  {
    version: 'v1.0.1',
    date: '2026-04-21',
    changes: [
      '取り合いタブ 入力エリアを縦一列に刷新、詳細設定は右下の歯車ボタンからポップアップ表示',
      '部材リストのデフォルトを15行に拡張、01〜15のゼロパディング表示',
      '重量タブ 明細UIを刷新（ブレッドクラム・CSV出力／重量計算書ボタン・合計金額行）',
      '重量タブ 重量計算書の印刷時に未選択カラムを出力しないよう修正',
      '計算を実行する／＋リストに追加／メモ送信／お問い合わせ送信 ボタンをデフォルト黒・ホバー薄紫に統一'
    ]
  },
  {
    version: 'v1.0.0',
    date: '2026-04-19',
    changes: [
      '正式リリース',
      '残材消費時の計算バグ（母材重量・歩留まり・切断図の二重描画）を修正',
      'ダークモード・未実装機能（カーボンフットプリント計算／印刷時在庫登録しない／使い方ガイド）を整理',
      'ハンバーガーメニューからバージョンクリックで更新履歴を表示',
      '計算実行ボタンの文字化けを修正'
    ]
  }
];

var TORIAI_CHANGELOG_KEY = 'toriai_changelog_seen_version';
var TORIAI_CHANGELOG_VERSION = TORIAI_CHANGELOG[0] ? TORIAI_CHANGELOG[0].version + '-20260430' : '';

function hasSeenChangelog() {
  try {
    return (localStorage.getItem(TORIAI_CHANGELOG_KEY) || '') === TORIAI_CHANGELOG_VERSION;
  } catch (e) {
    return false;
  }
}

function markChangelogSeen() {
  try {
    localStorage.setItem(TORIAI_CHANGELOG_KEY, TORIAI_CHANGELOG_VERSION);
  } catch (e) {}
}

function renderChangelog() {
  var body = document.getElementById('changelogBody');
  if (!body) return;
  body.innerHTML = TORIAI_CHANGELOG.slice(0, 1).map(function(entry, idx) {
    var items = entry.changes.map(function(c){
      return '<li>' + escapeHtml(c) + '</li>';
    }).join('');
    return '<section class="changelog-entry' + (idx === 0 ? ' is-latest' : '') + '">' +
      '<div class="changelog-entry-head">' +
        '<span class="changelog-ver">' + escapeHtml(entry.version) + '</span>' +
        '<span class="changelog-date">' + escapeHtml(entry.date) + '</span>' +
      '</div>' +
      '<ul class="changelog-list">' + items + '</ul>' +
    '</section>';
  }).join('');
}

function openChangelog() {
  renderChangelog();
  var modal = document.getElementById('changelogModal');
  if (modal) modal.classList.add('show');
  markChangelogSeen();
  if (typeof closeHeaderMenu === 'function') closeHeaderMenu();
}

function closeChangelog() {
  var modal = document.getElementById('changelogModal');
  if (modal) modal.classList.remove('show');
}

function showChangelogIfNeeded() {
  if (hasSeenChangelog()) return;
  setTimeout(function() {
    openChangelog();
  }, 280);
}
