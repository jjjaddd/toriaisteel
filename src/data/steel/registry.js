(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.data = ns.data || {};
  ns.data.steel = ns.data.steel || {};

  var registry = {};
  var aliases = {
    '\u5c71\u5f62\u92fc': '\u7b49\u8fba\u5c71\u5f62\u92fc',
    '\u7b49\u8fba\u5c71\u5f62\u92fc': '\u7b49\u8fba\u5c71\u5f62\u92fc',
    '\u4e0d\u7b49\u8fba\u5c71\u5f62\u92fc': '\u4e0d\u7b49\u8fba\u5c71\u5f62\u92fc',
    '\u4e0d\u7b49\u8fba\u4e0d\u7b49\u539a\u5c71\u5f62\u92fc': '\u4e0d\u7b49\u8fba\u4e0d\u7b49\u539a\u5c71\u5f62\u92fc',
    'H\u5f62\u92fc': 'H\u5f62\u92fc',
    'I\u5f62\u92fc': 'I\u5f62\u92fc',
    '\u5e73\u92fc': '\u5e73\u92fc',
    '\u4e38\u92fc': '\u4e38\u92fc',
    '\u89d2\u92fc': '\u89d2\u92fc',
    '\u6e9d\u5f62\u92fc': '\u6e9d\u5f62\u92fc',
    'C\u5f62\u92fc': 'C\u5f62\u92fc',
    'C\u5f62\u92fc\uff08\u30ea\u30c3\u30d7\u6e9d\u5f62\u92fc\uff09': 'C\u5f62\u92fc',
    '\u8efd\u91cf\u6e9d\u5f62\u92fc': '\u8efd\u91cf\u6e9d\u5f62\u92fc',
    '\u89d2\u30d1\u30a4\u30d7': '\u89d2\u30d1\u30a4\u30d7',
    '\u30b9\u30e2\u30fc\u30eb\u89d2\u30d1\u30a4\u30d7': '\u30b9\u30e2\u30fc\u30eb\u89d2\u30d1\u30a4\u30d7',
    '\u30b9\u30e2\u30fc\u30eb\u30fb\u30b9\u30fc\u30d1\u30fc\u89d2\u30d1\u30a4\u30d7': '\u30b9\u30e2\u30fc\u30eb\u89d2\u30d1\u30a4\u30d7',
    'SGP\u914d\u7ba1': 'SGP\u914d\u7ba1',
    '\u914d\u7ba1\u7528\u70ad\u7d20\u92fc\u92fc\u7ba1\uff08SGP\uff09': 'SGP\u914d\u7ba1',
    'BCR295': 'BCR295'
  };

  function normalizeKind(kind) {
    return aliases[kind] || kind;
  }

  function getSectionDataMap() {
    return ns.data.steel._sectionData || global.SECTION_DATA || {};
  }

  function findSectionKey(kind) {
    var sectionData = getSectionDataMap();
    var raw = kind == null ? '' : String(kind);
    var normalized = normalizeKind(raw);

    if (Object.prototype.hasOwnProperty.call(sectionData, raw)) return raw;
    if (Object.prototype.hasOwnProperty.call(sectionData, normalized)) return normalized;

    var keys = Object.keys(sectionData);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var entry = sectionData[key];
      if (!entry || typeof entry !== 'object') continue;
      if (entry.label === raw || entry.label === normalized) return key;
      if (entry.calcKey === raw || entry.calcKey === normalized) return key;
      if (entry.type === raw || entry.type === normalized) return key;
    }
    return null;
  }

  function cloneSpecRule(value) {
    if (Array.isArray(value)) return value.slice();
    if (value && typeof value === 'object') {
      return {
        include: Array.isArray(value.include) ? value.include.slice() : [],
        exclude: Array.isArray(value.exclude) ? value.exclude.slice() : []
      };
    }
    return null;
  }

  function registerKind(config) {
    if (!config || !config.type) return;
    var kind = normalizeKind(config.type);
    var current = registry[kind] || {
      type: kind,
      stockLengths: [],
      specStockLengths: {},
      surfaces: []
    };

    var nextSpecStockLengths = Object.assign({}, current.specStockLengths);
    if (config.specStockLengths && typeof config.specStockLengths === 'object') {
      Object.keys(config.specStockLengths).forEach(function(key) {
        var cloned = cloneSpecRule(config.specStockLengths[key]);
        if (cloned) nextSpecStockLengths[key] = cloned;
      });
    }

    registry[kind] = {
      type: kind,
      stockLengths: Array.isArray(config.stockLengths) ? config.stockLengths.slice() : current.stockLengths.slice(),
      specStockLengths: nextSpecStockLengths,
      surfaces: Array.isArray(config.surfaces) ? config.surfaces.slice() : current.surfaces.slice()
    };
  }

  function getKindConfig(kind) {
    return registry[normalizeKind(kind)] || null;
  }

  function getSectionData(kind) {
    var sectionData = getSectionDataMap();
    var foundKey = findSectionKey(kind);
    return foundKey ? sectionData[foundKey] : null;
  }

  function getSpecsByType(kind) {
    var entry = getSectionData(kind);
    return entry && Array.isArray(entry.specs) ? entry.specs.slice() : [];
  }

  function getSpecByName(kind, specName) {
    return getSpecsByType(kind).find(function(spec) {
      return spec && spec.name === specName;
    }) || null;
  }

  function getStockLengthsByType(kind, specName) {
    var spec = getSpecByName(kind, specName);
    if (spec && Array.isArray(spec.defaultStock) && spec.defaultStock.length) {
      return spec.defaultStock.slice();
    }

    var entry = getKindConfig(kind);
    if (!entry) return [];

    if (specName && entry.specStockLengths && entry.specStockLengths[specName]) {
      var base = entry.stockLengths.length ? entry.stockLengths.slice() : [];
      var specRule = entry.specStockLengths[specName];

      if (Array.isArray(specRule)) {
        return specRule.slice();
      }

      if (specRule && typeof specRule === 'object') {
        if (Array.isArray(specRule.exclude) && specRule.exclude.length) {
          base = base.filter(function(len) {
            return specRule.exclude.indexOf(len) === -1;
          });
        }
        if (Array.isArray(specRule.include) && specRule.include.length) {
          specRule.include.forEach(function(len) {
            if (base.indexOf(len) === -1) base.push(len);
          });
        }
        return base.sort(function(a, b) { return a - b; });
      }
    }

    return entry.stockLengths.length ? entry.stockLengths.slice() : [];
  }

  ns.data.steel.registerKind = registerKind;
  ns.data.steel.getKindConfig = getKindConfig;
  ns.data.steel.getSectionData = getSectionData;
  ns.data.steel.getSectionDataMap = getSectionDataMap;
  ns.data.steel.getSpecsByType = getSpecsByType;
  ns.data.steel.getSpecByName = getSpecByName;
  ns.data.steel.getStockLengthsByType = getStockLengthsByType;
})(window);
