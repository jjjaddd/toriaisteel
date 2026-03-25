const fs = require('fs');
const vm = require('vm');

function createLocalStorage() {
  const store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    key(index) {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    }
  };
}

const elements = {
  blade: { value: '3' },
  endloss: { value: '150' },
  minRemnantLen: { value: '500' },
  spec: { value: 'H-100x100x6x8' },
  jobClient: { value: 'Test Client' },
  jobName: { value: 'Test Job' },
  jobDeadline: { value: '2026-03-25' },
  jobWorker: { value: 'Test Memo' }
};

global.window = global;
global.localStorage = createLocalStorage();
global.document = {
  readyState: 'complete',
  body: { appendChild() {} },
  getElementById(id) {
    return elements[id] || null;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
  addEventListener() {},
  createElement() {
    return {
      style: {},
      innerHTML: '',
      querySelector() { return null; },
      querySelectorAll() { return []; },
      appendChild() {},
      remove() {}
    };
  }
};

global.navigator = {};
global.alert = function() {};
global.curKind = 'H';
global.totalRows = 0;
global.remnantCount = 0;
global.LS_CUT_HIST = 'so_cut_history';
global.LS_INVENTORY = 'so_inventory';
global.LS_INV_PREFIX = 'so_inv_';
global.syncInventoryToRemnants = function() {};
global.renderInventoryPage = function() {};
global.updateInvDropdown = function() {};
global.renderInventory = function() {};
global.getCurrentKind = function() { return global.curKind; };
global.isStdStockLength = function(len) {
  return [5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000].indexOf(Number(len)) >= 0;
};
global.sortStockLengthsForDisplay = function(lengths) {
  return lengths.slice().sort(function(a, b) { return Number(b) - Number(a); });
};
global.buildPrintBarHtml = function(bars, sl) {
  return 'BAR:' + sl + ':' + (bars || []).length;
};
global.buildPrintPages = function(job, sections) {
  return JSON.stringify({ job: job, sections: sections });
};
global.openPrintWindow = function() {};
global.closeCartModal = function() {};
global.clearCart = function() {};
global.updateCartBadge = function() {};

vm.runInThisContext(fs.readFileSync('storage.js', 'utf8'), { filename: 'storage.js' });
vm.runInThisContext(fs.readFileSync('final-overrides.js', 'utf8'), { filename: 'final-overrides.js' });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function resetState() {
  localStorage.clear();
  global._lastCalcResult = null;
  global._lastPrintedCardId = '';
  global._lastPrintedRemnantSignature = '';
  global._lastConsumedInventorySignature = '';
}

function test(name, fn) {
  resetState();
  fn();
  console.log('PASS', name);
}

function sampleMeta(extra) {
  return Object.assign({
    spec: 'H-100x100x6x8',
    kind: 'H',
    minRemnantLen: 500,
    blade: 3,
    endLoss: 150,
    selectedInventoryRemnants: []
  }, extra || {});
}

test('yield payload uses yield bars before bA fallback', function() {
  const result = {
    allDP: [{
      slA: 9000,
      bars: [{ pat: [1600, 600], loss: 29, sl: 9000 }],
      bA: [{ pat: [1], loss: 999, sl: 1 }],
      bB: []
    }],
    meta: sampleMeta()
  };
  const payload = buildCardSelectionPayload(result, 'card_yield_0');
  assert(payload.selectedBars.length === 1, 'expected one yield bar');
  assert(payload.selectedBars[0].sl === 9000, 'expected yield bar sl 9000');
  assert(payload.selectedBars[0].loss === 29, 'expected yield bar loss 29');
});

test('yield payload prepends remnant bars when yield bars are standard stock only', function() {
  const result = {
    allDP: [{
      slA: 9000,
      bars: [{ pat: [1600, 600], loss: 29, sl: 9000 }],
      bA: [],
      bB: []
    }],
    meta: sampleMeta({
      remnantBars: [{ pat: [300, 300], loss: 188, sl: 941 }]
    })
  };
  const payload = buildCardSelectionPayload(result, 'card_yield_0');
  assert(payload.selectedBars.length === 2, 'yield payload should include remnant and standard bars');
  assert(payload.selectedBars[0].sl === 941, 'first bar should be remnant source');
  assert(payload.selectedBars[1].sl === 9000, 'second bar should be standard source');
});

test('yield payload prepends remnant bars when yield falls back to bA and bB only', function() {
  const result = {
    allDP: [{
      slA: 9000,
      slB: null,
      bA: [{ pat: [1600, 600], loss: 29, sl: 9000 }],
      bB: []
    }],
    meta: sampleMeta({
      remnantBars: [{ pat: [300, 300], loss: 188, sl: 941 }]
    })
  };
  const payload = buildCardSelectionPayload(result, 'card_yield_0');
  assert(payload.selectedBars.length === 2, 'yield fallback should include remnant and standard bars');
  assert(payload.selectedBars[0].sl === 941, 'yield fallback should prepend remnant source');
  assert(payload.selectedBars[1].sl === 9000, 'yield fallback should keep standard source');
});

test('pattern B90 payload resolves correct plan bars', function() {
  const result = {
    patA: { sl: 7000, bars: [{ pat: [1600], loss: 400, sl: 7000 }] },
    patB: {
      plan90: { sl: 5500, bars: [{ pat: [1600, 600], loss: 941, sl: 5500 }] },
      plan80: { sl: 3000, bars: [{ pat: [300], loss: 188, sl: 3000 }] }
    },
    meta: sampleMeta()
  };
  const payload = buildCardSelectionPayload(result, 'card_pat_B90_123');
  assert(payload.selectedBars.length === 1, 'expected one B90 bar');
  assert(payload.selectedBars[0].sl === 5500, 'expected B90 stock length');
  assert(payload.selectedBars[0].loss === 941, 'expected B90 loss');
});

test('extractRemnants respects min remnant length', function() {
  const result = {
    patA: { sl: 5500, bars: [{ pat: [1600], loss: 499, sl: 5500 }, { pat: [1600], loss: 941, sl: 5500 }] },
    meta: sampleMeta({ minRemnantLen: 500 })
  };
  const rems = extractRemnants(result, 'card_pat_A_1');
  assert(rems.length === 1, 'expected only one remnant above threshold');
  assert(rems[0].len === 941, 'expected remnant 941');
});

test('saveCutHistory stores selected bars and remnants for chosen card', function() {
  const result = {
    patA: { sl: 5500, bars: [{ pat: [1600, 600], loss: 941, sl: 5500 }] },
    meta: sampleMeta()
  };
  const entry = saveCutHistory(result, 'card_pat_A_1');
  assert(entry.result.selectedBars.length === 1, 'history should store selected bars');
  assert(entry.result.remnants.length === 1, 'history should store remnants');
  assert(entry.result.remnants[0].len === 941, 'history remnant should be 941');
});

test('saveCutHistory keeps yield card separation by card id', function() {
  const result = {
    allDP: [
      { slA: 12000, bars: [{ pat: [1600, 1600], loss: 6044, sl: 12000 }], bA: [], bB: [] },
      { slA: 11000, bars: [{ pat: [1600, 600], loss: 617, sl: 11000 }], bA: [], bB: [] }
    ],
    meta: sampleMeta()
  };
  const entry = saveCutHistory(result, 'card_yield_1');
  assert(entry.result.selectedBars.length === 1, 'yield second card should store one selected bar');
  assert(entry.result.selectedBars[0].sl === 11000, 'yield second card should store 11000 bar');
  assert(entry.result.remnants.length === 1 && entry.result.remnants[0].len === 617, 'yield second card should store matching remnant');
});

test('extractRemnants resolves B80 card without mixing B90 remnants', function() {
  const result = {
    patA: { sl: 7000, bars: [{ pat: [1600], loss: 3147, sl: 7000 }] },
    patB: {
      plan90: { sl: 7000, bars: [{ pat: [1600, 600], loss: 3147, sl: 7000 }] },
      plan80: { sl: 5500, bars: [{ pat: [1600, 1600, 600, 600], loss: 941, sl: 5500 }] }
    },
    meta: sampleMeta()
  };
  const rems = extractRemnants(result, 'card_pat_B80_9');
  assert(rems.length === 1, 'B80 should produce one remnant entry');
  assert(rems[0].len === 941, 'B80 should keep its own 941 remnant');
});

test('stored selectedBars do not leak into a different card when printedCardId differs', function() {
  const result = {
    printedCardId: 'card_yield_0',
    selectedBars: [{ pat: [1600, 600], loss: 29, sl: 9000 }],
    patB: {
      plan80: { sl: 5500, bars: [{ pat: [1600, 1600, 600, 600], loss: 941, sl: 5500 }] }
    },
    meta: sampleMeta()
  };
  const bars = getSelectedBarsFromResultData(result, 'card_pat_B80_1');
  assert(bars.length === 1, 'different card should still resolve a single B80 bar');
  assert(bars[0].sl === 5500, 'different card should not reuse stored yield selection');
  assert(bars[0].loss === 941, 'different card should keep its own loss');
});

test('stored selectedBars do not leak when printedCardId is empty and a card id is requested', function() {
  const result = {
    selectedBars: [{ pat: [1600, 600], loss: 29, sl: 9000 }],
    patB: {
      plan80: { sl: 5500, bars: [{ pat: [1600, 1600, 600, 600], loss: 941, sl: 5500 }] }
    },
    meta: sampleMeta()
  };
  const bars = getSelectedBarsFromResultData(result, 'card_pat_B80_1');
  assert(bars.length === 1, 'requested card should resolve one B80 bar');
  assert(bars[0].sl === 5500, 'empty printedCardId should not leak stale selected bars');
});

test('consumeSelectedInventoryRemnants removes exact selected ids', function() {
  saveInventory([
    { id: 'a', len: 941, spec: 'H-100x100x6x8', kind: 'H' },
    { id: 'b', len: 941, spec: 'H-100x100x6x8', kind: 'H' }
  ]);
  const consumed = consumeSelectedInventoryRemnants([{ ids: ['b'], qty: 1, len: 941, spec: 'H-100x100x6x8', kind: 'H' }]);
  const remain = getInventory();
  assert(consumed.length === 1, 'should consume one selected item');
  assert(remain.length === 1 && String(remain[0].id) === 'a', 'should leave only unselected id');
});

test('consumeInventoryBars removes selected standard stock and remnant stock', function() {
  saveInventory([
    { id: 'std1', len: 10000, spec: 'H-100x100x6x8', kind: 'H' },
    { id: 'rem1', len: 3147, spec: 'H-100x100x6x8', kind: 'H' }
  ]);
  const bars = [
    { pat: [1600], loss: 29, sl: 10000 },
    { pat: [1600, 600], loss: 235, sl: 3147 }
  ];
  const consumed = consumeInventoryBars(bars, sampleMeta({
    selectedInventoryRemnants: [{ ids: ['std1'], qty: 1, len: 10000, spec: 'H-100x100x6x8', kind: 'H' }]
  }));
  assert(consumed.length === 2, 'should consume both selected standard stock and remnant');
  assert(getInventory().length === 0, 'inventory should be empty after consumption');
});

test('buildPrintPayload prefers result payload over stale fallback bars', function() {
  const result = {
    allDP: [{
      slA: 9000,
      bars: [{ pat: [1600, 1600, 600, 600], loss: 29, sl: 9000 }],
      bA: [{ pat: [1], loss: 999, sl: 1 }],
      bB: []
    }],
    meta: sampleMeta()
  };
  global._lastCalcResult = result;
  const payload = buildPrintPayload('card_yield_0', result, {
    bars: [{ pat: [1], loss: 1, sl: 1 }],
    remnants: [{ len: 1, spec: 'x', kind: 'y', sl: 1 }]
  });
  assert(payload.bars.length === 1 && payload.bars[0].sl === 9000, 'print payload should use result bars');
  assert(payload.rems.length === 0, '29mm loss should not become remnant');
});

test('buildPrintPayload falls back to stored cart data when calcId differs', function() {
  const oldBars = [{ pat: [1600, 600], loss: 941, sl: 5500 }];
  const payload = buildPrintPayload('card_pat_B80_9', {
    allDP: [{ slA: 9000, bars: [{ pat: [1], loss: 29, sl: 9000 }], bA: [], bB: [] }],
    meta: sampleMeta({ calcId: 'calc_new' })
  }, {
    bars: oldBars,
    resultMeta: sampleMeta({ calcId: 'calc_old' }),
    remnants: [{ len: 941, spec: 'H-100x100x6x8', kind: 'H', sl: 5500, qty: 1 }]
  });
  assert(payload.bars.length === 1 && payload.bars[0].sl === 5500, 'stale live result should not overwrite stored cart data');
  assert(payload.rems.length === 1 && payload.rems[0].len === 941, 'stored remnants should remain when calcId differs');
});

test('print section preserves remnant stock bars alongside standard stock bars', function() {
  const payload = {
    bars: [
      { pat: [300, 300], loss: 188, sl: 941 },
      { pat: [500, 500, 500, 500, 500], loss: 2838, sl: 5500 }
    ],
    rems: [
      { len: 2838, spec: 'H-100x100x6x8', kind: 'H', sl: 5500, qty: 1 }
    ]
  };
  const section = buildPrintSectionFromPayload(1, 'H-100x100x6x8', payload, 150);
  assert(section.motherSummary.indexOf('941mm x 1') >= 0, 'mother summary should include remnant stock');
  assert(section.motherSummary.indexOf('5,500mm x 1') >= 0, 'mother summary should include standard stock');
  assert(section.barHtml.indexOf('941') >= 0, 'bar html should include remnant stock length');
});

test('print section uses original requested pieces for cut-list counts before bar-derived fallback', function() {
  const payload = {
    bars: [
      { pat: [300, 300], loss: 188, sl: 941 },
      { pat: [500, 500, 500, 500, 500], loss: 2838, sl: 5500 }
    ],
    rems: [{ len: 2838, spec: 'H-100x100x6x8', kind: 'H', sl: 5500, qty: 1 }],
    meta: Object.assign(sampleMeta(), {
      origPieces: [500, 500, 500, 500, 500]
    })
  };
  const section = buildPrintSectionFromPayload(1, 'H-100x100x6x8', payload, 150);
  assert(section.sumMap[500] === 5, 'cut-list count should come from original requested pieces');
  assert(!section.sumMap[300], 'cut-list should not be inflated by remnant-only helper bars');
});

test('buildPrintPayload prefers canonical live meta over fallback cart meta', function() {
  const result = {
    allDP: [{
      slA: 9000,
      bars: [{ pat: [1600, 600], loss: 29, sl: 9000 }],
      bA: [],
      bB: []
    }],
    meta: sampleMeta({
      calcId: 'calc_live',
      origPieces: [1600, 600],
      remnantBars: [{ pat: [300, 300], loss: 188, sl: 941 }]
    })
  };
  global._lastCalcResult = result;
  const payload = buildPrintPayload('card_yield_0', result, {
    bars: [{ pat: [1], loss: 1, sl: 1 }],
    resultMeta: sampleMeta({ calcId: 'calc_live' })
  });
  assert(Array.isArray(payload.meta.origPieces) && payload.meta.origPieces.length === 2, 'canonical live meta should win over stale cart meta');
  assert(payload.bars[0].sl === 941, 'yield print payload should still keep remnant source first');
});

test('extractRemnantsFromCard resolves from canonical payload instead of DOM text', function() {
  global._lastCalcResult = {
    patB: {
      plan80: { sl: 5500, bars: [{ pat: [1600, 1600, 600, 600], loss: 941, sl: 5500 }] }
    },
    meta: sampleMeta()
  };
  const rems = extractRemnantsFromCard('card_pat_B80_1');
  assert(rems.length === 1, 'extractRemnantsFromCard should read canonical payload');
  assert(rems[0].len === 941, 'extractRemnantsFromCard should keep canonical remnant');
});

test('buildCutSourceLabel omits legacy wording', function() {
  assert(buildCutSourceLabel(5500).indexOf('定尺') >= 0, 'standard stock label should remain');
  assert(buildCutSourceLabel(941).indexOf('より切断') < 0, 'remnant label should omit legacy wording');
});

test('autoSyncResultRemnants does not register inventory during calculation', function() {
  saveInventory([]);
  autoSyncResultRemnants({
    patB: {
      plan80: { sl: 5500, bars: [{ pat: [1600, 1600, 600, 600], loss: 941, sl: 5500 }] }
    },
    meta: sampleMeta()
  });
  assert(getInventory().length === 0, 'inventory should not change before print');
});

test('stress: payload resolution remains stable across many card patterns', function() {
  const specs = ['H-100x100x6x8', 'RB-6', 'L-65x65x6'];
  for (let i = 0; i < 3000; i++) {
    const spec = specs[i % specs.length];
    const yieldBars0 = [{ pat: [1600, 600], loss: 29 + (i % 3), sl: 9000 }];
    const yieldBars1 = [{ pat: [1600, 1600], loss: 617 + (i % 11), sl: 11000 }];
    const b90Bars = [{ pat: [1600, 600], loss: 3147 + (i % 7), sl: 7000 }];
    const b80Bars = [{ pat: [1600, 1600, 600, 600], loss: 941 + (i % 5), sl: 5500 }];
    const remBars = [{ pat: [300, 300], loss: 188 + (i % 9), sl: 941 + (i % 13) }];
    const result = {
      allDP: [
        { slA: 9000, bars: yieldBars0, bA: [], bB: [] },
        { slA: 11000, bars: yieldBars1, bA: [], bB: [] }
      ],
      patA: { sl: 7000, bars: b90Bars.slice() },
      patB: {
        plan90: { sl: 7000, bars: b90Bars.slice() },
        plan80: { sl: 5500, bars: b80Bars.slice() }
      },
      meta: sampleMeta({ spec, remnantBars: remBars })
    };

    const yieldPayload = buildCardSelectionPayload(result, 'card_yield_0');
    assert(yieldPayload.selectedBars.length >= 1, 'yield payload should not be empty');
    assert(yieldPayload.selectedBars[yieldPayload.selectedBars.length - 1].sl === 9000, 'yield payload should keep selected yield stock');

    const yield2Payload = buildCardSelectionPayload(result, 'card_yield_1');
    assert(yield2Payload.selectedBars[yield2Payload.selectedBars.length - 1].sl === 11000, 'yield second payload should keep second stock');

    const b90Payload = buildCardSelectionPayload(result, 'card_pat_B90_' + i);
    assert(b90Payload.selectedBars[0].sl === 7000, 'B90 payload should resolve to 7000 stock');

    const b80Payload = buildCardSelectionPayload(result, 'card_pat_B80_' + i);
    assert(b80Payload.selectedBars[0].sl === 5500, 'B80 payload should resolve to 5500 stock');
  }
});

test('stress: mismatched printed card ids never leak stale selected bars', function() {
  for (let i = 0; i < 10000; i++) {
    const result = {
      printedCardId: 'card_yield_0',
      selectedBars: [{ pat: [1600, 600], loss: 29 + (i % 13), sl: 9000 }],
      allDP: [
        { slA: 9000, bars: [{ pat: [1600, 600], loss: 29 + (i % 13), sl: 9000 }], bA: [], bB: [] }
      ],
      patB: {
        plan80: { sl: 5500, bars: [{ pat: [1600, 1600, 600, 600], loss: 941 + (i % 7), sl: 5500 }] }
      },
      meta: sampleMeta()
    };
    const b80Bars = getSelectedBarsFromResultData(result, 'card_pat_B80_' + i);
    assert(b80Bars.length === 1, 'mismatch stress should still resolve B80 bars');
    assert(b80Bars[0].sl === 5500, 'mismatch stress should not leak yield bar sl');
    assert(b80Bars[0].loss === 941 + (i % 7), 'mismatch stress should keep matching B80 loss');
  }
});

test('stress: print section generation keeps remnant bars visible', function() {
  for (let i = 0; i < 5000; i++) {
    const payload = {
      bars: [
        { pat: [300, 300], loss: 188 + (i % 9), sl: 941 + (i % 17) },
        { pat: [500, 500, 500, 500, 500], loss: 2838 + (i % 11), sl: 5500 }
      ],
      rems: [
        { len: 2838 + (i % 11), spec: 'H-100x100x6x8', kind: 'H', sl: 5500, qty: 1 }
      ]
    };
    const section = buildPrintSectionFromPayload(1, 'H-100x100x6x8', payload, 150);
    assert(section.motherSummary.indexOf('5,500mm x 1') >= 0, 'print section stress should keep standard stock summary');
    assert(section.motherSummary.indexOf('mm x 1') >= 0, 'print section stress should include remnant stock summary');
    assert(section.barHtml.length > 0, 'print section stress should produce html');
  }
});

console.log('All verification cases passed.');
