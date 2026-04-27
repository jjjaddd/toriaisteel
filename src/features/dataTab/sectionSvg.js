function drawRectPipeSVG(H, B, t, viewW, viewH) {
  const margin = 28;
  const scale = Math.min((viewW - margin * 2) / B, (viewH - margin * 2) / H);
  const w = B * scale;
  const h = H * scale;
  const th = Math.max(2, t * scale);
  const x = (viewW - w) / 2;
  const y = (viewH - h) / 2;
  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" stroke="#111111" stroke-width="2.5"/>
    <rect x="${x + th}" y="${y + th}" width="${Math.max(0, w - th * 2)}" height="${Math.max(0, h - th * 2)}" fill="#fff" stroke="#111111" stroke-width="1.5"/>
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
    <path d="${path}" fill="#ffffff" stroke="#111111" stroke-width="2.5" stroke-linejoin="round"/>
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
  const rHigh=`<path d="M ${wr+rr} ${ufb} A ${rr} ${rr} 0 0 0 ${wr} ${ufb+rr}" fill="none" stroke="#888888" stroke-width="${Math.max(1.5,rr*0.3)}"/>`;
  const rLx=wr+rr+14, rLy=ufb+rr/2;
  const rLine=`<circle cx="${wr+rr}" cy="${ufb+rr}" r="2" fill="#888888"/>
    <line x1="${wr+rr}" y1="${ufb+rr}" x2="${rLx-2}" y2="${rLy}" stroke="#888888" stroke-width="1" stroke-dasharray="3,2"/>
    <text x="${rLx+1}" y="${rLy}" font-size="14" font-weight="700" fill="#555555" dominant-baseline="middle">r=${r}</text>`;
  const dimH=`<line x1="${lx}" y1="${uft}" x2="${lx}" y2="${lfb}" stroke="#555555" stroke-width="1"/>
    <line x1="${lx-4}" y1="${uft}" x2="${lx+4}" y2="${uft}" stroke="#555555" stroke-width="1"/>
    <line x1="${lx-4}" y1="${lfb}" x2="${lx+4}" y2="${lfb}" stroke="#555555" stroke-width="1"/>
    <text x="${lx-5}" y="${cy}" font-size="14" font-weight="700" fill="#111111" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90,${lx-5},${cy})">H=${H}</text>`;
  const dimB=`<line x1="${fl}" y1="${by}" x2="${fr}" y2="${by}" stroke="#555555" stroke-width="1"/>
    <line x1="${fl}" y1="${by-4}" x2="${fl}" y2="${by+4}" stroke="#555555" stroke-width="1"/>
    <line x1="${fr}" y1="${by-4}" x2="${fr}" y2="${by+4}" stroke="#555555" stroke-width="1"/>
    <text x="${cx}" y="${by+10}" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">B=${B}</text>`;
  const dimT1=`<line x1="${wl}" y1="${cy}" x2="${wr}" y2="${cy}" stroke="#555555" stroke-width="1"/>
    <line x1="${wl}" y1="${cy-4}" x2="${wl}" y2="${cy+4}" stroke="#555555" stroke-width="1"/>
    <line x1="${wr}" y1="${cy-4}" x2="${wr}" y2="${cy+4}" stroke="#555555" stroke-width="1"/>
    <text x="${wr+5}" y="${cy}" font-size="12" fill="#555555" dominant-baseline="middle">t1=${t1}</text>`;
  const tx2=fr+16;
  const dimT2=`<line x1="${tx2}" y1="${uft}" x2="${tx2}" y2="${ufb}" stroke="#555555" stroke-width="1"/>
    <line x1="${tx2-3}" y1="${uft}" x2="${tx2+3}" y2="${uft}" stroke="#555555" stroke-width="1"/>
    <line x1="${tx2-3}" y1="${ufb}" x2="${tx2+3}" y2="${ufb}" stroke="#555555" stroke-width="1"/>
    <text x="${tx2+4}" y="${(uft+ufb)/2}" font-size="12" fill="#555555" dominant-baseline="middle">t2=${t2}</text>`;

  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <path d="${path}" fill="#ffffff" stroke="#111111" stroke-width="1.5" stroke-linejoin="round"/>
    ${dimH}${dimB}${dimT1}${dimT2}
  </svg>`;
}

/* ── 等辺山形鋼（L形鋼）断面SVG生成 ──
   A = 縦辺高さ(mm)、B = 横辺幅(mm)、t = 肉厚(mm)
   r1 = 根元フィレット半径(mm)、r2 = 先端フィレット半径(mm)
   Cx, Cy = 重心位置(cm) ※等辺山形鋼では A=B, Cx=Cy
   ※ r2 は leg先端の「内側2角のみ」に適用（外側は直角）
*/
function drawLAngleSVG(spec, viewW, viewH) {
  const A = Number(spec.A || 0);
  const B = Number(spec.B || 0);
  const tWeb = Number(spec.t1 || spec.t || 0);
  const tFlange = Number(spec.t2 || spec.t || 0);
  const r1 = Number(spec.r1 || 0);
  const r2 = Number(spec.r2 || 0);
  const mL = 42, mT = 20, mR = 52, mB = 28;
  const sc = Math.min((viewW - mL - mR) / B, (viewH - mT - mB) / A);
  const Ap = A * sc, Bp = B * sc;
  const tWebP = tWeb * sc, tFlangeP = tFlange * sc;
  const r1p = Math.max(1, r1 * sc);
  const r2p = Math.max(0.5, Math.min(r2 * sc, Math.min(tWebP, tFlangeP) * 0.45));
  const ox = mL, oyt = mT, oyb = mT + Ap;

  const path = [
    `M ${ox} ${oyb}`,
    `L ${ox} ${oyt}`,
    `L ${ox + tWebP - r2p} ${oyt}`,
    `A ${r2p} ${r2p} 0 0 1 ${ox + tWebP} ${oyt + r2p}`,
    `L ${ox + tWebP} ${oyb - tFlangeP - r1p}`,
    `A ${r1p} ${r1p} 0 0 0 ${ox + tWebP + r1p} ${oyb - tFlangeP}`,
    `L ${ox + Bp - r2p} ${oyb - tFlangeP}`,
    `A ${r2p} ${r2p} 0 0 1 ${ox + Bp} ${oyb - tFlangeP + r2p}`,
    `L ${ox + Bp} ${oyb}`,
    `L ${ox} ${oyb}`, `Z`
  ].join(' ');

  const ax = ox - 14, myY = (oyt + oyb) / 2;
  const dimA = `<line x1="${ax}" y1="${oyt}" x2="${ax}" y2="${oyb}" stroke="#555555" stroke-width="1"/>
    <line x1="${ax-4}" y1="${oyt}" x2="${ax+4}" y2="${oyt}" stroke="#555555" stroke-width="1"/>
    <line x1="${ax-4}" y1="${oyb}" x2="${ax+4}" y2="${oyb}" stroke="#555555" stroke-width="1"/>
    <text x="${ax-5}" y="${myY}" font-size="14" font-weight="700" fill="#111111"
      text-anchor="middle" dominant-baseline="middle"
      transform="rotate(-90,${ax-5},${myY})">A=${A}</text>`;
  const by = oyb + 14;
  const dimB = `<line x1="${ox}" y1="${by}" x2="${ox+Bp}" y2="${by}" stroke="#555555" stroke-width="1"/>
    <line x1="${ox}" y1="${by-4}" x2="${ox}" y2="${by+4}" stroke="#555555" stroke-width="1"/>
    <line x1="${ox+Bp}" y1="${by-4}" x2="${ox+Bp}" y2="${by+4}" stroke="#555555" stroke-width="1"/>
    <text x="${ox+Bp/2}" y="${by+10}" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">B=${B}</text>`;
  const tx = ox + Bp + 6;
  const dimT = `<line x1="${tx}" y1="${oyb-tFlangeP}" x2="${tx}" y2="${oyb}" stroke="#555555" stroke-width="1"/>
    <line x1="${tx-3}" y1="${oyb-tFlangeP}" x2="${tx+3}" y2="${oyb-tFlangeP}" stroke="#555555" stroke-width="1"/>
    <line x1="${tx-3}" y1="${oyb}" x2="${tx+3}" y2="${oyb}" stroke="#555555" stroke-width="1"/>
    <text x="${tx+4}" y="${oyb-tFlangeP/2}" font-size="12" fill="#555555" dominant-baseline="middle">${spec.t1 ? `t2=${tFlange}` : `t=${tFlange}`}</text>`;

  const r1sw = Math.max(1.5, r1p * 0.3);
  const r1High = `<path d="M ${ox+tWebP} ${oyb-tFlangeP-r1p} A ${r1p} ${r1p} 0 0 0 ${ox+tWebP+r1p} ${oyb-tFlangeP}"
    fill="none" stroke="#888888" stroke-width="${r1sw}"/>`;
  const r1dx = ox + tWebP + r1p, r1dy = oyb - tFlangeP - r1p;
  const r1lx = r1dx + 14, r1ly = r1dy - 10;
  const r1Anno = `<circle cx="${r1dx}" cy="${r1dy}" r="2" fill="#888888"/>
    <line x1="${r1dx}" y1="${r1dy}" x2="${r1lx-2}" y2="${r1ly}" stroke="#888888" stroke-width="1" stroke-dasharray="3,2"/>
    <text x="${r1lx+1}" y="${r1ly}" font-size="14" font-weight="700" fill="#555555" dominant-baseline="middle">r1=${r1}</text>`;

  const r2sw = Math.max(1.5, r2p * 0.4);
  const r2High = `<path d="M ${ox+tWebP-r2p} ${oyt} A ${r2p} ${r2p} 0 0 1 ${ox+tWebP} ${oyt+r2p}"
    fill="none" stroke="#888888" stroke-width="${r2sw}"/>`;
  const r2dx = ox + tWebP, r2dy = oyt;
  const r2lx = r2dx + r2p + 14, r2ly = r2dy - 2;
  const r2Anno = `<circle cx="${r2dx}" cy="${r2dy}" r="2" fill="#888888"/>
    <line x1="${r2dx}" y1="${r2dy}" x2="${r2lx-2}" y2="${r2ly}" stroke="#888888" stroke-width="1" stroke-dasharray="3,2"/>
    <text x="${r2lx+1}" y="${r2ly}" font-size="14" font-weight="700" fill="#555555" dominant-baseline="middle">r2=${r2}</text>`;

  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <path d="${path}" fill="#ffffff" stroke="#111111" stroke-width="1.5" stroke-linejoin="miter"/>
    ${r1Anno}${r2Anno}${dimA}${dimB}${dimT}
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
        fill="#ffffff" stroke="#111111" stroke-width="2.5"/>
    </svg>
  `;
}

function drawChannelSVG(H, B, t1, t2, r1, viewW, viewH) {
  const margin = 34;
  const totalW = B + t1;
  const sc = Math.min((viewW - margin * 2) / totalW, (viewH - margin * 2) / H);
  const h = H * sc;
  const b = B * sc;
  const web = t1 * sc;
  const flange = t2 * sc;
  const rr = Math.max(0, r1 * sc);
  const x = (viewW - (b + web)) / 2;
  const y = (viewH - h) / 2;
  const top = y;
  const bottom = y + h;
  const left = x;
  const right = x + b + web;
  const inner = left + web;

  const path = [
    `M ${right} ${top}`,
    `L ${inner} ${top}`,
    `L ${inner} ${bottom - flange - rr}`,
    `A ${rr} ${rr} 0 0 1 ${inner - rr} ${bottom - flange}`,
    `L ${left} ${bottom - flange}`,
    `L ${left} ${bottom}`,
    `L ${right} ${bottom}`,
    `L ${right} ${bottom - flange}`,
    `L ${inner + rr} ${bottom - flange}`,
    `A ${rr} ${rr} 0 0 1 ${inner} ${bottom - flange - rr}`,
    `L ${inner} ${top + flange + rr}`,
    `A ${rr} ${rr} 0 0 1 ${inner + rr} ${top + flange}`,
    `L ${right} ${top + flange}`,
    `Z`
  ].join(' ');

  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <path d="${path}" fill="#ffffff" stroke="#111111" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`;
}

