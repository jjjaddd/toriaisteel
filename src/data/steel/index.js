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

  function normalizeSteelSearchText(value) {
    return String(value || '')
      .replace(/[０-９Ａ-Ｚａ-ｚ]/g, function(ch) {
        return String.fromCharCode(ch.charCodeAt(0) - 65248);
      })
      .replace(/[×＊*]/g, 'x')
      .replace(/[‐‑‒–—―−ー]/g, '-')
      .replace(/[φΦ]/g, 'd')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  function compactSteelSearchText(value) {
    return normalizeSteelSearchText(value).replace(/[^a-z0-9.]/g, '');
  }

  function steelSearchDigits(value) {
    return normalizeSteelSearchText(value).replace(/[^0-9]/g, '');
  }

  function buildSteelSearchTarget(item) {
    item = item || {};
    var spec = item.spec || item.name || '';
    var kind = item.kind || '';
    var label = item.label || '';
    var normSpec = normalizeSteelSearchText(spec);
    var compactSpec = compactSteelSearchText(spec);
    var normKind = normalizeSteelSearchText(kind);
    var compactKind = compactSteelSearchText(kind);
    var normLabel = normalizeSteelSearchText(label);
    var compactLabel = compactSteelSearchText(label);
    var digits = steelSearchDigits(spec);
    return {
      normSpec: normSpec,
      compactSpec: compactSpec,
      digits: digits,
      all: [
        normSpec,
        compactSpec,
        digits,
        normKind,
        compactKind,
        normLabel,
        compactLabel,
        normKind + normSpec,
        compactKind + compactSpec,
        normLabel + normSpec,
        compactLabel + compactSpec
      ].join(' ')
    };
  }

  function getSteelSearchRank(query, item) {
    var q = normalizeSteelSearchText(query);
    var qc = compactSteelSearchText(query);
    var qd = steelSearchDigits(query);
    var hasAlpha = /[a-z]/.test(qc);
    if (!q && !qc && !qd) return 0;

    var target = buildSteelSearchTarget(item);
    if (q && target.normSpec === q) return 0;
    if (qc && target.compactSpec === qc) return 1;
    if (q && target.normSpec.indexOf(q) === 0) return 2;
    if (qc && target.compactSpec.indexOf(qc) === 0) return 3;
    if (q && target.normSpec.indexOf(q) >= 0) return 4;
    if (qc && target.compactSpec.indexOf(qc) >= 0) return 5;
    if (q && target.all.indexOf(q) >= 0) return 8;
    if (qc && target.all.indexOf(qc) >= 0) return 9;
    if (!hasAlpha && qd && target.digits.indexOf(qd) === 0) return 10;
    if (!hasAlpha && qd && target.digits.indexOf(qd) >= 0) return 11;
    return Infinity;
  }

  function steelSpecMatchesQuery(query, item) {
    return getSteelSearchRank(query, item) !== Infinity;
  }

  function compareSteelSearchResults(query, a, b) {
    var ar = getSteelSearchRank(query, a);
    var br = getSteelSearchRank(query, b);
    if (ar !== br) return ar - br;
    var an = String((a && (a.spec || a.name)) || '');
    var bn = String((b && (b.spec || b.name)) || '');
    return compareSpecRowsByName([an], [bn]);
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
  ns.data.steel.normalizeSearchText = normalizeSteelSearchText;
  ns.data.steel.compactSearchText = compactSteelSearchText;
  ns.data.steel.searchDigits = steelSearchDigits;
  ns.data.steel.searchSpecMatches = steelSpecMatchesQuery;
  ns.data.steel.compareSearchResults = compareSteelSearchResults;

  global.normalizeSteelSearchText = normalizeSteelSearchText;
  global.compactSteelSearchText = compactSteelSearchText;
  global.steelSearchDigits = steelSearchDigits;
  global.steelSpecMatchesQuery = steelSpecMatchesQuery;
  global.compareSteelSearchResults = compareSteelSearchResults;
})(window);
