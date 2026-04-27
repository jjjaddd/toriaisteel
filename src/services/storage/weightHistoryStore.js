// 重量計算結果の履歴保存（切断履歴と同じ LS_WORK_HIST に混在保存）

function saveWeightHistory(rows, opts, job) {
  if (!rows || !rows.length) return;
  var sumKg = 0, sumAmt = 0, anyPrice = false;
  rows.forEach(function(r) {
    sumKg += r.kgTotal;
    if (r.amount !== null) { sumAmt += r.amount; anyPrice = true; }
  });
  var entry = {
    id: Date.now(),
    type: 'weight',
    date: new Date().toISOString(),
    dateLabel: new Date().toLocaleDateString('ja-JP'),
    client: (job && job.client) || '',
    name:   (job && job.name)   || '',
    deadline: '',
    worker:   '',
    spec: rows.map(function(r){ return r.spec; })
              .filter(function(v,i,a){ return a.indexOf(v)===i; })
              .slice(0,3).join(' / '),
    kind: rows.map(function(r){ return r.kind; })
              .filter(function(v,i,a){ return a.indexOf(v)===i; })
              .slice(0,2).join(' / '),
    weight: {
      rows: JSON.parse(JSON.stringify(rows)),
      opts: JSON.parse(JSON.stringify(opts || {})),
      sumKg: sumKg,
      sumAmt: anyPrice ? sumAmt : null
    }
  };
  var hist = getCutHistory();
  hist.unshift(entry);
  var saved = false;
  while (!saved && hist.length > 0) {
    try {
      localStorage.setItem(LS_WORK_HIST, JSON.stringify(hist));
      if (typeof sbUpsert === 'function') sbUpsert('weight_history', hist);
      saved = true;
    } catch(e) {
      hist = hist.slice(0, Math.floor(hist.length * 0.7));
    }
  }
  return entry;
}
