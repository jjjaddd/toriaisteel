(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.storage = ns.storage || {};

  var keys = ns.storage.keys || {};
  var localStore = ns.storage.localStore || {};
  var repositories = ns.storage.repositories || {};
  var validation = (ns.utils && ns.utils.validation) || {};

  function sanitizeText(value, maxLength) {
    if (typeof validation.sanitizeFreeText === 'function') {
      return validation.sanitizeFreeText(value, maxLength);
    }
    return value == null ? '' : String(value).trim().slice(0, maxLength || 200);
  }

  function loadState() {
    return {
      savedCalcs: repositories.weightSavedCalcs ? repositories.weightSavedCalcs.load() : [],
      jobName: localStore.readText ? localStore.readText(keys.weightJobName, '') : '',
      jobClient: localStore.readText ? localStore.readText(keys.weightJobClient, '') : '',
      docTitle: localStore.readText ? localStore.readText(keys.weightDocTitle, '') : '',
      notes: localStore.readJson ? localStore.readJson(keys.weightNotes, {}) : {}
    };
  }

  function saveMeta(meta) {
    meta = meta || {};
    if (!localStore.writeText) return false;
    localStore.writeText(keys.weightJobName, sanitizeText(meta.jobName, 120));
    localStore.writeText(keys.weightJobClient, sanitizeText(meta.jobClient, 120));
    localStore.writeText(keys.weightDocTitle, sanitizeText(meta.docTitle, 80));
    return true;
  }

  function saveSavedCalcs(items) {
    if (repositories.weightSavedCalcs) {
      return repositories.weightSavedCalcs.save(Array.isArray(items) ? items : []);
    }
    return false;
  }

  function loadNotes() {
    return localStore.readJson ? localStore.readJson(keys.weightNotes, {}) : {};
  }

  function saveNotes(notes) {
    if (localStore.writeJson) {
      return localStore.writeJson(keys.weightNotes, notes || {});
    }
    return false;
  }

  ns.storage.weightStore = {
    loadState: loadState,
    saveMeta: saveMeta,
    saveSavedCalcs: saveSavedCalcs,
    loadNotes: loadNotes,
    saveNotes: saveNotes
  };
})(window);
