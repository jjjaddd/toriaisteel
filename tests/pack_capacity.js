const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PROJECT_ROOT = path.join(__dirname, '..');

function createSandbox() {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    self: null,
    window: null,
    localStorage: {
      _store: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._store, k) ? this._store[k] : null; },
      setItem(k, v) { this._store[k] = String(v); },
      removeItem(k) { delete this._store[k]; }
    },
    document: {
      getElementById() { return null; }
    }
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  return sandbox;
}

function loadScript(filename, sandbox) {
  const code = fs.readFileSync(path.join(PROJECT_ROOT, filename), 'utf8');
  vm.runInContext(code, sandbox, { filename });
}

function makePieces(types, countPerType) {
  const pieces = [];
  for (let i = 0; i < types; i += 1) {
    const length = 1000 + i * 10;
    for (let j = 0; j < countPerType; j += 1) {
      pieces.push(length);
    }
  }
  return pieces;
}

const sandbox = createSandbox();
vm.createContext(sandbox);
loadScript('src/core/toriai-namespace.js', sandbox);
loadScript('src/calculation/yield/patternPacking.js', sandbox);

const pack = sandbox.window.Toriai.calculation.yield.pack;
if (typeof pack !== 'function') {
  throw new Error('pack not found');
}

const results = [];
const maxTypes = 120;
for (let types = 10; types <= maxTypes; types += 10) {
  const pieces = makePieces(types, 2);
  const count = pieces.length;
  console.log(`Testing ${types} distinct lengths (${count} pieces)...`);
  const start = Date.now();
  try {
    const result = pack(pieces, 12000, 3);
    const elapsed = Date.now() - start;
    console.log(`  OK: ${result.length} bars, ${elapsed}ms`);
    results.push({ types, count, bars: result.length, elapsed });
  } catch (error) {
    console.error(`  ERROR at ${types} types:`, error && error.message);
    process.exit(1);
  }
}
console.log('Done.');
console.log(JSON.stringify(results, null, 2));
