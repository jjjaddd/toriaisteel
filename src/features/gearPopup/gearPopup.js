// 詳細設定（歯車）ポップアップ
// 取り合いタブ右下の歯車ボタンから開く設定モーダル。

function openGearPopup() {
  var bd = document.getElementById('gearPopBd');
  if (bd) bd.classList.add('show');
}

function closeGearPopup() {
  var bd = document.getElementById('gearPopBd');
  if (bd) bd.classList.remove('show');
}

// Esc キーでポップアップを閉じる
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var bd = document.getElementById('gearPopBd');
    if (bd && bd.classList.contains('show')) {
      closeGearPopup();
    }
  }
});
