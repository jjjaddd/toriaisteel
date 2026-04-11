/* ================================================================
   data.js  - データタブ 断面図ビューア
   ================================================================ */

/* ── 断面寸法・性能データ（JIS G 3192） ── */
const H_SHAPES_JIS = [
  { name:'H-100×50×5×7', H:100, B:50, t1:5, t2:7, r:8, Ac:11.85, W:9.30, Ix:187, Iy:14.8, Zx:37.5, Zy:5.91, ix:3.98, iy:1.12 },
  { name:'H-100×100×6×8', H:100, B:100, t1:6, t2:8, r:8, Ac:21.59, W:16.9, Ix:378, Iy:134, Zx:75.6, Zy:26.7, ix:4.18, iy:2.49 },
  { name:'H-125×60×6×8', H:125, B:60, t1:6, t2:8, r:8, Ac:16.69, W:13.1, Ix:409, Iy:29.1, Zx:65.5, Zy:9.71, ix:4.95, iy:1.32 },
  { name:'H-125×125×6.5×9', H:125, B:125, t1:6.5, t2:9, r:8, Ac:30.00, W:23.6, Ix:839, Iy:293, Zx:134, Zy:46.9, ix:5.29, iy:3.13 },
  { name:'H-150×75×5×7', H:150, B:75, t1:5, t2:7, r:8, Ac:17.85, W:14.0, Ix:666, Iy:49.5, Zx:88.8, Zy:13.2, ix:6.11, iy:1.66 },
  { name:'H-148×100×6×9', H:148, B:100, t1:6, t2:9, r:8, Ac:26.35, W:20.7, Ix:1000, Iy:150, Zx:135, Zy:30.1, ix:6.17, iy:2.39 },
  { name:'H-150×150×7×10', H:150, B:150, t1:7, t2:10, r:8, Ac:39.65, W:31.1, Ix:1620, Iy:563, Zx:216, Zy:75.1, ix:6.40, iy:3.77 },
  { name:'H-175×90×5×8', H:175, B:90, t1:5, t2:8, r:8, Ac:22.90, W:18.0, Ix:1210, Iy:97.5, Zx:138, Zy:21.7, ix:7.26, iy:2.06 },
  { name:'H-175×175×7.5×11', H:175, B:175, t1:7.5, t2:11, r:13, Ac:51.43, W:40.4, Ix:2900, Iy:984, Zx:331, Zy:112, ix:7.50, iy:4.37 },
  { name:'H-198×99×4.5×7', H:198, B:99, t1:4.5, t2:7, r:8, Ac:22.69, W:17.8, Ix:1540, Iy:113, Zx:156, Zy:22.9, ix:8.25, iy:2.24 },
  { name:'H-200×100×5.5×8', H:200, B:100, t1:5.5, t2:8, r:8, Ac:26.67, W:20.9, Ix:1810, Iy:134, Zx:181, Zy:26.7, ix:8.23, iy:2.24 },
  { name:'H-194×150×6×9', H:194, B:150, t1:6, t2:9, r:8, Ac:38.11, W:29.9, Ix:2630, Iy:507, Zx:271, Zy:67.6, ix:8.30, iy:3.65 },
  { name:'H-200×200×8×12', H:200, B:200, t1:8, t2:12, r:13, Ac:63.53, W:49.9, Ix:4720, Iy:1600, Zx:472, Zy:160, ix:8.62, iy:5.02 },
  { name:'H-248×124×5×8', H:248, B:124, t1:5, t2:8, r:8, Ac:31.99, W:25.1, Ix:3450, Iy:255, Zx:278, Zy:41.1, ix:10.4, iy:2.82 },
  { name:'H-250×125×6×9', H:250, B:125, t1:6, t2:9, r:8, Ac:36.97, W:29.0, Ix:3960, Iy:294, Zx:317, Zy:47.0, ix:10.4, iy:2.82 },
  { name:'H-244×175×7×11', H:244, B:175, t1:7, t2:11, r:13, Ac:55.49, W:43.6, Ix:6040, Iy:984, Zx:495, Zy:112, ix:10.4, iy:4.21 },
  { name:'H-250×250×9×14', H:250, B:250, t1:9, t2:14, r:13, Ac:91.43, W:71.8, Ix:10700, Iy:3650, Zx:860, Zy:292, ix:10.8, iy:6.32 },
  { name:'H-300×150×6.5×9', H:300, B:150, t1:6.5, t2:9, r:13, Ac:46.78, W:36.7, Ix:7210, Iy:508, Zx:481, Zy:67.7, ix:12.4, iy:3.29 },
  { name:'H-300×300×10×15', H:300, B:300, t1:10, t2:15, r:13, Ac:118.5, W:93.0, Ix:20200, Iy:6750, Zx:1350, Zy:450, ix:13.1, iy:7.55 },
  { name:'H-350×175×7×11', H:350, B:175, t1:7, t2:11, r:13, Ac:62.91, W:49.4, Ix:13500, Iy:984, Zx:771, Zy:112, ix:14.6, iy:3.96 },
  { name:'H-350×350×12×19', H:350, B:350, t1:12, t2:19, r:13, Ac:171.9, W:135, Ix:39800, Iy:13600, Zx:2280, Zy:776, ix:15.2, iy:8.89 }
];

