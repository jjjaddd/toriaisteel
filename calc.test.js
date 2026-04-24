const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
    performance: { now: function() { return 0; } },
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
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  return sandbox;
}

function loadScriptIntoSandbox(filename, sandbox) {
  const code = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  vm.runInContext(code, sandbox, { filename });
}

function runTests() {
  const sandbox = createSandbox();
  vm.createContext(sandbox);
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
    'src/data/steel/flatBar/stockLengths.js',
    'src/data/steel/channel/stockLengths.js',
    'src/data/steel/cShape/stockLengths.js',
    'src/data/steel/lightChannel/stockLengths.js',
    'src/data/steel/iBeam/stockLengths.js',
    'src/data/steel/roundBar/stockLengths.js',
    'src/data/steel/squareBar/stockLengths.js',
    'src/data/steel/squarePipe/stockLengths.js',
    'src/data/steel/smallSquarePipe/stockLengths.js',
    'src/data/steel/bcr295/stockLengths.js',
    'src/data/steel/pipe/stockLengths.js'
  ].forEach(function(filename){
    loadScriptIntoSandbox(filename, sandbox);
  });
  loadScriptIntoSandbox('calc.js', sandbox);
  loadScriptIntoSandbox('data.js', sandbox);

  const hStd = sandbox.getDefaultStockLengths('H形鋼', 'H-100×100×6×8');
  assert.deepStrictEqual(
    Array.from(hStd),
    [6000, 7000, 8000, 9000, 10000, 11000, 12000],
    'H形鋼の標準定尺は 5500mm を除外する'
  );

  const flatStd = sandbox.getDefaultStockLengths('平鋼', 'FB-6×50');
  assert.deepStrictEqual(
    Array.from(flatStd),
    [5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000],
    '共通定尺は 5500-12000mm を返す'
  );

  const packBars = sandbox.pack([3000, 3000, 3000], 11925, 3);
  assert.strictEqual(packBars.length, 1, '3000mm×3 は 1 本に収まる');
  assert.deepStrictEqual(Array.from(packBars[0].pat), [3000, 3000, 3000], '切断パターンが一致する');
  assert.strictEqual(packBars[0].loss, 2919, 'ロス長が一致する');

  const remnantResult = sandbox.packWithRemnants([3000, 3000], [6500], [{ sl: 12000, max: Infinity }], 3, 75);
  assert.deepStrictEqual(Array.from(remnantResult.remaining), [], '残材利用後に未割付部材が残らない');
  assert.strictEqual(remnantResult.remnantBars.length, 1, '残材バーが 1 本生成される');
  assert.strictEqual(remnantResult.remnantBars[0].loss, 422, '残材利用時のロス長が一致する');

  const chargePlans = sandbox.calcChargeMin(
    [2000, 2000, 2000, 2000, 2000],
    [{ sl: 6000, max: Infinity }, { sl: 12000, max: Infinity }],
    3,
    75,
    31.1
  );
  assert.strictEqual(chargePlans.length, 2, '従量課金プランが 2 案出る');
  assert.strictEqual(chargePlans[0].sl, 6000, '第1案は 6000mm 材');
  assert.strictEqual(chargePlans[0].N, 3, '第1案の必要本数が一致する');
  assert.strictEqual(chargePlans[0].chargeCount, 3, '第1案の課金回数が一致する');
  assert.strictEqual(chargePlans[1].sl, 12000, '第2案は 12000mm 材');
  assert.strictEqual(chargePlans[1].chargeCount, 6, '第2案の課金回数が一致する');

  console.log('calc.test.js: 5 cases passed');
}

runTests();
