function escapeHistoryHtml(value) {
  if (typeof escapeHtml === 'function') return escapeHtml(value == null ? '' : String(value));
  return value == null ? '' : String(value).replace(/[&<>"']/g, function(ch) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
  });
}

function replaceDatalistOptions(datalist, values) {
  datalist.innerHTML = '';
  values.forEach(function(value) {
    var option = document.createElement('option');
    option.value = value;
    datalist.appendChild(option);
  });
}

function buildJobDatalist() {
  var hist = getCutHistory ? getCutHistory() : [];
  var clients = [], names = [];
  hist.forEach(function(h){
    if(h.client && clients.indexOf(h.client)<0) clients.push(h.client);
    if(h.name && names.indexOf(h.name)<0) names.push(h.name);
  });
  var clDl=document.getElementById('clientHistList');
  var nmDl=document.getElementById('nameHistList');
  if(clDl) replaceDatalistOptions(clDl, clients);
  if(nmDl) replaceDatalistOptions(nmDl, names);
}

function buildHistSpecDropdown() {
  var sel = document.getElementById('hsSt');
  if (!sel) return;
  sel.innerHTML = '<option value="">すべて</option>';
}

function historyHasKind(h, kind) {
  if (!kind || !h) return true;
  if (h.kind === kind) return true;
  if (h.project) {
    if (typeof h.project.kind === 'string' && h.project.kind.split('/').map(function(v){ return v.trim(); }).indexOf(kind) >= 0) {
      return true;
    }
    if (Array.isArray(h.project.sections)) {
      return h.project.sections.some(function(section) {
        return section && section.kind === kind;
      });
    }
  }
  return false;
}

// alias
function renderInventory() { renderInventoryPage(); }

// ── 履歴ページ描画 ──
var HIST_CARD_INLINE_STYLE = 'background:#ffffff;border:1px solid #d9dde6;border-radius:18px;padding:20px 18px;box-shadow:0 12px 28px rgba(17,17,17,.08);margin:0;';
var HIST_GROUP_INLINE_STYLE = 'background:#ffffff;border:1px solid #d9dde6;border-radius:18px;box-shadow:0 12px 28px rgba(17,17,17,.08);overflow:hidden;margin:0;';

function _renderHistRow(h) {
  var histId = Number(h.id) || 0;
  var client = escapeHistoryHtml(h.client || '顧客未設定');
  var name = escapeHistoryHtml(h.name || '');
  var deadline = escapeHistoryHtml(h.deadline || '-');
  var dateLabel = escapeHistoryHtml(h.dateLabel || '');
  var isWeight = h.type === 'weight';
  if (isWeight) {
    var w = h.weight || {};
    var kgStr = w.sumKg ? (Math.round(w.sumKg * 10) / 10).toLocaleString() + ' kg' : '—';
    var amtStr = w.sumAmt != null ? '概算 ' + Math.round(w.sumAmt).toLocaleString() + ' 円' : '';
    var rowCount = (w.rows || []).length;
    return '<div class="hist2-card hist2-card--weight" style="' + HIST_CARD_INLINE_STYLE + '" onclick="recallWeightHistory(' + histId + ')">' +
      '<div class="hist2-main">' +
        '<div class="hist2-head">' +
          '<span class="hist2-type hist2-type--weight">重量計算</span>' +
          '<div class="hist2-title-group">' +
            '<span class="hist2-client">' + client + '</span>' +
            (name ? '<span class="hist2-name">' + name + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="hist2-meta">' +
          '<span class="hist2-chip">' + rowCount + '行</span>' +
          '<span class="hist2-chip hist2-chip--strong">' + kgStr + '</span>' +
          (amtStr ? '<span class="hist2-chip">' + amtStr + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="hist2-side">' +
        '<span class="hist2-date">' + dateLabel + '</span>' +
        '<button class="hist2-del" onclick="event.stopPropagation();deleteCutHistory(' + histId + ')">削除</button>' +
      '</div>' +
    '</div>';
  }
  if (h.type === 'cut_project' && h.project) {
    var sectionCount = (h.project.sections || []).length;
    return '<div class="hist2-card" style="' + HIST_CARD_INLINE_STYLE + '" onclick="showHistPreview(' + histId + ')">' +
      '<div class="hist2-main">' +
        '<div class="hist2-head">' +
          '<span class="hist2-type hist2-type--cut">作業指示</span>' +
          '<div class="hist2-title-group">' +
            '<span class="hist2-client">' + client + '</span>' +
            (name ? '<span class="hist2-name">' + name + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="hist2-meta">' +
          '<span class="hist2-chip">鋼材: ' + sectionCount + '件</span>' +
          '<span class="hist2-chip">納期: ' + deadline + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="hist2-side">' +
        '<span class="hist2-date">' + dateLabel + '</span>' +
        '<button class="hist2-del" onclick="event.stopPropagation();deleteCutHistory(' + histId + ')">削除</button>' +
      '</div>' +
    '</div>';
  }
  var remCount = h.result && h.result.remnants ? h.result.remnants.length : 0;
  return '<div class="hist2-card" style="' + HIST_CARD_INLINE_STYLE + '" onclick="showHistPreview(' + histId + ')">' +
    '<div class="hist2-main">' +
        '<div class="hist2-head">' +
          '<span class="hist2-type hist2-type--cut">取り合い</span>' +
          '<div class="hist2-title-group">' +
            '<span class="hist2-client">' + client + '</span>' +
            (name ? '<span class="hist2-name">' + name + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="hist2-meta">' +
        '<span class="hist2-chip">納期: ' + deadline + '</span>' +
        '<span class="hist2-chip">端材: ' + remCount + '本</span>' +
      '</div>' +
    '</div>' +
    '<div class="hist2-side">' +
      '<span class="hist2-date">' + dateLabel + '</span>' +
      '<button class="hist2-del" onclick="event.stopPropagation();deleteCutHistory(' + histId + ')">削除</button>' +
    '</div>' +
  '</div>';
}

// 保存データから切断図を生成（DOM非依存版）

function printHistoryPreview() {
  var body = document.getElementById('histPreviewBody');
  if (!body) return;
  openPrintWindow(body.innerHTML);
}

function deleteCutHistory(id) {
  if (!confirm('この履歴を削除しますか？')) return;
  var hist = getCutHistory().filter(function(h){ return h.id!==id; });
  if (typeof saveCutHistoryList === 'function') saveCutHistoryList(hist);
  renderHistory();
}
