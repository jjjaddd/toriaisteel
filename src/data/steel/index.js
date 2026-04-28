(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.data = ns.data || {};
  ns.data.steel = ns.data.steel || {};

  function getSectionDataMap() {
    if (typeof ns.data.steel.getSectionDataMap === 'function') {
      return ns.data.steel.getSectionDataMap();
    }
    return ns.data.steel._sectionData || global.SECTION_DATA || {};
  }

  function getAllKinds() {
    var kinds = [];
    var seen = {};
    var sectionData = getSectionDataMap();
    if (sectionData && typeof sectionData === 'object') {
      Object.keys(sectionData).forEach(function(kind) {
        if (seen[kind]) return;
        seen[kind] = true;
        kinds.push(kind);
      });
    }
    getCustomMaterialRows().forEach(function(item) {
      var kind = item.kind;
      if (!kind || seen[kind]) return;
      seen[kind] = true;
      kinds.push(kind);
    });
    return kinds;
  }

  function getKindLabel(kind) {
    var entry = typeof ns.data.steel.getSectionData === 'function'
      ? ns.data.steel.getSectionData(kind)
      : null;
    return entry && entry.label ? entry.label : kind;
  }

  function getCalcKindName(kind) {
    var entry = typeof ns.data.steel.getSectionData === 'function'
      ? ns.data.steel.getSectionData(kind)
      : null;
    return entry && entry.calcKey ? entry.calcKey : kind;
  }

  function getDataKindByCalcName(kind) {
    if (typeof ns.data.steel.getSectionData === 'function' && ns.data.steel.getSectionData(kind)) {
      return kind;
    }
    var kinds = getAllKinds();
    for (var i = 0; i < kinds.length; i++) {
      if (getCalcKindName(kinds[i]) === kind) return kinds[i];
    }
    return kind;
  }

  function getCalcEnabledSpecs(kind) {
    var specs = typeof ns.data.steel.getSpecsByType === 'function'
      ? ns.data.steel.getSpecsByType(kind)
      : [];
    return specs.filter(function(spec) {
      if (!spec || spec.inCalc === false) return false;
      return spec.W != null && spec.W > 0;
    });
  }

  function getCalcEnabledKinds() {
    return getAllKinds().filter(function(kind) {
      var entry = typeof ns.data.steel.getSectionData === 'function'
        ? ns.data.steel.getSectionData(kind)
        : null;
      return !!(entry && entry.showInCalc && getCalcEnabledSpecs(kind).length);
    });
  }

  function getDefaultStockLengths(kind, spec) {
    if (typeof ns.data.steel.getStockLengthsByType === 'function') {
      var registryLengths = ns.data.steel.getStockLengthsByType(kind, spec);
      if (Array.isArray(registryLengths) && registryLengths.length) {
        return registryLengths.slice();
      }
    }

    var entry = typeof ns.data.steel.getSectionData === 'function'
      ? ns.data.steel.getSectionData(kind)
      : null;
    var specs = entry && Array.isArray(entry.specs) ? entry.specs : [];
    var specEntry = null;
    for (var i = 0; i < specs.length; i++) {
      if (specs[i] && specs[i].name === spec) {
        specEntry = specs[i];
        break;
      }
    }
    if (specEntry && Array.isArray(specEntry.defaultStock) && specEntry.defaultStock.length) {
      return specEntry.defaultStock.slice();
    }

    var stockDb = global.DEFAULT_STOCK_DB || {};
    var base = Array.isArray(stockDb.common) ? stockDb.common.slice() : [];
    var policy = stockDb.byKind && stockDb.byKind[kind] ? stockDb.byKind[kind] : {};
    var entryPolicy = entry && entry.defaultStockPolicy ? entry.defaultStockPolicy : null;
    var activePolicy = entryPolicy || policy || {};

    if (Array.isArray(activePolicy.lengths) && activePolicy.lengths.length) {
      base = activePolicy.lengths.slice();
    }
    if (Array.isArray(activePolicy.exclude) && activePolicy.exclude.length) {
      base = base.filter(function(len) { return activePolicy.exclude.indexOf(len) === -1; });
    }
    return base;
  }

  function compareSpecRowsByName(a, b) {
    var an = String((a && a[0]) || '').match(/[\d.]+/g) || [];
    var bn = String((b && b[0]) || '').match(/[\d.]+/g) || [];
    var len = Math.max(an.length, bn.length);
    for (var i = 0; i < len; i++) {
      var av = an[i] == null ? -Infinity : parseFloat(an[i]);
      var bv = bn[i] == null ? -Infinity : parseFloat(bn[i]);
      if (av !== bv) return av - bv;
    }
    return String((a && a[0]) || '').localeCompare(String((b && b[0]) || ''), 'ja');
  }

  function getRowsByKind(kind) {
    var rows = [];
    var seen = {};
    var specs = typeof ns.data.steel.getSpecsByType === 'function'
      ? ns.data.steel.getSpecsByType(kind)
      : [];

    specs.forEach(function(spec) {
      if (!spec || spec.inCalc === false || spec.W == null || !(spec.W > 0)) return;
      var row = [spec.name, spec.W];
      rows.push(row);
      seen[spec.name] = true;
    });

    // サイズ順にソート（spec.js の追加順がバラついていても、寸法数値順で並ぶ）
    rows.sort(compareSpecRowsByName);

    // カスタム鋼材は末尾に追加
    getCustomMaterialRows(kind).forEach(function(item) {
      if (!item || !item.spec || !(Number(item.kgm) > 0) || seen[item.spec]) return;
      rows.push([item.spec, Number(item.kgm), true]);
      seen[item.spec] = true;
    });

    return rows;
  }

  function getCustomMaterialRows(kind) {
    var list = Array.isArray(global._customMaterials) ? global._customMaterials : [];
    if (!kind) return list.slice();
    return list.filter(function(item) { return item && item.kind === kind; });
  }

  function getFirstRowByKind(kind) {
    var rows = getRowsByKind(kind);
    return rows.length ? rows[0] : null;
  }

  function findRowByKindAndSpec(kind, specName) {
    var rows = getRowsByKind(kind);
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === specName) return rows[i];
    }
    return null;
  }

  ns.data.steel.getAllKinds = getAllKinds;
  ns.data.steel.getKindLabel = getKindLabel;
  ns.data.steel.getCalcKindName = getCalcKindName;
  ns.data.steel.getDataKindByCalcName = getDataKindByCalcName;
  ns.data.steel.getCalcEnabledSpecs = getCalcEnabledSpecs;
  ns.data.steel.getCalcEnabledKinds = getCalcEnabledKinds;
  ns.data.steel.getDefaultStockLengths = getDefaultStockLengths;
  ns.data.steel.getRowsByKind = getRowsByKind;
  ns.data.steel.getCustomMaterialRows = getCustomMaterialRows;
  ns.data.steel.getFirstRowByKind = getFirstRowByKind;
  ns.data.steel.findRowByKindAndSpec = findRowByKindAndSpec;
})(window);
