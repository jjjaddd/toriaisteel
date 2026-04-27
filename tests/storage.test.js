const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PROJECT_ROOT = path.join(__dirname, '..');

function createSandbox() {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    alert: function() {},
    localStorage: {
      _store: {},
      getItem: function(k) {
        return Object.prototype.hasOwnProperty.call(this._store, k) ? this._store[k] : null;
      },
      setItem: function(k, v) {
        this._store[k] = String(v);
      },
      removeItem: function(k) {
        delete this._store[k];
      }
    },
    window: null,
    self: null
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  return sandbox;
}

function loadScriptIntoSandbox(filename, sandbox) {
  const code = fs.readFileSync(path.join(PROJECT_ROOT, filename), 'utf8');
  vm.runInContext(code, sandbox, { filename });
}

function normalizeValue(value) {
  return JSON.parse(JSON.stringify(value));
}

describe('storage modules', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = createSandbox();
    vm.createContext(sandbox);
    loadScriptIntoSandbox('src/storage/keys.js', sandbox);
    loadScriptIntoSandbox('src/storage/local-store.js', sandbox);
    loadScriptIntoSandbox('src/storage/repositories.js', sandbox);
  });

  test('localStore.readJson / writeJson works', () => {
    const store = sandbox.window.Toriai.storage.localStore;
    assert.strictEqual(store.writeJson('test_json', { a: 1 }), true);
    expect(normalizeValue(store.readJson('test_json', []))).toEqual({ a: 1 });
  });

  test('localStore.readText / writeText works', () => {
    const store = sandbox.window.Toriai.storage.localStore;
    assert.strictEqual(store.writeText('test_text', 'hello'), true);
    expect(store.readText('test_text', 'fallback')).toBe('hello');
    expect(store.readText('missing_text', 'fallback')).toBe('fallback');
  });

  test('repositories load/save/clear fallback and persistence', () => {
    const repos = sandbox.window.Toriai.storage.repositories;
    const repo = repos.remnants;

    expect(normalizeValue(repo.load())).toEqual([]);
    assert.strictEqual(repo.save([{ id: 1 }]), true);
    expect(normalizeValue(repo.load())).toEqual([{ id: 1 }]);
    assert.strictEqual(repo.clear(), true);
    expect(normalizeValue(repo.load())).toEqual([]);
  });
});
