/* ================================================================
   sectionDefinitions.js
   - SECTION_DATA / STEEL_DB / DEFAULT_STOCK_DB の集約
   - 鋼種データの正本は src/data/steel/<kind>/specs.js
   - 各種 lookup helper（getCalcKindName / getCalcEnabledKinds /
     getDefaultStockLengths / getSteelRowsForKind 等）も提供
   ================================================================ */

function getSteelSpecsFromData(providerKey, globalArrayKey) {
  var steelNs = window.Toriai && window.Toriai.data && window.Toriai.data.steel;
  var provider = steelNs && steelNs[providerKey];
  if (provider && typeof provider.getAllSpecs === 'function') return provider.getAllSpecs();
  var globalSpecs = globalArrayKey ? window[globalArrayKey] : null;
  if (Array.isArray(globalSpecs)) return globalSpecs.slice();
  return [];
}

/* ── 断面寸法・性能データ（JIS G 3192） ──
   各鋼種の specs は src/data/steel/<kind>/specs.js が正本。
   getSteelSpecsFromData(provider, globalKey) で取り込む。 */

const SECTION_DATA = {
  'H形鋼': {
    type: 'H',
    showInCalc: true,
    label: 'H形鋼',
    jis: 'JIS G 3192',
    jisSub: 'Hot-rolled H beams',
    specs: getSteelSpecsFromData('hBeam', 'H_SHAPES_JIS_ALL')
  }
};


SECTION_DATA['山形鋼'] = {
  type: 'L',
  showInCalc: true,
  calcKey: '等辺山形鋼',
  label: '等辺山形鋼',
  jis: 'JIS G 3192',
  jisSub: 'Equal leg angles',
  specs: getSteelSpecsFromData('equalAngle', 'EQUAL_ANGLE_SPECS')
};

SECTION_DATA['不等辺山形鋼'] = {
  type: 'LU',
  showInCalc: true,
  label: '不等辺山形鋼',
  jis: 'JIS G 3192',
  jisSub: 'Unequal leg angles',
  specs: getSteelSpecsFromData('unequalAngle', 'UNEQUAL_ANGLE_SPECS')
};

SECTION_DATA['不等辺不等厚山形鋼'] = {
  type: 'LUT',
  showInCalc: true,
  label: '不等辺不等厚山形鋼',
  jis: 'JIS G 3192',
  jisSub: 'Unequal leg and unequal thickness angles',
  specs: getSteelSpecsFromData('unequalUnequalAngle', 'UNEQUAL_UNEQUAL_ANGLE_SPECS')
};

SECTION_DATA['平鋼'] = {
  type: 'FL',
  showInCalc: true,
  label: '平鋼',
  jis: 'JIS G 3194',
  jisSub: 'Hot rolled flat steel',
  specs: getSteelSpecsFromData('flatBar', 'FLAT_BAR_SPECS')
};

SECTION_DATA['溝形鋼'] = {
  type: 'C',
  showInCalc: true,
  label: '溝形鋼',
  jis: 'JIS G 3192',
  jisSub: 'Hot-rolled steel channels',
  specs: getSteelSpecsFromData('channel', 'CHANNEL_SPECS')
};

SECTION_DATA['C形鋼'] = {
  type: 'C_LIGHT',
  showInCalc: true,
  label: 'C形鋼（リップ溝形鋼）',
  jis: 'JIS G 3350',
  jisSub: 'Light gauge steel C-channel',
  specs: getSteelSpecsFromData('cShape', 'C_SHAPE_SPECS')
};

SECTION_DATA['軽量溝形鋼'] = {
  type: 'LGC',
  showInCalc: true,
  label: '軽量溝形鋼',
  jis: 'JIS G 3350',
  jisSub: 'Light gauge steel channel',
  specs: getSteelSpecsFromData('lightChannel', 'LIGHT_CHANNEL_SPECS')
};

SECTION_DATA['I形鋼'] = {
  type: 'I',
  showInCalc: true,
  label: 'I形鋼',
  jis: 'JIS G 3192',
  jisSub: 'Hot-rolled steel I-beams',
  specs: getSteelSpecsFromData('iBeam', 'I_BEAM_SPECS')
};

