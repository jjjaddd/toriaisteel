// LocalStorage 全体のエクスポート / インポート（バックアップ用）

function exportAllData() {
  var keys = ['so_cut_hist_v2', 'so_inv_v2', 'so_settings', 'wSavedCalcs', 'wJobName', 'wJobClient'];
  var data = { _version: 2, _exported: new Date().toISOString() };
  keys.forEach(function(k) {
    var v = localStorage.getItem(k);
    if (v) { try { data[k] = JSON.parse(v); } catch(e) { data[k] = v; } }
  });
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'toriai_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importAllData() {
  if (!confirm('現在のデータを上書きしてよいですか？\nインポート後はページが再読み込みされます。')) return;
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = JSON.parse(ev.target.result);
        var keys = ['so_cut_hist_v2', 'so_inv_v2', 'so_settings', 'wSavedCalcs', 'wJobName', 'wJobClient'];
        keys.forEach(function(k) {
          if (data[k] !== undefined) {
            localStorage.setItem(k, JSON.stringify(data[k]));
          }
        });
        alert('インポート完了！ページを再読み込みします。');
        location.reload();
      } catch (err) {
        alert('読み込みエラー: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
