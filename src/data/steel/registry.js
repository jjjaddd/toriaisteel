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
    registry[config.type] = {
      type: config.type,
      stockLengths: Array.isArray(config.stockLengths) ? config.stockLengths.slice() : [],
      surfaces: Array.isArray(config.surfaces) ? config.surfaces.slice() : []
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
    return entry && entry.stockLengths.length ? entry.stockLengths.slice() : [];
  }

  ns.data.steel.registerKind = registerKind;
  ns.data.steel.getKindConfig = getKindConfig;
  ns.data.steel.getSectionData = getSectionData;
  ns.data.steel.getSpecsByType = getSpecsByType;
  ns.data.steel.getSpecByName = getSpecByName;
  ns.data.steel.getStockLengthsByType = getStockLengthsByType;
})(window);