const H_SHAPES_JIS_ADD_2 = [
  { name:'H-400×200×8×13', H:400, B:200, t1:8, t2:13, r:13, Ac:82.97, W:65.1, Ix:28100, Iy:1580, Zx:1840, Zy:159, ix:18.4, iy:4.36 },
  { name:'H-400×200×9×14', H:400, B:200, t1:9, t2:14, r:13, Ac:95.43, W:74.9, Ix:32900, Iy:1870, Zx:1860, Zy:187, ix:18.6, iy:4.43 },
  { name:'H-440×300×11×18', H:440, B:300, t1:11, t2:18, r:13, Ac:153.9, W:121, Ix:54700, Iy:8110, Zx:2490, Zy:540, ix:18.9, iy:7.26 },
  { name:'H-496×199×9×14', H:496, B:199, t1:9, t2:14, r:13, Ac:99.29, W:77.9, Ix:40800, Iy:1840, Zx:2030, Zy:185, ix:20.3, iy:4.31 },
  { name:'H-500×200×10×16', H:500, B:200, t1:10, t2:16, r:13, Ac:112.3, W:88.2, Ix:46800, Iy:2140, Zx:2040, Zy:214, ix:20.4, iy:4.36 },
  { name:'H-482×300×11×15', H:482, B:300, t1:11, t2:15, r:13, Ac:141.2, W:111, Ix:58300, Iy:6760, Zx:2030, Zy:450, ix:20.3, iy:6.92 },
  { name:'H-488×300×11×18', H:488, B:300, t1:11, t2:18, r:13, Ac:159.2, W:125, Ix:68900, Iy:8110, Zx:2080, Zy:714, ix:20.8, iy:7.14 },
  { name:'H-596×199×10×15', H:596, B:199, t1:10, t2:15, r:13, Ac:117.8, W:92.5, Ix:98000, Iy:2380, Zx:2300, Zy:238, ix:23.0, iy:4.10 }
];

const SECTION_DATA = {
  'H形鋼': {
    type: 'H',
    label: 'H形鋼',
    jis: 'JIS G 3192',
    jisSub: 'Hot-rolled H beams',
    specs: []
  }
};

SECTION_DATA['H形鋼'].specs = [
  ...H_SHAPES_JIS,
  ...H_SHAPES_JIS_ADD_2
];


SECTION_DATA['山形鋼'] = {
  type: 'L',
  label: '等辺山形鋼',
  jis: 'JIS G 3192',
  jisSub: 'Equal leg angles',
  specs: [
    { name:'L-25×25×3',    A:25,  B:25,  t:3,  r1:4,  r2:2, Ac:1.43,  W:1.12,  Cx:0.719, Cy:0.719, Ix:0.797, Iy:0.797, Iu:1.26, Iv:0.33, ix:0.747, iy:0.747, iu:0.940, iv:0.483, Zx:0.448, Zy:0.448 },
    { name:'L-30×30×3',    A:30,  B:30,  t:3,  r1:4,  r2:2, Ac:1.74,  W:1.37,  Cx:0.835, Cy:0.835, Ix:1.40,  Iy:1.40,  Zx:0.650, Zy:0.650, ix:0.898, iy:0.898 },
    { name:'L-40×40×3',    A:40,  B:40,  t:3,  r1:4,  r2:2, Ac:2.35,  W:1.85,  Cx:1.07,  Cy:1.07,  Ix:3.41,  Iy:3.41,  Zx:1.17,  Zy:1.17,  ix:1.21,  iy:1.21  },
    { name:'L-40×40×5',    A:40,  B:40,  t:5,  r1:4,  r2:2, Ac:3.79,  W:2.98,  Cx:1.18,  Cy:1.18,  Ix:5.24,  Iy:5.24,  Zx:1.85,  Zy:1.85,  ix:1.18,  iy:1.18  },
    { name:'L-50×50×4',    A:50,  B:50,  t:4,  r1:5,  r2:3, Ac:3.89,  W:3.06,  Cx:1.33,  Cy:1.33,  Ix:8.46,  Iy:8.46,  Zx:2.33,  Zy:2.33,  ix:1.47,  iy:1.47  },
    { name:'L-50×50×6',    A:50,  B:50,  t:6,  r1:5,  r2:3, Ac:5.69,  W:4.47,  Cx:1.44,  Cy:1.44,  Ix:11.9,  Iy:11.9,  Zx:3.36,  Zy:3.36,  ix:1.44,  iy:1.44  },
    { name:'L-65×65×6',    A:65,  B:65,  t:6,  r1:6,  r2:4, Ac:7.53,  W:5.91,  Cx:1.82,  Cy:1.82,  Ix:26.2,  Iy:26.2,  Zx:5.69,  Zy:5.69,  ix:1.86,  iy:1.86  },
    { name:'L-75×75×6',    A:75,  B:75,  t:6,  r1:7,  r2:4, Ac:8.74,  W:6.86,  Cx:2.07,  Cy:2.07,  Ix:41.2,  Iy:41.2,  Zx:7.62,  Zy:7.62,  ix:2.17,  iy:2.17  },
    { name:'L-75×75×9',    A:75,  B:75,  t:9,  r1:7,  r2:4, Ac:12.8,  W:10.1,  Cx:2.20,  Cy:2.20,  Ix:58.4,  Iy:58.4,  Zx:11.1,  Zy:11.1,  ix:2.13,  iy:2.13  },
    { name:'L-90×90×7',    A:90,  B:90,  t:7,  r1:8,  r2:5, Ac:12.2,  W:9.61,  Cx:2.44,  Cy:2.44,  Ix:84.8,  Iy:84.8,  Zx:13.3,  Zy:13.3,  ix:2.64,  iy:2.64  },
    { name:'L-100×100×7',  A:100, B:100, t:7,  r1:9,  r2:6, Ac:13.7,  W:10.7,  Cx:2.68,  Cy:2.68,  Ix:131,   Iy:131,   Zx:18.3,  Zy:18.3,  ix:3.09,  iy:3.09  },
    { name:'L-100×100×10', A:100, B:100, t:10, r1:9,  r2:6, Ac:19.2,  W:15.1,  Cx:2.84,  Cy:2.84,  Ix:179,   Iy:179,   Zx:25.5,  Zy:25.5,  ix:3.05,  iy:3.05  },
    { name:'L-130×130×9',  A:130, B:130, t:9,  r1:10, r2:7, Ac:22.7,  W:17.8,  Cx:3.47,  Cy:3.47,  Ix:449,   Iy:449,   Zx:48.0,  Zy:48.0,  ix:4.45,  iy:4.45  },
    { name:'L-150×150×12', A:150, B:150, t:12, r1:12, r2:8, Ac:35.0,  W:27.5,  Cx:4.09,  Cy:4.09,  Ix:874,   Iy:874,   Zx:82.8,  Zy:82.8,  ix:4.99,  iy:4.99  }
  ]
};

