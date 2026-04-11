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

const SECTION_DATA = {
  'H形鋼': {
    type: 'H',
    label: 'H形鋼',
    jis: 'JIS G 3192',
    jisSub: 'Hot-rolled H beams',
    specs: []
  }
};

SECTION_DATA['H形鋼'].specs = H_SHAPES_JIS;

function calcUnitWeightFromArea(Ac){
  return +(Ac * 0.785).toFixed(2);
}

function calcHPaintAreaPerMeter(s){
  const P = 4*s.B + 2*s.H - 2*s.t1 + (2*Math.PI*s.r) - (8*s.r);
  return +(P/1000).toFixed(3);
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

/* ── データページ初期化 ── */
let _dataKind = 'H形鋼';
let _dataSpecIdx = 0;

function dataInit() {
  renderDataKindTabs();
  renderDataSpec();
}

/* 鋼種タブ描画 */
function renderDataKindTabs() {
  const wrap = document.getElementById('dataKindTabs');
  if (!wrap) return;
  const allKinds = ['H形鋼', '山形鋼', '溝形鋼', '平鋼', '丸鋼', '角パイプ', '丸パイプ'];
  const available = Object.keys(SECTION_DATA);
  wrap.innerHTML = allKinds.map(k => {
    const isAvail = available.includes(k);
    const isActive = k === _dataKind;
    return `<button
      class="dk-tab${isActive?' active':''}${!isAvail?' wip':''}"
      onclick="${isAvail ? `dataSelectKind('${k}')` : "alert('このデータは準備中です')"}"
    >${k}${!isAvail ? '<span class="wip-dot">●</span>' : ''}</button>`;
  }).join('');
}

/* 鋼種選択 */
function dataSelectKind(kind) {
  _dataKind = kind;
  _dataSpecIdx = 0;
  renderDataKindTabs();
  renderDataSpec();
}

/* 断面図・データ描画 */
function renderDataSpec() {
  const kindData = SECTION_DATA[_dataKind];
  if (!kindData) return;
  const spec = kindData.specs[_dataSpecIdx];
  if (!spec) return;

  // スペック選択ボタン
  const specSel = document.getElementById('dataSpecSel');
  if (specSel) {
    specSel.innerHTML = kindData.specs.map((s, i) =>
      `<button class="spec-btn${i===_dataSpecIdx?' active':''}" onclick="dataSelectSpec(${i})">${s.name}</button>`
    ).join('');
  }

  // JISバッジ + 名称
  const infoEl = document.getElementById('dataSpecInfo');
  if (infoEl) {
    infoEl.innerHTML = `
      <div class="dp-type-badge dp-type-${kindData.type.toLowerCase()}">${kindData.label}</div>
      <div class="dp-jis-badge">${kindData.jis}</div>
      <div class="dp-spec-name">${spec.name}</div>
      <div class="dp-spec-sub">${kindData.jisSub}</div>`;
  }

  // SVG断面図（H形鋼）
  const svgEl = document.getElementById('dataSVGWrap');
  if (svgEl) {
    svgEl.innerHTML = drawHBeamSVG(spec.H, spec.B, spec.t1, spec.t2, spec.r, 420, 320);
  }

  // 断面寸法グリッド
  const dimEl = document.getElementById('dataDimGrid');
  if (dimEl) {
    dimEl.innerHTML = `
      <div class="dp-cell"><span>H</span><strong>${spec.H} mm</strong></div>
      <div class="dp-cell"><span>B</span><strong>${spec.B} mm</strong></div>
      <div class="dp-cell"><span>t1（ウェブ）</span><strong>${spec.t1} mm</strong></div>
      <div class="dp-cell"><span>t2（フランジ）</span><strong>${spec.t2} mm</strong></div>
      <div class="dp-cell dp-r"><span>r（フィレット）</span><strong>${spec.r} mm</strong></div>
      <div class="dp-cell"><span>断面積 A</span><strong>${spec.Ac} cm²</strong></div>`;
  }

  // 断面性能グリッド
  const perfEl = document.getElementById('dataPerfGrid');
  if (perfEl) {
    perfEl.innerHTML = `
      <div class="dp-cell"><span>Ix</span><strong>${spec.Ix} cm⁴</strong></div>
      <div class="dp-cell"><span>Iy</span><strong>${spec.Iy} cm⁴</strong></div>
      <div class="dp-cell"><span>Zx</span><strong>${spec.Zx} cm³</strong></div>
      <div class="dp-cell"><span>Zy</span><strong>${spec.Zy} cm³</strong></div>
      <div class="dp-cell"><span>ix</span><strong>${spec.ix} cm</strong></div>
      <div class="dp-cell"><span>iy</span><strong>${spec.iy} cm</strong></div>`;
  }

  // kg/mバー
  const kgmEl = document.getElementById('dataKgmBar');
  if (kgmEl) {
    kgmEl.innerHTML = `<span>単位質量 W</span><strong>${spec.W} kg/m</strong>`;
  }

  const extraEl = document.getElementById('dataExtraInfo');
  if (extraEl) {
    const calcW = calcUnitWeightFromArea(spec.Ac);
    const S = calcHPaintAreaPerMeter(spec);

    extraEl.innerHTML = `
      <div class="dp-box">
        <div>単位重量の計算式</div>
        <strong>${spec.Ac} × 0.785 = ${calcW}</strong>
      </div>

      <div class="dp-box">
        <div>塗装面積（参考）</div>
        <strong>${S} m²/m</strong>
      </div>
    `;
  }
}

/* スペック選択 */
function dataSelectSpec(idx) {
  _dataSpecIdx = idx;
  renderDataSpec();
}