SECTION_DATA['丸鋼'] = {
  type: 'RB',
  showInCalc: true,
  label: '丸鋼',
  jis: 'JIS G 3191',
  jisSub: 'Hot-rolled steel bar - Round bar',
  specs: getSteelSpecsFromData('roundBar', 'ROUND_BAR_SPECS')
};

SECTION_DATA['角鋼'] = {
  type: 'SB',
  showInCalc: true,
  label: '角鋼',
  jis: 'JIS G 3191',
  jisSub: 'Hot-rolled steel bar - Square bar',
  specs: getSteelSpecsFromData('squareBar', 'SQUARE_BAR_SPECS')
};

SECTION_DATA['角パイプ'] = {
  type: 'SQUARE_PIPE',
  showInCalc: true,
  label: '角パイプ',
  jis: 'JIS G 3466',
  jisSub: 'Square/Rectangular steel tube',
  specs: getSteelSpecsFromData('squarePipe', 'SQUARE_PIPE_SPECS')
};

SECTION_DATA['スモール角パイプ'] = {
  type: 'SQUARE_PIPE',
  showInCalc: true,
  label: 'スモール・スーパー角パイプ',
  jis: '',
  jisSub: 'Small/Super square & rectangular steel tube',
  specs: getSteelSpecsFromData('smallSquarePipe', 'SMALL_SQUARE_PIPE_SPECS')
};

SECTION_DATA['SGP配管'] = {
  type: 'PIPE',
  showInCalc: true,
  label: '配管用炭素鋼鋼管（SGP）',
  jis: 'JIS G 3452',
  jisSub: 'Carbon steel pipe for ordinary piping',
  specs: getSteelSpecsFromData('pipe', 'PIPE_SPECS')
};

SECTION_DATA['BCR295'] = {
  type: 'BCR',
  showInCalc: true,
  label: 'BCR295',
  jis: 'BCP 235',
  jisSub: 'Cold roll formed square steel tube',
  specs: getSteelSpecsFromData('bcr295', 'BCR295_SPECS')
};

// ===== 鋼材DB共通定義 =====
// data.js を鋼材データの唯一のソースに寄せるための中間レイヤー。
// 既存コードは当面 SECTION_DATA / STEEL の両方を参照するため、
// ここでは「新しい取得API」を追加しつつ旧互換も維持する。
const STEEL_DB = SECTION_DATA;
window.SECTION_DATA = SECTION_DATA;
if (window.Toriai && window.Toriai.data && window.Toriai.data.steel) {
  window.Toriai.data.steel._sectionData = SECTION_DATA;
}

const DEFAULT_STOCK_DB = {
  common: [5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000],
  byKind: {
    // H形鋼は現行仕様どおり 5.5m を初期候補から外す
    'H形鋼': { exclude: [5500] }

    /* ⬇ ここに鋼種ごとの初期定尺を追加 ⬇
    ,'SGP配管': { lengths: [4000, 5500, 6000] }
    ,'BCR295': { lengths: [6000, 9000, 12000] }
    */
  }
};
window.DEFAULT_STOCK_DB = DEFAULT_STOCK_DB;

function getCalcKindName(kind) {
  var steelApi = window.Toriai && window.Toriai.data && window.Toriai.data.steel;
  if (steelApi && typeof steelApi.getCalcKindName === 'function') {
    return steelApi.getCalcKindName(kind);
  }
  var entry = STEEL_DB[kind];
  return entry && entry.calcKey ? entry.calcKey : kind;
}

function getDataKindByCalcName(kind) {
  var steelApi = window.Toriai && window.Toriai.data && window.Toriai.data.steel;
  if (steelApi && typeof steelApi.getDataKindByCalcName === 'function') {
    return steelApi.getDataKindByCalcName(kind);
  }
  if (STEEL_DB[kind]) return kind;
  var keys = Object.keys(STEEL_DB);
  for (var i = 0; i < keys.length; i++) {
    if (getCalcKindName(keys[i]) === kind) return keys[i];
  }
  return kind;
}

function getCalcEnabledSpecs(kind) {
  var steelApi = window.Toriai && window.Toriai.data && window.Toriai.data.steel;
  if (steelApi && typeof steelApi.getCalcEnabledSpecs === 'function') {
    return steelApi.getCalcEnabledSpecs(kind);
  }
  var entry = STEEL_DB[kind];
  if (!entry || !Array.isArray(entry.specs)) return [];
  return entry.specs.filter(function(spec) {
    if (spec.inCalc === false) return false;
    return spec.W != null && spec.W > 0;
  });
}