SECTION_DATA['平鋼'] = {
  type: 'FL',
  label: '平鋼',
  jis: 'JIS G 3101',
  jisSub: 'Flat bar',
  specs: [
    { name:'FB-4.5×25', t:4.5, B:25, Ac:1.125, W:0.88, Ix:0.019, Iy:0.586, ix:0.130, iy:0.722, Zx:0.084, Zy:0.469 },
    { name:'FB-4.5×32', t:4.5, B:32, Ac:1.440, W:1.13, Ix:0.024, Iy:1.229, ix:0.130, iy:0.924, Zx:0.108, Zy:0.768 }
  ]
};

SECTION_DATA['中径角パイプ'] = {
  type: 'BOX',
  label: '中径角パイプ',
  jis: 'STKR',
  jisSub: 'Rectangular hollow section',
  specs: buildSpecsFromSteelKinds(
    ['中径角パイプ（正方形）', '中径角パイプ（長方形）', 'エコノミー角'],
    parseRectPipeSpec
  )
};

SECTION_DATA['スモール角パイプ'] = {
  type: 'BOX',
  label: 'スモール角パイプ',
  jis: 'STKR',
  jisSub: 'Small rectangular hollow section',
  specs: buildSpecsFromSteelKinds(
    ['スモール角パイプ（正方形）', 'スモール角パイプ（長方形）', 'スーパー角パイプ（正方形）', 'スーパー角パイプ（長方形）'],
    parseRectPipeSpec
  )
};

SECTION_DATA['C形鋼'] = {
  type: 'C',
  label: 'C形鋼',
  jis: 'Light gauge steel',
  jisSub: 'Cold-formed C section',
  specs: buildSpecsFromSteelKinds(['C形鋼'], parseCShapeSpec)
};

function calcUnitWeightFromArea(Ac){
  return typeof jisRound === 'function'
    ? jisRound(Ac * 0.785, 2)
    : +(Ac * 0.785).toFixed(2);
}

function calcHPaintAreaPerMeter(s){
  const P = 4*s.B + 2*s.H - 2*s.t1 + (2*Math.PI*s.r) - (8*s.r);
  return +(P/1000).toFixed(3);
}

function calcLAnglePaintAreaPerMeter(spec) {
  var A = Number(spec.A || 0);
  var B = Number(spec.B || 0);
  var t = Number(spec.t || 0);
  var perimeterMm = (2 * A) + (2 * B) - (2 * t);
  return +(perimeterMm / 1000).toFixed(3);
}

function approxAreaFromWeight(weight) {
  return +(Number(weight || 0) / 0.785).toFixed(3);
}

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
  if (typeof STEEL !== 'object' || !STEEL) return [];
  return kinds.reduce(function(all, kind) {
    var rows = Array.isArray(STEEL[kind]) ? STEEL[kind] : [];
    rows.forEach(function(row) {
      var parsed = parser(row[0], row[1]);
      if (parsed) all.push(parsed);
    });
    return all;
  }, []);
}