function drawIBeamSVG(H, B, t1, t2, r1, viewW, viewH) {
  return drawHBeamSVG(H, B, t1, t2, r1, viewW, viewH);
}

function drawRoundBarSVG(D, viewW, viewH) {
  const margin = 42;
  const scale = (Math.min(viewW, viewH) - margin * 2) / D;
  const radius = (D * scale) / 2;
  const cx = viewW / 2;
  const cy = viewH / 2;
  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#ffffff" stroke="#111111" stroke-width="2.5"/>
    <line x1="${cx - radius}" y1="${cy + radius + 18}" x2="${cx + radius}" y2="${cy + radius + 18}" stroke="#555555" stroke-width="1"/>
    <line x1="${cx - radius}" y1="${cy + radius + 14}" x2="${cx - radius}" y2="${cy + radius + 22}" stroke="#555555" stroke-width="1"/>
    <line x1="${cx + radius}" y1="${cy + radius + 14}" x2="${cx + radius}" y2="${cy + radius + 22}" stroke="#555555" stroke-width="1"/>
    <text x="${cx}" y="${cy + radius + 32}" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">D=${D}</text>
  </svg>`;
}

function drawPipeSVG(D, d, viewW, viewH) {
  const margin = 42;
  const scale = (Math.min(viewW, viewH) - margin * 2) / D;
  const outerRadius = (D * scale) / 2;
  const innerRadius = (d * scale) / 2;
  const cx = viewW / 2;
  const cy = viewH / 2;
  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <circle cx="${cx}" cy="${cy}" r="${outerRadius}" fill="#ffffff" stroke="#111111" stroke-width="2.5"/>
    <circle cx="${cx}" cy="${cy}" r="${innerRadius}" fill="#fff" stroke="#111111" stroke-width="1.5"/>
    <line x1="${cx - outerRadius}" y1="${cy + outerRadius + 18}" x2="${cx + outerRadius}" y2="${cy + outerRadius + 18}" stroke="#555555" stroke-width="1"/>
    <line x1="${cx - outerRadius}" y1="${cy + outerRadius + 14}" x2="${cx - outerRadius}" y2="${cy + outerRadius + 22}" stroke="#555555" stroke-width="1"/>
    <line x1="${cx + outerRadius}" y1="${cy + outerRadius + 14}" x2="${cx + outerRadius}" y2="${cy + outerRadius + 22}" stroke="#555555" stroke-width="1"/>
    <text x="${cx}" y="${cy + outerRadius + 32}" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">D=${D}</text>
  </svg>`;
}

function drawSquareBarSVG(a, viewW, viewH) {
  const margin = 42;
  const scale = (Math.min(viewW, viewH) - margin * 2) / a;
  const size = a * scale;
  const x = (viewW - size) / 2;
  const y = (viewH - size) / 2;
  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#ffffff" stroke="#111111" stroke-width="2.5"/>
    <line x1="${x}" y1="${y + size + 18}" x2="${x + size}" y2="${y + size + 18}" stroke="#555555" stroke-width="1"/>
    <line x1="${x}" y1="${y + size + 14}" x2="${x}" y2="${y + size + 22}" stroke="#555555" stroke-width="1"/>
    <line x1="${x + size}" y1="${y + size + 14}" x2="${x + size}" y2="${y + size + 22}" stroke="#555555" stroke-width="1"/>
    <text x="${viewW / 2}" y="${y + size + 32}" font-size="14" font-weight="700" fill="#111111" text-anchor="middle">a=${a}</text>
  </svg>`;
}
