const fs = require('fs');
const path = require('path');
const vm = require('vm');

jest.setTimeout(180000);

const PROJECT_ROOT = path.join(__dirname, '..');

function createSandbox() {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    alert: function() {},
    totalRows: 0,
    curKind: 'H形鋼',
    historyPage: 1,
    invPage: 1,
    dataPage: 1,
    PIECE_COLORS: ['p0', 'p1', 'p2', 'p3'],
    atob: function(s) { return Buffer.from(s, 'base64').toString('binary'); },
    Blob: function(parts, opts) { this.parts = parts; this.opts = opts; },
    URL: { createObjectURL: function() { return ''; }, revokeObjectURL: function() {} },
    Worker: function() {},
    self: null,
    window: null,
    navigator: {},
    performance: { now: function() { return Date.now(); } },
    location: { reload: function() {} },
    confirm: function() { return true; },
    prompt: function() { return ''; },
    localStorage: {
      _store: {},
      getItem: function(k) { return Object.prototype.hasOwnProperty.call(this._store, k) ? this._store[k] : null; },
      setItem: function(k, v) { this._store[k] = String(v); },
      removeItem: function(k) { delete this._store[k]; }
    },
    document: {
      addEventListener: function() {},
      createElement: function() { return { style: {}, appendChild: function() {}, setAttribute: function() {} }; },
      getElementById: function() {
        return {
          value: '',
          checked: false,
          innerHTML: '',
          textContent: '',
          style: {},
          appendChild: function() {},
          setAttribute: function() {}
        };
      }
    },
    getJobInfo: function() { return {}; },
    getSelectedInventoryRemnantDetails: function() { return []; },
    autoSyncResultRemnants: function() {},
    render: function() {},
    savePiecesHistory: function() {},
    saveSettings: function() {},
    hideCalcLoadingOverlay: function() {},
    showCalcLoadingOverlay: function() {}
  };
  sandbox._elements = {};
  sandbox.document._elements = sandbox._elements;
  sandbox.document.getElementById = function(id) {
    return this._elements[id] || {
      style: {},
      value: '',
      innerHTML: '',
      textContent: '',
      appendChild: function() {},
      setAttribute: function() {}
    };
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  return sandbox;
}

function loadScriptIntoSandbox(filename, sandbox) {
  const code = fs.readFileSync(path.join(PROJECT_ROOT, filename), 'utf8');
  vm.runInContext(code, sandbox, { filename });
}

function loadStorageScripts(sandbox) {
  loadScriptIntoSandbox('src/storage/keys.js', sandbox);
  loadScriptIntoSandbox('src/storage/local-store.js', sandbox);
  loadScriptIntoSandbox('src/storage/repositories.js', sandbox);
}

function loadCalculationScripts(sandbox) {
  [
    'src/core/toriai-namespace.js',
    'src/utils/validation.js',
    'src/storage/keys.js',
    'src/storage/local-store.js',
    'src/storage/repositories.js',
    'src/data/steel/registry.js',
    'src/data/steel/hBeam/specs.js',
    'src/data/steel/hBeam/stockLengths.js',
    'src/data/steel/hBeam/specStockLengths.js',
    'src/data/steel/equalAngle/specs.js',
    'src/data/steel/equalAngle/stockLengths.js',
    'src/data/steel/unequalAngle/specs.js',
    'src/data/steel/unequalAngle/stockLengths.js',
    'src/data/steel/unequalUnequalAngle/specs.js',
    'src/data/steel/unequalUnequalAngle/stockLengths.js',
    'src/data/steel/channel/specs.js',
    'src/data/steel/channel/stockLengths.js',
    'src/data/steel/cShape/specs.js',
    'src/data/steel/cShape/stockLengths.js',
    'src/data/steel/lightChannel/specs.js',
    'src/data/steel/lightChannel/stockLengths.js',
    'src/data/steel/flatBar/specs.js',
    'src/data/steel/flatBar/stockLengths.js',
    'src/data/steel/iBeam/specs.js',
    'src/data/steel/iBeam/stockLengths.js',
    'src/data/steel/roundBar/specs.js',
    'src/data/steel/roundBar/stockLengths.js',
    'src/data/steel/squareBar/specs.js',
    'src/data/steel/squareBar/stockLengths.js',
    'src/data/steel/pipe/specs.js',
    'src/data/steel/pipe/stockLengths.js',
    'src/data/steel/squarePipe/specs.js',
    'src/data/steel/squarePipe/stockLengths.js',
    'src/data/steel/smallSquarePipe/specs.js',
    'src/data/steel/smallSquarePipe/stockLengths.js',
    'src/data/steel/bcr295/specs.js',
    'src/data/steel/bcr295/stockLengths.js',
    'src/data/steel/stockHelpers.js',
    'src/ui/calc/resultMeta.js',
    'src/ui/calc/inputState.js',
    'src/ui/calc/executionFlow.js',
    'src/calculation/yield/barMetrics.js',
    'src/calculation/yield/workerClient.js',
    'src/calculation/yield/patternPacking.js',
    'src/calculation/yield/repeatPlans.js',
    'src/calculation/yield/bundlePlan.js',
    'src/calculation/yield/calcCore.js'
  ].forEach(function(filename) {
    loadScriptIntoSandbox(filename, sandbox);
  });
  loadScriptIntoSandbox('src/calculation/orchestration.js', sandbox);
  loadScriptIntoSandbox('src/calculation/section/paintArea.js', sandbox);
  loadScriptIntoSandbox('src/data/sectionDefinitions.js', sandbox);
  [
    'src/features/dataTab/sectionSvg.js',
    'src/features/dataTab/state.js',
    'src/features/dataTab/init.js',
    'src/features/dataTab/kindSidebar.js',
    'src/features/dataTab/specPicker.js',
    'src/features/dataTab/renderSpec.js',
    'src/features/dataTab/stdLengths.js',
    'src/features/dataTab/notes.js',
  ].forEach(function(filename) {
    loadScriptIntoSandbox(filename, sandbox);
  });
}

