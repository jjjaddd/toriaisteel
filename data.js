/* ================================================================
   data.js  - データタブ 断面図ビューア
   ================================================================ */

/* ── 断面寸法・性能データ（JIS G 3192） ── */
const SECTION_DATA = {
  'H形鋼': {
    type: 'H',
    label: 'H形鋼',
    jis: 'JIS G 3192',
    jisSub: 'Hot-rolled H beams',
    specs: [
      { name:'H-100×50',  H:100, B:50,  t1:5, t2:7, r:8, Ac:11.85, W:9.30,  Ix:187,  Iy:14.8, Zx:37.5, Zy:5.91, ix:3.98, iy:1.12 },
      { name:'H-100×100', H:100, B:100, t1:6, t2:8, r:8, Ac:21.59, W:16.9,  Ix:378,  Iy:134,  Zx:75.6, Zy:26.7, ix:4.18, iy:2.49 },
    ]
  }
};

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
      <div class="dp-jis-badge">${kindData.jis}</div>
      <div class="dp-spec-name">${spec.name}</div>
      <div class="dp-spec-sub">${kindData.jisSub}</div>`;
  }

  // SVG断面図（H形鋼）
  const svgEl = document.getElementById('dataSVGWrap');
  if (svgEl) {
    svgEl.innerHTML = drawHBeamSVG(spec.H, spec.B, spec.t1, spec.t2, spec.r, 260, 210);
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
}

/* スペック選択 */
function dataSelectSpec(idx) {
  _dataSpecIdx = idx;
  renderDataSpec();
}