function drawRectPipeSVG(H, B, t, viewW, viewH) {
  const margin = 28;
  const scale = Math.min((viewW - margin * 2) / B, (viewH - margin * 2) / H);
  const w = B * scale;
  const h = H * scale;
  const th = Math.max(2, t * scale);
  const x = (viewW - w) / 2;
  const y = (viewH - h) / 2;
  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>
    <rect x="${x + th}" y="${y + th}" width="${Math.max(0, w - th * 2)}" height="${Math.max(0, h - th * 2)}" fill="#fff" stroke="#1d4ed8" stroke-width="1.5"/>
  </svg>`;
}

function drawCChannelSVG(H, B, L, t, viewW, viewH) {
  const margin = 28;
  const scale = Math.min((viewW - margin * 2) / Math.max(B + L, 1), (viewH - margin * 2) / H);
  const h = H * scale;
  const b = B * scale;
  const lip = L * scale;
  const th = Math.max(2, t * scale);
  const x = (viewW - (b + lip)) / 2;
  const y = (viewH - h) / 2;
  const path = [
    `M ${x + lip} ${y}`,
    `L ${x + lip + b} ${y}`,
    `L ${x + lip + b} ${y + th}`,
    `L ${x + lip + th} ${y + th}`,
    `L ${x + lip + th} ${y + h - th}`,
    `L ${x + lip + b} ${y + h - th}`,
    `L ${x + lip + b} ${y + h}`,
    `L ${x + lip} ${y + h}`,
    `L ${x + lip} ${y + h - th}`,
    `L ${x + th} ${y + h - th}`,
    `L ${x + th} ${y + h - lip}`,
    `L ${x} ${y + h - lip}`,
    `L ${x} ${y + lip}`,
    `L ${x + th} ${y + lip}`,
    `L ${x + th} ${y + th}`,
    `L ${x + lip} ${y + th}`,
    `Z`
  ].join(' ');
  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <path d="${path}" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2" stroke-linejoin="round"/>
  </svg>`;
}


