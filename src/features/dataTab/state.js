

/* ── データページ初期化 ── */
let _dataKind = 'H形鋼';
let _dataSpecIdx = 0;
let _dataSpecDropdownOpen = false;
let _dataSpecFiltered = [];

function getDataKindOrder() {
  const preferred = ['H形鋼', '山形鋼', '不等辺山形鋼', '不等辺不等厚山形鋼', '溝形鋼', 'C形鋼', '軽量溝形鋼', 'I形鋼', '平鋼', '丸鋼', '角鋼', '角パイプ', 'スモール角パイプ', 'BCR295', 'SGP配管', '丸パイプ'];
  const keys = Object.keys(SECTION_DATA);
  const ordered = preferred.filter(function(kind) { return keys.indexOf(kind) >= 0; });
  keys.forEach(function(kind) {
    if (ordered.indexOf(kind) < 0) ordered.push(kind);
  });
  return ordered;
}

function getDataSpecNumbers(name) {
  return String(name || '').match(/[\d.]+/g) || [];
}

function compareDataSpecs(a, b) {
  const an = getDataSpecNumbers(a.name);
  const bn = getDataSpecNumbers(b.name);
  const len = Math.max(an.length, bn.length);
  for (let i = 0; i < len; i++) {
    const av = an[i] == null ? -Infinity : parseFloat(an[i]);
    const bv = bn[i] == null ? -Infinity : parseFloat(bn[i]);
    if (av !== bv) return av - bv;
  }
  return String(a.name || '').localeCompare(String(b.name || ''), 'ja');
}

function getSortedSpecsForKind(kind) {
  const kindData = SECTION_DATA[kind];
  if (!kindData || !Array.isArray(kindData.specs)) return [];
  return kindData.specs
    .map(function(spec, index) {
      return { kind: kind, index: index, name: spec.name, spec: spec };
    })
    .sort(compareDataSpecs);
}

function normalizeDataSpecText(value) {
  return String(value || '')
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, function(ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 65248);
    })
    .replace(/×/g, 'x')
    .replace(/\s+/g, '')
    .toLowerCase();
}
