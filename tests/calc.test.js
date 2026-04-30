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

const PROJECT_ROOT = path.join(__dirname, '..');

function loadScriptIntoSandbox(filename, sandbox) {
  const code = fs.readFileSync(path.join(PROJECT_ROOT, filename), 'utf8');
  vm.runInContext(code, sandbox, { filename });
}

describe('calculation and stock helpers', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = createSandbox();
    vm.createContext(sandbox);
    [
      'src/core/toriai-namespace.js',
      'src/utils/validation.js',
      'src/storage/keys.js',
      'src/storage/local-store.js',
      'src/storage/repositories.js',
      'src/data/steel/registry.js',
      'src/data/steel/index.js',
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
    ].forEach(function(filename){
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
  });

  test('stock length helpers return expected default lengths', () => {
    const hStd = sandbox.getDefaultStockLengths('H形鋼', 'H-100×100×6×8');
    expect(Array.from(hStd)).toEqual([6000, 7000, 8000, 9000, 10000, 11000, 12000]);

    const flatStd = sandbox.getDefaultStockLengths('平鋼', 'FB-6×50');
    expect(Array.from(flatStd)).toEqual([5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000]);
  });

  test('steel spec search finds SGP and square pipe aliases', () => {
    const steel = sandbox.window.Toriai.data.steel;
    const all = steel.getCalcEnabledKinds().flatMap(function(kind) {
      return steel.getRowsByKind(kind).map(function(row) {
        return { kind: kind, spec: row[0], kgm: row[1] };
      });
    });
    const top = function(query) {
      return all
        .filter(function(item) { return steel.searchSpecMatches(query, item); })
        .sort(function(a, b) { return steel.compareSearchResults(query, a, b); })
        .slice(0, 10)
        .map(function(item) { return item.kind + ':' + item.spec; });
    };

    expect(top('25a')[0]).toBe('SGP配管:25A');
    expect(top('25A')[0]).toBe('SGP配管:25A');
    expect(top('100x100').some(function(hit) { return hit.indexOf('角パイプ:') === 0; })).toBe(true);
    expect(top('100×100').some(function(hit) { return hit.indexOf('角パイプ:') === 0; })).toBe(true);
    expect(top('10010023').some(function(hit) { return hit.indexOf('角パイプ:') === 0; })).toBe(true);
  });

  test('yield packing computes expected pattern and loss', () => {
    const yieldNs = sandbox.window.Toriai.calculation.yield;
    const packBars = yieldNs.pack([3000, 3000, 3000], 11925, 3);

    expect(packBars.length).toBe(1);
    expect(Array.from(packBars[0].pat)).toEqual([3000, 3000, 3000]);
    expect(packBars[0].loss).toBe(2919);
  });

  test('packWithRemnants returns remaining empty and one remnant bar', () => {
    const yieldNs = sandbox.window.Toriai.calculation.yield;
    const remnantResult = yieldNs.packWithRemnants([3000, 3000], [6500], [{ sl: 12000, max: Infinity }], 3, 75);

    expect(Array.from(remnantResult.remaining)).toEqual([]);
    expect(remnantResult.remnantBars.length).toBe(1);
    expect(remnantResult.remnantBars[0].loss).toBe(422);
  });

  test('calcChargeMin returns pricing plans with expected counts', () => {
    const yieldNs = sandbox.window.Toriai.calculation.yield;
    const chargePlans = yieldNs.calcChargeMin(
      [2000, 2000, 2000, 2000, 2000],
      [{ sl: 6000, max: Infinity }, { sl: 12000, max: Infinity }],
      3,
      75,
      31.1
    );

    expect(chargePlans.length).toBe(2);
    expect(chargePlans[0].sl).toBe(6000);
    expect(chargePlans[0].N).toBe(3);
    expect(chargePlans[0].chargeCount).toBe(3);
    expect(chargePlans[1].sl).toBe(12000);
    expect(chargePlans[1].chargeCount).toBe(6);
  });
});
