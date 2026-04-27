// ── 鋼材選択 ──────────────────────────────────────────────────
function wOnKind() {
  var kindEl = document.getElementById('wKind');
  var specEl = document.getElementById('wSpec');
  if (!kindEl || !specEl) return;
  var specs = _wRowsByKind(kindEl.value);
  specEl.innerHTML = '';
  specs.forEach(function(item) {
    var opt = document.createElement('option');
    opt.value = item[0];
    opt.textContent = item[0];
    specEl.appendChild(opt);
  });
  wOnSpec();
}

function wOnSpec() {
  var kindEl   = document.getElementById('wKind');
  var specEl   = document.getElementById('wSpec');
  var kgmEl    = document.getElementById('wKgm');
  var kgmValEl = document.getElementById('wKgmVal');
  if (!kindEl || !specEl || !kgmEl) return;
  var list = _wRowsByKind(kindEl.value);
  var hit  = list.find(function(item) { return item[0] === specEl.value; });
  var kgm  = hit ? Number(hit[1]) : 0;
  kgmEl.value = kgm > 0 ? String(kgm) : '';
  if (kgmValEl) kgmValEl.textContent = kgm > 0 ? kgm + ' kg/m' : '';
  var cmdInput = document.getElementById('wCmdInput');
  var kgmDisp = document.getElementById('wCmdKgm');
  if (kgmDisp) kgmDisp.textContent = (cmdInput && (cmdInput.value || '').trim()) ? (kgm > 0 ? kgm + ' kg/m' : '') : '';
  wPreview();
}

// ── 塗装面積計算 ───────────────────────────────────────────────
function wGetPaintPerM(kind, specName) {
  var name = String(specName || '').trim().toUpperCase();
  var nums = (name.match(/[\d.]+/g) || []).map(parseFloat);
  if (!nums.length || nums.some(isNaN)) return 0;
  if (name.indexOf('H-')  === 0 && nums.length >= 2) return (2*nums[0] + 4*nums[1]) / 1000;
  if (name.indexOf('C-')  === 0 && nums.length >= 3) return (nums[0] + 4*nums[1] - 2*nums[2]) / 1000;
  if (name.indexOf('I-')  === 0 && nums.length >= 2) return (2*nums[0] + 4*nums[nums.length-1]) / 1000;
  if (name.indexOf('FB-') === 0 && nums.length >= 2) return (2*nums[0] + 2*nums[1]) / 1000;
  if (name.indexOf('RB-') === 0 && nums.length >= 1) return Math.PI * nums[0] / 1000;
  if (name.indexOf('L-')  === 0 && nums.length >= 3) {
    return nums[0] === nums[1]
      ? (4*nums[0] - 2*nums[2]) / 1000
      : (2*nums[0] + 2*nums[1] - 2*nums[2]) / 1000;
  }
  return 0;
}

// ── プレビュー ────────────────────────────────────────────────
function wPreview() {
  var kgmEl = document.getElementById('wKgm');
  var lenEl = document.getElementById('wLen');
  var qtyEl = document.getElementById('wQty');
  if (!kgmEl || !lenEl || !qtyEl) return;
  // （プレビュー表示：必要に応じて拡張可能）
}

function wSaveDocTitle() {
  var el = document.getElementById('wDocTitle');
  _wDocTitle = el ? String(el.value || '').trim() : '';
  if (_wStore && typeof _wStore.saveMeta === 'function') {
    _wStore.saveMeta({ jobName: _wJobName, jobClient: _wJobClient, docTitle: _wDocTitle });
  } else {
    try { localStorage.setItem('wDocTitle', _wDocTitle); } catch (e) {}
  }
  wRenderRows();
}

function wGetPrintTitle() {
  return _wDocTitle || '重量リスト';
}

