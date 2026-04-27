function buildPrintHeaderFull(job, pageInfo) {
  var h = '';
  h += '<div class="ph-full">';
  h += '<div>';
  h += '<div style="font-size:9px;color:#555;font-weight:700;letter-spacing:.06em;margin-bottom:4px">作業指示書</div>';
  h += '<div style="display:flex;gap:18px;align-items:baseline">';
  h += '<div><span style="font-size:9px;color:#666">顧客：</span><span style="font-size:12px;font-weight:700">' + (job.client || '—') + '</span></div>';
  h += '<div><span style="font-size:9px;color:#666">現場名：</span><span style="font-size:12px;font-weight:700">' + (job.name || '—') + '</span></div>';
  if (job.worker) h += '<div><span style="font-size:9px;color:#666">メモ：</span><span style="font-size:11px;font-weight:700">' + job.worker + '</span></div>';
  h += '</div></div>';
  h += '<div style="text-align:right"><div style="font-size:9px;color:#888">' + pageInfo + '</div>';
  if (job.deadline) h += '<div style="margin-top:3px"><span style="font-size:9px;color:#666">納期：</span><span style="font-size:10px;font-weight:700">' + job.deadline + '</span></div>';
  h += '</div></div>';
  return h;
}

function buildPrintHeaderMini(job, pageInfo) {
  var h = '';
  h += '<div class="ph-mini">';
  h += '<div><span style="font-size:9px;font-weight:700;letter-spacing:.04em">作業指示書</span>';
  h += '<span style="font-size:9px;color:#555;margin-left:12px">顧客：' + (job.client || '—') + ' / 現場名：' + (job.name || '—') + '</span></div>';
  h += '<div style="text-align:right"><div style="font-size:9px;color:#888">' + pageInfo + '</div>';
  if (job.deadline) h += '<div style="font-size:9px"><span style="color:#666">納期：</span><strong>' + job.deadline + '</strong></div>';
  h += '</div></div>';
  return h;
}