/* ── H形鋼 断面SVG生成 ──
   H=全高, B=フランジ幅, t1=ウェブ厚, t2=フランジ厚, r=フィレット半径 (mm)
   全フィレット sweep=0（凹フィレット）
*/
function drawHBeamSVG(H, B, t1, t2, r, viewW, viewH) {
  const margin = 36;
  const sc = Math.min((viewW - margin*2)/B, (viewH - margin*2)/H);
  const h=H*sc, b=B*sc, w=t1*sc, f=t2*sc, rr=r*sc;
  const cx=viewW/2, cy=viewH/2;
  const fl=cx-b/2, fr=cx+b/2, wl=cx-w/2, wr=cx+w/2;
  const uft=cy-h/2, ufb=uft+f, lft=cy+h/2-f, lfb=cy+h/2;

  const path=[
    `M ${fl} ${uft}`,`L ${fr} ${uft}`,`L ${fr} ${ufb}`,
    `L ${wr+rr} ${ufb}`,`A ${rr} ${rr} 0 0 0 ${wr} ${ufb+rr}`,
    `L ${wr} ${lft-rr}`,`A ${rr} ${rr} 0 0 0 ${wr+rr} ${lft}`,
    `L ${fr} ${lft}`,`L ${fr} ${lfb}`,`L ${fl} ${lfb}`,
    `L ${fl} ${lft}`,`L ${wl-rr} ${lft}`,
    `A ${rr} ${rr} 0 0 0 ${wl} ${lft-rr}`,
    `L ${wl} ${ufb+rr}`,`A ${rr} ${rr} 0 0 0 ${wl-rr} ${ufb}`,
    `L ${fl} ${ufb}`,`Z`
  ].join(' ');

  const lx=fl-20, by=lfb+18;
  const rHigh=`<path d="M ${wr+rr} ${ufb} A ${rr} ${rr} 0 0 0 ${wr} ${ufb+rr}" fill="none" stroke="#f59e0b" stroke-width="${Math.max(1.5,rr*0.3)}"/>`;
  const rLx=wr+rr+14, rLy=ufb+rr/2;
  const rLine=`<circle cx="${wr+rr}" cy="${ufb+rr}" r="2" fill="#f59e0b"/>
    <line x1="${wr+rr}" y1="${ufb+rr}" x2="${rLx-2}" y2="${rLy}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,2"/>
    <text x="${rLx+1}" y="${rLy}" font-size="9" font-weight="700" fill="#b45309" dominant-baseline="middle">r=${r}</text>`;
  const dimH=`<line x1="${lx}" y1="${uft}" x2="${lx}" y2="${lfb}" stroke="#475569" stroke-width="1"/>
    <line x1="${lx-4}" y1="${uft}" x2="${lx+4}" y2="${uft}" stroke="#475569" stroke-width="1"/>
    <line x1="${lx-4}" y1="${lfb}" x2="${lx+4}" y2="${lfb}" stroke="#475569" stroke-width="1"/>
    <text x="${lx-5}" y="${cy}" font-size="9" font-weight="700" fill="#1d4ed8" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90,${lx-5},${cy})">H=${H}</text>`;
  const dimB=`<line x1="${fl}" y1="${by}" x2="${fr}" y2="${by}" stroke="#475569" stroke-width="1"/>
    <line x1="${fl}" y1="${by-4}" x2="${fl}" y2="${by+4}" stroke="#475569" stroke-width="1"/>
    <line x1="${fr}" y1="${by-4}" x2="${fr}" y2="${by+4}" stroke="#475569" stroke-width="1"/>
    <text x="${cx}" y="${by+10}" font-size="9" font-weight="700" fill="#1d4ed8" text-anchor="middle">B=${B}</text>`;
  const dimT1=`<line x1="${wl}" y1="${cy}" x2="${wr}" y2="${cy}" stroke="#475569" stroke-width="1"/>
    <line x1="${wl}" y1="${cy-4}" x2="${wl}" y2="${cy+4}" stroke="#475569" stroke-width="1"/>
    <line x1="${wr}" y1="${cy-4}" x2="${wr}" y2="${cy+4}" stroke="#475569" stroke-width="1"/>
    <text x="${wr+5}" y="${cy}" font-size="8" fill="#475569" dominant-baseline="middle">t1=${t1}</text>`;
  const tx2=fr+16;
  const dimT2=`<line x1="${tx2}" y1="${uft}" x2="${tx2}" y2="${ufb}" stroke="#475569" stroke-width="1"/>
    <line x1="${tx2-3}" y1="${uft}" x2="${tx2+3}" y2="${uft}" stroke="#475569" stroke-width="1"/>
    <line x1="${tx2-3}" y1="${ufb}" x2="${tx2+3}" y2="${ufb}" stroke="#475569" stroke-width="1"/>
    <text x="${tx2+4}" y="${(uft+ufb)/2}" font-size="8" fill="#475569" dominant-baseline="middle">t2=${t2}</text>`;

  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <path d="${path}" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.5" stroke-linejoin="round"/>
    ${rHigh}${rLine}${dimH}${dimB}${dimT1}${dimT2}
  </svg>`;
}

/* ── 等辺山形鋼（L形鋼）断面SVG生成 ──
   A = 縦辺高さ(mm)、B = 横辺幅(mm)、t = 肉厚(mm)
   r1 = 根元フィレット半径(mm)、r2 = 先端フィレット半径(mm)
   Cx, Cy = 重心位置(cm) ※等辺山形鋼では A=B, Cx=Cy
   ※ r2 は leg先端の「内側2角のみ」に適用（外側は直角）
*/
function drawLAngleSVG(A, B, t, r1, r2, Cx, Cy, viewW, viewH) {
  const mL = 42, mT = 20, mR = 52, mB = 28;
  const sc = Math.min((viewW - mL - mR) / B, (viewH - mT - mB) / A);
  const Ap = A * sc, Bp = B * sc, tp = t * sc;
  const r1p = Math.max(1, r1 * sc);
  const r2p = Math.max(0.5, Math.min(r2 * sc, tp * 0.45));
  const ox = mL, oyt = mT, oyb = mT + Ap;

  const path = [
    `M ${ox} ${oyb}`,
    `L ${ox} ${oyt}`,
    `L ${ox + tp - r2p} ${oyt}`,
    `A ${r2p} ${r2p} 0 0 1 ${ox + tp} ${oyt + r2p}`,
    `L ${ox + tp} ${oyb - tp - r1p}`,
    `A ${r1p} ${r1p} 0 0 0 ${ox + tp + r1p} ${oyb - tp}`,
    `L ${ox + Bp - r2p} ${oyb - tp}`,
    `A ${r2p} ${r2p} 0 0 1 ${ox + Bp} ${oyb - tp + r2p}`,
    `L ${ox + Bp} ${oyb}`,
    `L ${ox} ${oyb}`, `Z`
  ].join(' ');

  const ax = ox - 14, myY = (oyt + oyb) / 2;
  const dimA = `<line x1="${ax}" y1="${oyt}" x2="${ax}" y2="${oyb}" stroke="#475569" stroke-width="1"/>
    <line x1="${ax-4}" y1="${oyt}" x2="${ax+4}" y2="${oyt}" stroke="#475569" stroke-width="1"/>
    <line x1="${ax-4}" y1="${oyb}" x2="${ax+4}" y2="${oyb}" stroke="#475569" stroke-width="1"/>
    <text x="${ax-5}" y="${myY}" font-size="9" font-weight="700" fill="#1d4ed8"
      text-anchor="middle" dominant-baseline="middle"
      transform="rotate(-90,${ax-5},${myY})">A=${A}</text>`;
  const by = oyb + 14;
  const dimB = `<line x1="${ox}" y1="${by}" x2="${ox+Bp}" y2="${by}" stroke="#475569" stroke-width="1"/>
    <line x1="${ox}" y1="${by-4}" x2="${ox}" y2="${by+4}" stroke="#475569" stroke-width="1"/>
    <line x1="${ox+Bp}" y1="${by-4}" x2="${ox+Bp}" y2="${by+4}" stroke="#475569" stroke-width="1"/>
    <text x="${ox+Bp/2}" y="${by+10}" font-size="9" font-weight="700" fill="#1d4ed8" text-anchor="middle">B=${B}</text>`;
  const tx = ox + Bp + 6;
  const dimT = `<line x1="${tx}" y1="${oyb-tp}" x2="${tx}" y2="${oyb}" stroke="#475569" stroke-width="1"/>
    <line x1="${tx-3}" y1="${oyb-tp}" x2="${tx+3}" y2="${oyb-tp}" stroke="#475569" stroke-width="1"/>
    <line x1="${tx-3}" y1="${oyb}" x2="${tx+3}" y2="${oyb}" stroke="#475569" stroke-width="1"/>
    <text x="${tx+4}" y="${oyb-tp/2}" font-size="8" fill="#475569" dominant-baseline="middle">t=${t}</text>`;

  const r1sw = Math.max(1.5, r1p * 0.3);
  const r1High = `<path d="M ${ox+tp} ${oyb-tp-r1p} A ${r1p} ${r1p} 0 0 0 ${ox+tp+r1p} ${oyb-tp}"
    fill="none" stroke="#f59e0b" stroke-width="${r1sw}"/>`;
  const r1dx = ox + tp + r1p, r1dy = oyb - tp - r1p;
  const r1lx = r1dx + 14, r1ly = r1dy - 10;
  const r1Anno = `<circle cx="${r1dx}" cy="${r1dy}" r="2" fill="#f59e0b"/>
    <line x1="${r1dx}" y1="${r1dy}" x2="${r1lx-2}" y2="${r1ly}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,2"/>
    <text x="${r1lx+1}" y="${r1ly}" font-size="9" font-weight="700" fill="#b45309" dominant-baseline="middle">r1=${r1}</text>`;

  const r2sw = Math.max(1.5, r2p * 0.4);
  const r2High = `<path d="M ${ox+tp-r2p} ${oyt} A ${r2p} ${r2p} 0 0 1 ${ox+tp} ${oyt+r2p}"
    fill="none" stroke="#f59e0b" stroke-width="${r2sw}"/>`;
  const r2dx = ox + tp, r2dy = oyt;
  const r2lx = r2dx + r2p + 14, r2ly = r2dy - 2;
  const r2Anno = `<circle cx="${r2dx}" cy="${r2dy}" r="2" fill="#f59e0b"/>
    <line x1="${r2dx}" y1="${r2dy}" x2="${r2lx-2}" y2="${r2ly}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,2"/>
    <text x="${r2lx+1}" y="${r2ly}" font-size="9" font-weight="700" fill="#b45309" dominant-baseline="middle">r2=${r2}</text>`;

  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <path d="${path}" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.5" stroke-linejoin="miter"/>
    ${r1High}${r2High}${r1Anno}${r2Anno}${dimA}${dimB}${dimT}
  </svg>`;
}