function makePieces(types, countPerType) {
  const pieces = [];
  for (let i = 0; i < types; i += 1) {
    const length = 1000 + i * 200;
    for (let j = 0; j < countPerType; j += 1) {
      pieces.push(length);
    }
  }
  return pieces;
}

function makeHistoryItem(id, overrides) {
  return Object.assign({
    id: id,
    type: 'cut',
    date: '2026-04-26',
    dateLabel: '2026-04-26',
    client: 'Client ' + id,
    name: 'Job ' + id,
    spec: 'FB-6×50',
    kind: '平鋼',
    result: {
      selectedBars: [{ sl: 12000, pat: [6000, 3000], loss: 1200 }],
      remnants: [{ len: 1200, qty: 2 }],
      endLoss: 75
    }
  }, overrides || {});
}

function initHistoryUiSandbox(sandbox) {
  sandbox.historyPage = 1;
  sandbox.HISTORY_PAGE_SIZE = 10;
  sandbox._histTypeFilter = 'all';
  sandbox._histView = 'list';
  sandbox._chipDateFrom = '';
  sandbox._chipDateTo = '';
  sandbox._elements.histList = { style: {}, innerHTML: '', textContent: '' };
  sandbox._elements.histEmpty = { style: { display: 'none' }, innerHTML: '', textContent: '' };
  sandbox._elements.hiCountLabel = { style: {}, innerHTML: '', textContent: '' };
  sandbox._elements.histPagination = { style: {}, innerHTML: '', textContent: '' };
  sandbox.paginateItems = function(items, page, size) {
    var total = items.length;
    var totalPages = Math.max(1, Math.ceil(total / size));
    var p = Math.min(Math.max(1, page || 1), totalPages);
    var start = (p - 1) * size;
    return { items: items.slice(start, start + size), page: p, totalPages: totalPages, total: total };
  };
  sandbox.renderPager = function(targetId, page, totalPages, onChangeName) {
    sandbox._lastPager = { targetId: targetId, page: page, totalPages: totalPages, onChangeName: onChangeName };
    if (sandbox._elements[targetId]) {
      sandbox._elements[targetId].innerHTML = page + ' / ' + totalPages;
    }
  };
  sandbox.escapeHtml = function(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  sandbox.normDateStr = function(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d)) return '';
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  };
  sandbox.parseDateValue = function(dateValue) {
    return new Date(dateValue).getTime() || 0;
  };
  sandbox._histItems = [];
  sandbox.getCutHistory = function() { return sandbox._histItems; };
}

