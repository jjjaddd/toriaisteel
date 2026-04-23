(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.storage = ns.storage || {};

  function readJson(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn('[Toriai][storage] readJson failed:', key, error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('[Toriai][storage] writeJson failed:', key, error);
      return false;
    }
  }

  function readText(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw == null ? fallback : raw;
    } catch (error) {
      console.warn('[Toriai][storage] readText failed:', key, error);
      return fallback;
    }
  }

  function writeText(key, value) {
    try {
      global.localStorage.setItem(key, value == null ? '' : String(value));
      return true;
    } catch (error) {
      console.warn('[Toriai][storage] writeText failed:', key, error);
      return false;
    }
  }

  function remove(key) {
    try {
      global.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('[Toriai][storage] remove failed:', key, error);
      return false;
    }
  }

  ns.storage.localStore = {
    readJson: readJson,
    writeJson: writeJson,
    readText: readText,
    writeText: writeText,
    remove: remove
  };
})(window);