function drawFlatBarSVG(t, B, viewW, viewH) {
  const margin = 40;
  const scale = Math.min(
    (viewW - margin * 2) / B,
    (viewH - margin * 2) / t
  );

  const width = B * scale;
  const height = t * scale;

  const x = (viewW - width) / 2;
  const y = (viewH - height) / 2;

  return `
    <svg width="${viewW}" height="${viewH}">
      <rect x="${x}" y="${y}" width="${width}" height="${height}"
        fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>
    </svg>
  `;
}


/* ── データページ初期化 ── */
let _dataKind = 'H形鋼';
let _dataSpecIdx = 0;
let _dataSpecDropdownOpen = false;
let _dataSpecFiltered = [];

function getDataKindOrder() {
  const preferred = ['H形鋼', '山形鋼', 'C形鋼', '中径角パイプ', 'スモール角パイプ', '溝形鋼', '平鋼', '丸鋼', '丸パイプ'];
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

function dataInit() {
  renderDataKindTabs();
  renderDataSpecPicker();
  renderDataSpec();
}

/* 鋼種タブ描画 */
function renderDataKindTabs() {
  const wrap = document.getElementById('dataKindTabs');
  if (!wrap) return;
  const allKinds = getDataKindOrder();
  wrap.innerHTML = allKinds.map(k => {
    const isActive = k === _dataKind;
    return `<button
      class="dk-tab${isActive?' active':''}"
      onclick="dataSelectKind('${k}')"
    >${k}</button>`;
  }).join('');
}

/* 鋼種選択 */
function dataSelectKind(kind) {
  _dataKind = kind;
  _dataSpecIdx = 0;
  renderDataKindTabs();
  renderDataSpecPicker();
  renderDataSpec();
}

function renderDataSpecPicker() {
  const wrap = document.getElementById('dataSpecPicker');
  const kindData = SECTION_DATA[_dataKind];
  if (!wrap || !kindData) return;

  wrap.innerHTML = `
    <div class="data-spec-picker">
      <div class="data-spec-input-wrap">
        <input id="dataSpecInput" type="text" autocomplete="off" placeholder="規格を検索">
        <button type="button" id="dataSpecToggleBtn">▼</button>
      </div>
      <div id="dataSpecDropdown" class="data-spec-dropdown"></div>
    </div>
  `;

  const input = document.getElementById('dataSpecInput');
  const btn = document.getElementById('dataSpecToggleBtn');
  const spec = kindData.specs[_dataSpecIdx];
  if (input && spec) input.value = spec.name;

  if (input) {
    input.onfocus = function() {
      renderDataSpecDropdownList(getSortedSpecsForKind(_dataKind));
      toggleDataSpecDropdown(true);
    };
    input.oninput = function() {
      filterDataSpecOptions(this.value);
      toggleDataSpecDropdown(true);
    };
    input.onkeydown = function(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        toggleDataSpecDropdown(true);
        var first = document.querySelector('#dataSpecDropdown .data-spec-option');
        if (first) first.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (_dataSpecFiltered.length === 1) {
          selectDataSpec(_dataSpecFiltered[0].index, _dataSpecFiltered[0].kind);
        } else {
          toggleDataSpecDropdown(true);
        }
      } else if (e.key === 'Escape') {
        closeDataSpecDropdown();
      }
    };
  }

  if (btn) {
    btn.onclick = function() {
      var wantOpen = !_dataSpecDropdownOpen;
      if (wantOpen) {
        renderDataSpecDropdownList(getSortedSpecsForKind(_dataKind));
      }
      toggleDataSpecDropdown(wantOpen);
      if (wantOpen && input) input.focus();
    };
  }

  const dropdown = document.getElementById('dataSpecDropdown');
  if (dropdown) {
    dropdown.onclick = function(e) {
      var option = e.target.closest('.data-spec-option');
      if (!option) return;
      var index = parseInt(option.getAttribute('data-index'), 10);
      var kind = option.getAttribute('data-kind') || _dataKind;
      if (!isNaN(index)) selectDataSpec(index, kind);
    };
  }

  closeDataSpecDropdown();
}

