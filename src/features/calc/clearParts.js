function clearParts() {
  if (!confirm('リストをクリアしますか？\n設定もリセットされます。')) return;
  pushUndoManual();

  try { localStorage.removeItem(LS_SETTINGS); } catch(e) {}
  try { localStorage.removeItem(LS_REMNANTS); } catch(e) {}
  try { localStorage.removeItem(INVENTORY_REMNANT_SELECTED_KEY); } catch(e) {}

  var bladeEl = document.getElementById('blade');
  var endLossEl = document.getElementById('endloss');
  var minRemnantLenEl = document.getElementById('minRemnantLen');
  var jobClientEl = document.getElementById('jobClient');
  var jobNameEl = document.getElementById('jobName');
  var jobDeadlineEl = document.getElementById('jobDeadline');
  var jobWorkerEl = document.getElementById('jobWorker');
  var useKuikuEl = document.getElementById('useKuiku');
  var pasteAreaEl = document.getElementById('pasteArea');
  var pasteTextEl = document.getElementById('pasteText');
  var cmdInputEl = document.getElementById('cmdInput');
  var cmdKgmEl = document.getElementById('cmdKgm');

  if (bladeEl) bladeEl.value = '3';
  if (endLossEl) endLossEl.value = '150';
  if (minRemnantLenEl) minRemnantLenEl.value = '500';
  if (jobClientEl) jobClientEl.value = '';
  if (jobNameEl) jobNameEl.value = '';
  if (jobDeadlineEl) jobDeadlineEl.value = '';
  if (jobWorkerEl) jobWorkerEl.value = '';
  if (useKuikuEl) useKuikuEl.checked = false;
  toggleKuiku();
  if (pasteAreaEl) pasteAreaEl.classList.remove('show');
  if (pasteTextEl) pasteTextEl.value = '';
  if (cmdInputEl) cmdInputEl.value = '';
  if (cmdKgmEl) cmdKgmEl.textContent = '';

  for (var i = 0; i < totalRows; i++) {
    var lEl = document.getElementById('pl' + i);
    var qEl = document.getElementById('pq' + i);
    var zEl = document.getElementById('pz' + i);
    var kEl = document.getElementById('pk' + i);
    if (lEl) lEl.value = '';
    if (qEl) qEl.value = '';
    if (zEl) zEl.value = '';
    if (kEl) kEl.textContent = '—';
  }
  document.getElementById('totkg').textContent = '—';

  var firstKind = getAppSteelKinds()[0];
  var firstRow = firstKind ? getAppSteelRows(firstKind)[0] : null;
  if (firstKind && firstRow) {
    cmdSelect({ kind: firstKind, spec: firstRow[0], kgm: firstRow[1] });
    if (cmdInputEl) cmdInputEl.value = '';
    if (cmdKgmEl) cmdKgmEl.textContent = '';
  } else {
    updKg();
  }
  syncInventoryToRemnants();
  resetCalcResultPlaceholder();
}
