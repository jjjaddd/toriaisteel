(function(global) {
  'use strict';

  function parseRectPipeSpec(name, weight) {
    var nums = (String(name || '').match(/[\d.]+/g) || []).map(Number);
    if (nums.length < 3) return null;
    return {
      name: String(name),
      H: nums[0],
      B: nums[1],
      t: nums[2],
      Ac: global.approxAreaFromWeight(weight),
      W: Number(weight || 0),
      Ix: null, Iy: null, Zx: null, Zy: null, ix: null, iy: null
    };
  }

  function parseCShapeSpec(name, weight) {
    var nums = (String(name || '').match(/[\d.]+/g) || []).map(Number);
    if (nums.length < 4) return null;
    return {
      name: String(name),
      H: nums[0],
      B: nums[1],
      L: nums[2],
      t: nums[3],
      Ac: global.approxAreaFromWeight(weight),
      W: Number(weight || 0),
      Ix: null, Iy: null, Zx: null, Zy: null, ix: null, iy: null
    };
  }

  function buildSpecsFromSteelKinds(kinds, parser) {
    var steelApi = global.Toriai && global.Toriai.data && global.Toriai.data.steel;
    return kinds.reduce(function(all, kind) {
      var rows = steelApi && typeof steelApi.getRowsByKind === 'function'
        ? steelApi.getRowsByKind(kind)
        : (typeof global.getSteelRowsForKind === 'function' ? global.getSteelRowsForKind(kind) : []);
      rows.forEach(function(row) {
        var parsed = parser(row[0], row[1]);
        if (parsed) all.push(parsed);
      });
      return all;
    }, []);
  }

  global.parseRectPipeSpec = parseRectPipeSpec;
  global.parseCShapeSpec = parseCShapeSpec;
  global.buildSpecsFromSteelKinds = buildSpecsFromSteelKinds;
})(window);