function toggleDataSpecDropdown(forceOpen) {
  const dd = document.getElementById('dataSpecDropdown');
  if (!dd) return;
  _dataSpecDropdownOpen = typeof forceOpen === 'boolean' ? forceOpen : !_dataSpecDropdownOpen;
  dd.classList.toggle('open', _dataSpecDropdownOpen);
}

function renderDataSpecDropdownList(specs) {
  const dropdown = document.getElementById('dataSpecDropdown');
  if (!dropdown) return;

  if (!specs.length) {
    dropdown.innerHTML = '<div class="data-spec-empty">候補がありません</div>';
    return;
  }

  dropdown.innerHTML = specs.map(function(item) {
    var isActive = item.kind === _dataKind && item.index === _dataSpecIdx;
    return '<div class="data-spec-option' + (isActive ? ' active' : '') + '" data-index="' + item.index + '" data-kind="' + item.kind + '" tabindex="0">' + item.name + '</div>';
  }).join('');
}

function filterDataSpecOptions(keyword) {
  const q = normalizeDataSpecText(keyword);
  const currentSpecs = getSortedSpecsForKind(_dataKind).map(function(item) {
    return { kind: item.kind, index: item.index, name: item.name, norm: normalizeDataSpecText(item.name) };
  });

  if (!q) {
    _dataSpecFiltered = currentSpecs;
  } else {
    _dataSpecFiltered = currentSpecs.filter(function(item) {
      return item.norm.indexOf(q) >= 0;
    });
  }

  renderDataSpecDropdownList(_dataSpecFiltered);

  Array.prototype.forEach.call(document.querySelectorAll('#dataSpecDropdown .data-spec-option'), function(option, idx, all) {
    option.onkeydown = function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectDataSpec(
          parseInt(this.getAttribute('data-index'), 10),
          this.getAttribute('data-kind') || _dataKind
        );
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        var next = all[Math.min(idx + 1, all.length - 1)];
        if (next) next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx === 0) {
          var input = document.getElementById('dataSpecInput');
          if (input) input.focus();
        } else {
          all[idx - 1].focus();
        }
      } else if (e.key === 'Escape') {
        closeDataSpecDropdown();
        var inputEl = document.getElementById('dataSpecInput');
        if (inputEl) inputEl.focus();
      }
    };
  });
}

function closeDataSpecDropdown() {
  const dd = document.getElementById('dataSpecDropdown');
  _dataSpecDropdownOpen = false;
  if (dd) dd.classList.remove('open');
}

document.addEventListener('click', function(e) {
  var picker = document.querySelector('.data-spec-picker');
  if (!picker || !picker.contains(e.target)) {
    closeDataSpecDropdown();
  }
});

