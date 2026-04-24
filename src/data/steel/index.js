(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.data = ns.data || {};
  ns.data.steel = ns.data.steel || {};

  function getAllKinds() {
    var sectionData = global.SECTION_DATA;
    if (sectionData && typeof sectionData === 'object') {
      return Object.keys(sectionData);
    }
    var steel = global.STEEL;
    if (steel && typeof steel === 'object') {
      return Object.keys(steel);
    }
    return [];
  }

  function getKindLabel(kind) {
    var entry = typeof ns.data.steel.getSectionData === 'function'
      ? ns.data.steel.getSectionData(kind)
      : null;
    return entry && entry.label ? entry.label : kind;
  }

  function getRowsByKind(kind) {
    if (typeof global.getSteelRowsForKind === 'function') {
      return global.getSteelRowsForKind(kind);
    }

    var steel = global.STEEL || {};
    if (Array.isArray(steel[kind])) {
      return steel[kind].slice();
    }

    if (typeof ns.data.steel.getSpecsByType === 'function') {
      return ns.data.steel.getSpecsByType(kind).map(function(spec) {
        return [spec.name, spec.weight];
      });
    }

    return [];
  }

  ns.data.steel.getAllKinds = getAllKinds;
  ns.data.steel.getKindLabel = getKindLabel;
  ns.data.steel.getRowsByKind = getRowsByKind;
})(window);
