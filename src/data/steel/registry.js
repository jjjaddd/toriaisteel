(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.data = ns.data || {};
  ns.data.steel = ns.data.steel || {};

  var registry = {};
  var aliases = {
    '山形鋼': '等辺山形鋼',
    '不等辺山形鋼': '不等辺山形鋼',
    '不等辺不等厚山形鋼': '不等辺不等厚山形鋼',
    'C形鋼': 'C形鋼',
    '軽量溝形鋼': '軽量溝形鋼',
    'H形鋼': 'H形鋼',
    'I形鋼': 'I形鋼',
    '平鋼': '平鋼',
    '丸鋼': '丸鋼',
    '角鋼': '角鋼',
    '角パイプ': '角パイプ',
    'スモール角パイプ': 'スモール角パイプ',
    'SGP配管': 'SGP配管',
    'BCR295': 'BCR295',
    '溝形鋼': '溝形鋼'
  };

  function normalizeKind(kind) {
    return aliases[kind] || kind;
  }

  function registerKind(config) {
    if (!config || !config.type) return;
    var current = registry[config.type] || {
      type: config.type,
      stockLengths: [],
      specStockLengths: {},
      surfaces: []
    };

    var nextSpecStockLengths = Object.assign({}, current.specStockLengths);
    if (config.specStockLengths && typeof config.specStockLengths === 'object') {
      Object.keys(config.specStockLengths).forEach(function(key) {
        var value = config.specStockLengths[key];
        if (Array.isArray(value)) {
          nextSpecStockLengths[key] = value.slice();
        } else if (value && typeof value === 'object') {
          nextSpecStockLengths[key] = {
            include: Array.isArray(value.include) ? value.include.slice() : [],
            exclude: Array.isArray(value.exclude) ? value.exclude.slice() : []
          };
        }
      });
    }

    registry[config.type] = {
      type: config.type,
      stockLengths: Array.isArray(config.stockLengths) ? config.stockLengths.slice() : current.stockLengths.slice(),
      specStockLengths: nextSpecStockLengths,
      surfaces: Array.isArray(config.surfaces) ? config.surfaces.slice() : current.surfaces.slice()
    };
  }

  function getKindConfig(kind) {
    return registry[normalizeKind(kind)] || null;
  }

  function getSectionData(kind) {
    var sectionData = global.SECTION_DATA || {};
    return sectionData[normalizeKind(kind)] || null;
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
    if (entry && specName && entry.specStockLengths && entry.specStockLengths[specName]) {
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
    return entry && entry.stockLengths.length ? entry.stockLengths.slice() : [];
  }

  ns.data.steel.registerKind = registerKind;
  ns.data.steel.getKindConfig = getKindConfig;
  ns.data.steel.getSectionData = getSectionData;
  ns.data.steel.getSpecsByType = getSpecsByType;
  ns.data.steel.getSpecByName = getSpecByName;
  ns.data.steel.getStockLengthsByType = getStockLengthsByType;
})(window);