/* 断面図・データ描画 */
function renderDataSpec() {
  const kindData = SECTION_DATA[_dataKind];
  if (!kindData) return;
  const spec = kindData.specs[_dataSpecIdx];
  if (!spec) return;

  // JISバッジ + 名称
  const infoEl = document.getElementById('dataSpecInfo');
  if (infoEl) {
    infoEl.innerHTML = `
      <div class="dp-type-badge dp-type-${kindData.type.toLowerCase()}">${kindData.label}</div>
      <div class="dp-jis-badge">${kindData.jis}</div>
      <div class="dp-spec-name">${spec.name}</div>
      <div class="dp-spec-sub">${kindData.jisSub}</div>`;
  }

  // SVG断面図（鋼種タイプに応じて切り替え）
  const svgEl = document.getElementById('dataSVGWrap');
  if (svgEl) {
    if (kindData.type === 'H') {
      svgEl.innerHTML = drawHBeamSVG(spec.H, spec.B, spec.t1, spec.t2, spec.r, 460, 340);
    } else if (kindData.type === 'L') {
      svgEl.innerHTML = drawLAngleSVG(spec.A, spec.B, spec.t, spec.r1, spec.r2, spec.Cx, spec.Cy, 460, 340);
    } else if (kindData.type === 'FL') {
      svgEl.innerHTML = drawFlatBarSVG(spec.t, spec.B, 260, 210);
    } else if (kindData.type === 'BOX') {
      svgEl.innerHTML = drawRectPipeSVG(spec.H, spec.B, spec.t, 460, 340);
    } else if (kindData.type === 'C') {
      svgEl.innerHTML = drawCChannelSVG(spec.H, spec.B, spec.L, spec.t, 460, 340);
    }
  }

  // 断面寸法グリッド
  const dimEl = document.getElementById('dataDimGrid');
  if (dimEl) {
    if (kindData.type === 'H') {
      dimEl.innerHTML = `
        <div class="dp-cell"><span>H</span><strong>${spec.H} mm</strong></div>
        <div class="dp-cell"><span>B</span><strong>${spec.B} mm</strong></div>
        <div class="dp-cell"><span>t1（ウェブ）</span><strong>${spec.t1} mm</strong></div>
        <div class="dp-cell"><span>t2（フランジ）</span><strong>${spec.t2} mm</strong></div>
        <div class="dp-cell dp-r"><span>r（フィレット）</span><strong>${spec.r} mm</strong></div>
        <div class="dp-cell"><span>断面積 A</span><strong>${spec.Ac} cm²</strong></div>`;
    } else if (kindData.type === 'L') {
      dimEl.innerHTML = `
        <div class="dp-cell"><span>A（縦辺）</span><strong>${spec.A} mm</strong></div>
        <div class="dp-cell"><span>B（横辺）</span><strong>${spec.B} mm</strong></div>
        <div class="dp-cell"><span>t（肉厚）</span><strong>${spec.t} mm</strong></div>
        <div class="dp-cell dp-r"><span>r1（根元）</span><strong>${spec.r1} mm</strong></div>
        <div class="dp-cell dp-r"><span>r2（先端）</span><strong>${spec.r2} mm</strong></div>
        <div class="dp-cell"><span>断面積 Ac</span><strong>${spec.Ac} cm²</strong></div>
        <div class="dp-cell"><span>Cx = Cy</span><strong>${spec.Cx} cm</strong></div>`;
    } else if (kindData.type === 'FL') {
      dimEl.innerHTML = `
        <div class="dp-cell"><span>厚さ t</span><strong>${spec.t} mm</strong></div>
        <div class="dp-cell"><span>幅 B</span><strong>${spec.B} mm</strong></div>
        <div class="dp-cell"><span>断面積</span><strong>${spec.Ac} cm²</strong></div>
      `;
    } else if (kindData.type === 'BOX') {
      dimEl.innerHTML = `
        <div class="dp-cell"><span>高さ H</span><strong>${spec.H} mm</strong></div>
        <div class="dp-cell"><span>幅 B</span><strong>${spec.B} mm</strong></div>
        <div class="dp-cell"><span>厚さ t</span><strong>${spec.t} mm</strong></div>
        <div class="dp-cell"><span>断面積 A</span><strong>${spec.Ac} cm²</strong></div>
      `;
    } else if (kindData.type === 'C') {
      dimEl.innerHTML = `
        <div class="dp-cell"><span>高さ H</span><strong>${spec.H} mm</strong></div>
        <div class="dp-cell"><span>幅 B</span><strong>${spec.B} mm</strong></div>
        <div class="dp-cell"><span>リップ</span><strong>${spec.L} mm</strong></div>
        <div class="dp-cell"><span>厚さ t</span><strong>${spec.t} mm</strong></div>
        <div class="dp-cell"><span>断面積 A</span><strong>${spec.Ac} cm²</strong></div>
      `;
    }
  }

  // 断面性能グリッド
  const perfEl = document.getElementById('dataPerfGrid');
  if (perfEl) {
    if (kindData.type === 'BOX' || kindData.type === 'C') {
      perfEl.innerHTML = `
        <div class="dp-cell"><span>Ix</span><strong>—</strong></div>
        <div class="dp-cell"><span>Iy</span><strong>—</strong></div>
        <div class="dp-cell"><span>Zx</span><strong>—</strong></div>
        <div class="dp-cell"><span>Zy</span><strong>—</strong></div>
        <div class="dp-cell"><span>ix</span><strong>—</strong></div>
        <div class="dp-cell"><span>iy</span><strong>—</strong></div>`;
    } else {
      perfEl.innerHTML = `
        <div class="dp-cell"><span>Ix</span><strong>${spec.Ix} cm⁴</strong></div>
        <div class="dp-cell"><span>Iy</span><strong>${spec.Iy} cm⁴</strong></div>
        <div class="dp-cell"><span>Zx</span><strong>${spec.Zx} cm³</strong></div>
        <div class="dp-cell"><span>Zy</span><strong>${spec.Zy} cm³</strong></div>
        <div class="dp-cell"><span>ix</span><strong>${spec.ix} cm</strong></div>
        <div class="dp-cell"><span>iy</span><strong>${spec.iy} cm</strong></div>`;
    }
  }

  // kg/mバー
  const kgmEl = document.getElementById('dataKgmBar');
  if (kgmEl) {
    kgmEl.innerHTML = `<span>単位質量 W</span><strong>${spec.W} kg/m</strong>`;
  }

  const extraEl = document.getElementById('dataExtraInfo');
  if (extraEl) {
    const calcW = calcUnitWeightFromArea(spec.Ac);
    const S = kindData.type === 'L'
      ? calcLAnglePaintAreaPerMeter(spec)
      : (kindData.type === 'H' ? calcHPaintAreaPerMeter(spec) : null);

    extraEl.innerHTML = `
      <div class="dp-box">
        <div>単位重量の計算式</div>
        <strong>${spec.Ac} × 0.785 = ${calcW}</strong>
      </div>
      ${S !== null ? `<div class="dp-box"><div>塗装面積（参考）</div><strong>${S} m²/m</strong></div>` : ''}
    `;
  }

  const input = document.getElementById('dataSpecInput');
  if (input) input.value = spec.name;
  filterDataSpecOptions('');
}

/* スペック選択 */
function selectDataSpec(idx, kind) {
  if (kind && SECTION_DATA[kind]) _dataKind = kind;
  _dataSpecIdx = idx;
  renderDataKindTabs();
  renderDataSpecPicker();
  renderDataSpec();
  closeDataSpecDropdown();
}

function dataSelectSpec(idx) {
  selectDataSpec(idx);
}