function getCalcEnabledKinds() {
  var steelApi = window.Toriai && window.Toriai.data && window.Toriai.data.steel;
  if (steelApi && typeof steelApi.getCalcEnabledKinds === 'function') {
    return steelApi.getCalcEnabledKinds();
  }
  return getDataKindOrder().filter(function(kind) {
    var entry = STEEL_DB[kind];
    return !!(entry && entry.showInCalc && getCalcEnabledSpecs(kind).length);
  });
}

function getDefaultStockLengths(kind, spec) {
  var steelApi = window.Toriai && window.Toriai.data && window.Toriai.data.steel;
  if (steelApi && typeof steelApi.getStockLengthsByType === 'function') {
    var registryLengths = steelApi.getStockLengthsByType(kind, spec);
    if (Array.isArray(registryLengths) && registryLengths.length) {
      return registryLengths.slice();
    }
  }

  var entry = STEEL_DB[kind] || {};
  var specs = Array.isArray(entry.specs) ? entry.specs : [];
  var specEntry = specs.find(function(item) { return item.name === spec; }) || null;

  if (specEntry && Array.isArray(specEntry.defaultStock) && specEntry.defaultStock.length) {
    return specEntry.defaultStock.slice();
  }

  var base = DEFAULT_STOCK_DB.common.slice();
  var policy = DEFAULT_STOCK_DB.byKind[kind] || {};
  var activePolicy = entry.defaultStockPolicy || policy;

  if (Array.isArray(activePolicy.lengths) && activePolicy.lengths.length) {
    base = activePolicy.lengths.slice();
  }
  if (Array.isArray(activePolicy.exclude) && activePolicy.exclude.length) {
    base = base.filter(function(len) {
      return activePolicy.exclude.indexOf(len) === -1;
    });
  }

  return base;
}

function getSteelRowsForKind(kind) {
  var steelApi = window.Toriai && window.Toriai.data && window.Toriai.data.steel;
  if (steelApi && typeof steelApi.getRowsByKind === 'function') {
    return steelApi.getRowsByKind(kind);
  }
  return getCalcEnabledSpecs(kind).map(function(spec) {
    return [spec.name, spec.W];
  });
}

function getSteelRow(kind, specName) {
  var rows = getSteelRowsForKind(kind);
  return rows.find(function(row) { return row[0] === specName; }) || null;
}

// 塗装面積計算は src/calculation/section/paintArea.js に分離
// (calcUnitWeightFromArea / calcHPaintAreaPerMeter / calcChannelPaintAreaPerMeter /
//  calcLAnglePaintAreaPerMeter / calcRoundBarPaintAreaPerMeter / calcSquareBarPaintAreaPerMeter /
//  calcLightCChannelPaintAreaPerMeter / calcSquarePipePaintAreaPerMeter /
//  calcPipePaintAreaPerMeter / approxAreaFromWeight)

function parseRectPipeSpec(name, weight) {
  var nums = (String(name || '').match(/[\d.]+/g) || []).map(Number);
  if (nums.length < 3) return null;
  return {
    name: String(name),
    H: nums[0],
    B: nums[1],
    t: nums[2],
    Ac: approxAreaFromWeight(weight),
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
    Ac: approxAreaFromWeight(weight),
    W: Number(weight || 0),
    Ix: null, Iy: null, Zx: null, Zy: null, ix: null, iy: null
  };
}

function buildSpecsFromSteelKinds(kinds, parser) {
  var steelApi = window.Toriai && window.Toriai.data && window.Toriai.data.steel;
  return kinds.reduce(function(all, kind) {
    var rows = steelApi && typeof steelApi.getRowsByKind === 'function'
      ? steelApi.getRowsByKind(kind)
      : (typeof getSteelRowsForKind === 'function' ? getSteelRowsForKind(kind) : []);
    rows.forEach(function(row) {
      var parsed = parser(row[0], row[1]);
      if (parsed) all.push(parsed);
    });
    return all;
  }, []);
}