describe('stress tests', () => {
  test('storage handles 10000 inventory records and 6000 history items', () => {
    const sandbox = createSandbox();
    vm.createContext(sandbox);
    loadStorageScripts(sandbox);

    const inventoryRepo = sandbox.window.Toriai.storage.repositories.inventory;
    const historyRepo = sandbox.window.Toriai.storage.repositories.cutHistory;

    const inventoryItems = Array.from({ length: 10000 }, (_, idx) => ({ id: idx + 1, name: 'item-' + (idx + 1), qty: (idx % 50) + 1 }));
    const historyItems = Array.from({ length: 6000 }, (_, idx) => ({ timestamp: idx, action: 'cut', value: idx * 3 }));

    expect(inventoryRepo.save(inventoryItems)).toBe(true);
    expect(inventoryRepo.load().length).toBe(10000);
    expect(historyRepo.save(historyItems)).toBe(true);
    expect(historyRepo.load().length).toBe(6000);
    expect(inventoryRepo.clear()).toBe(true);
    expect(historyRepo.clear()).toBe(true);
    expect(inventoryRepo.load().length).toBe(0);
    expect(historyRepo.load().length).toBe(0);
  });

  test('yield pack handles 120 pieces with 10 distinct lengths in under 15 seconds', () => {
    const sandbox = createSandbox();
    vm.createContext(sandbox);
    loadCalculationScripts(sandbox);

    const pieces = makePieces(10, 12);
    const start = Date.now();
    const result = sandbox.window.Toriai.calculation.yield.pack(pieces, 8000, 3);
    const elapsed = Date.now() - start;

    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(15000);
  });

  test('calcCore handles 80 pieces and returns valid plan structures', () => {
    const sandbox = createSandbox();
    vm.createContext(sandbox);
    loadCalculationScripts(sandbox);

    const pieces = makePieces(8, 10);
    const stocks = [{ sl: 12000, max: Infinity }, { sl: 9000, max: Infinity }, { sl: 6000, max: Infinity }];
    const output = sandbox.window.Toriai.calculation.yield.calcCore({
      pieces: pieces,
      stocks: stocks,
      blade: 3,
      endLoss: 75,
      kgm: 31.1,
      kind: 'H形鋼',
      spec: 'H-125×125×6×9'
    });

    expect(Array.isArray(output.single)).toBe(true);
    expect(Array.isArray(output.chgPlans)).toBe(true);
    expect(Array.isArray(output.allDP)).toBe(true);
    expect(output.calcPieces.length).toBeGreaterThanOrEqual(0);
    expect(output.origPieces.length).toBe(pieces.length);
  });

  test('renderHistory paginates 300 history items and builds the first page', () => {
    const sandbox = createSandbox();
    vm.createContext(sandbox);
    initHistoryUiSandbox(sandbox);
    loadScriptIntoSandbox('src/core/toriai-namespace.js', sandbox);
    loadScriptIntoSandbox('src/ui/history/renderHistory.js', sandbox);
    sandbox.renderHistory = sandbox.Toriai.ui.history.renderHistory;

    sandbox._histItems = Array.from({ length: 300 }, (_, idx) => makeHistoryItem(idx + 1));
    sandbox.historyPage = 1;
    sandbox.renderHistory();

    expect(sandbox._elements.histList.innerHTML).toContain('onclick="showHistPreview(');
    expect(sandbox._lastPager).toBeDefined();
    expect(sandbox._lastPager.totalPages).toBe(30);
    expect(sandbox._elements.hiCountLabel.textContent).toBe('300件');
  });

  test('showHistPreview displays preview content for a selected history item', () => {
    const sandbox = createSandbox();
    vm.createContext(sandbox);
    sandbox._elements.histPreviewModal = { style: {}, innerHTML: '' };
    sandbox._elements.histPreviewBody = { style: {}, innerHTML: '' };
    sandbox.getCutHistory = function() {
      return [makeHistoryItem(501)];
    };
    sandbox.buildPrintPages = function(job, sections) {
      return 'PREVIEW ' + (sections[0] ? sections[0].spec : 'NONE');
    };
    sandbox.buildPrintBarHtml = function() { return '<div>BAR</div>'; };
    sandbox.buildCardSelectionPayload = function() { return null; };
    sandbox.getHistoryBarsForPrint = function(result) { return result.selectedBars || []; };
    sandbox.sortStockLengthsForDisplay = function(lengths) { return (lengths || []).slice().sort(function(a, b) { return b - a; }); };
    loadScriptIntoSandbox('src/core/toriai-namespace.js', sandbox);
    loadScriptIntoSandbox('src/ui/history/preview.js', sandbox);
    sandbox.showHistPreview = sandbox.Toriai.ui.history.showHistPreview;

    sandbox.showHistPreview(501);

    expect(sandbox._elements.histPreviewBody.innerHTML).toContain('PREVIEW');
    expect(sandbox._elements.histPreviewModal.style.display).toBe('flex');
  });

  test('yield pack handles 1000 pieces with 30 distinct lengths in under 60 seconds', () => {
    const sandbox = createSandbox();
    vm.createContext(sandbox);
    loadCalculationScripts(sandbox);

    const pieces = makePieces(30, 34);
    const start = Date.now();
    const result = sandbox.window.Toriai.calculation.yield.pack(pieces, 12000, 3);
    const elapsed = Date.now() - start;

    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(60000);
  });

  test('yield pack handles 300 distinct lengths even if it takes longer', () => {
    const sandbox = createSandbox();
    vm.createContext(sandbox);
    loadCalculationScripts(sandbox);

    const pieces = makePieces(300, 3);
    const start = Date.now();
    const result = sandbox.window.Toriai.calculation.yield.pack(pieces, 12000, 3);
    const elapsed = Date.now() - start;

    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(180000);
    expect(result[0].pat.length).toBeGreaterThanOrEqual(1);
  });
});
