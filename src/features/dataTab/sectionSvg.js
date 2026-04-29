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
  const margin = { left: 86, top: 98, right: 86, bottom: 112 };
  const maxW = viewW - margin.left - margin.right;
  const maxH = viewH - margin.top - margin.bottom;
  const width = maxW * 0.86;
  const realRatioH = width * (t / Math.max(B, 1));
  const height = Math.min(maxH * 0.42, Math.max(34, realRatioH));
  const x = (viewW - width) / 2;
  const y = (viewH - height) / 2 - 10;
  const dimBottomY = y + height + 52;
  const dimLeftX = x - 34;
  const midY = y + height / 2;
  const tInset = Math.min(5, Math.max(2, height * 0.18));
  const dim = '#111111';

  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <defs>
      <marker id="dtFlatArrowEnd" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtFlatArrowStart" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto">
        <path d="M8,0 L0,4 L8,8 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtFlatSmallArrowEnd" markerWidth="5" markerHeight="5" refX="4.4" refY="2.5" orient="auto">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtFlatSmallArrowStart" markerWidth="5" markerHeight="5" refX="0.6" refY="2.5" orient="auto">
        <path d="M5,0 L0,2.5 L5,5 Z" fill="${dim}"></path>
      </marker>
      <style>
        .dt-flat-shape { fill: #ffffff; stroke: ${dim}; stroke-width: 2; stroke-linejoin: miter; }
        .dt-flat-guide { stroke: ${dim}; stroke-width: 1.25; fill: none; }
        .dt-flat-dim { stroke: ${dim}; stroke-width: 1.55; fill: none; marker-start: url(#dtFlatArrowStart); marker-end: url(#dtFlatArrowEnd); }
        .dt-flat-thickness-dim { stroke: ${dim}; stroke-width: 1.3; fill: none; marker-start: url(#dtFlatSmallArrowStart); marker-end: url(#dtFlatSmallArrowEnd); }
        .dt-flat-label { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: ${dim}; font-size: 20px !important; font-weight: 800; letter-spacing: 0; }
      </style>
    </defs>
    <rect class="dt-flat-shape" x="${x}" y="${y}" width="${width}" height="${height}"/>

    <line class="dt-flat-guide" x1="${x}" y1="${dimBottomY - 14}" x2="${x}" y2="${dimBottomY + 14}"/>
    <line class="dt-flat-guide" x1="${x + width}" y1="${dimBottomY - 14}" x2="${x + width}" y2="${dimBottomY + 14}"/>
    <line class="dt-flat-dim" x1="${x + 12}" y1="${dimBottomY}" x2="${x + width - 12}" y2="${dimBottomY}"/>
    <text class="dt-flat-label" x="${x + width / 2}" y="${dimBottomY + 30}" text-anchor="middle">B=${B}</text>

    <line class="dt-flat-guide" x1="${dimLeftX - 14}" y1="${y}" x2="${dimLeftX + 14}" y2="${y}"/>
    <line class="dt-flat-guide" x1="${dimLeftX - 14}" y1="${y + height}" x2="${dimLeftX + 14}" y2="${y + height}"/>
    <line class="dt-flat-thickness-dim" x1="${dimLeftX}" y1="${y + tInset}" x2="${dimLeftX}" y2="${y + height - tInset}"/>
    <line class="dt-flat-guide" x1="${dimLeftX + 12}" y1="${midY}" x2="${x - 14}" y2="${midY}"/>
    <text class="dt-flat-label" x="${Math.max(18, dimLeftX - 10)}" y="${midY + 7}" text-anchor="end">T=${t}</text>
  </svg>`;
}

function drawChannelSVG(H, B, t1, t2, r1, r2, viewW, viewH) {
  const margin = { left: 132, top: 56, right: 150, bottom: 128 };
  const scale = Math.min(
    (viewW - margin.left - margin.right) / Math.max(B, 1),
    (viewH - margin.top - margin.bottom) / Math.max(H, 1)
  );
  const x0 = margin.left + (viewW - margin.left - margin.right - B * scale) / 2;
  const y0 = margin.top + (viewH - margin.top - margin.bottom - H * scale) / 2;
  const g = getChannelGeometry({
    H: H,
    B: B,
    t1: t1,
    t2: t2,
    r1: r1 || 0,
    r2: r2 || 0
  }, x0, y0, scale);

  const path = [
    `M ${g.xL} ${g.yT}`,
    `L ${g.xR} ${g.yT}`,
    `L ${g.xR} ${g.fTR.t1.y}`,
    `Q ${g.pTR.x} ${g.pTR.y} ${g.fTR.t2.x} ${g.fTR.t2.y}`,
    `L ${g.fTL.t1.x} ${g.fTL.t1.y}`,
    `Q ${g.pTL.x} ${g.pTL.y} ${g.fTL.t2.x} ${g.fTL.t2.y}`,
    `L ${g.fBL.t1.x} ${g.fBL.t1.y}`,
    `Q ${g.pBL.x} ${g.pBL.y} ${g.fBL.t2.x} ${g.fBL.t2.y}`,
    `L ${g.fBR.t1.x} ${g.fBR.t1.y}`,
    `Q ${g.pBR.x} ${g.pBR.y} ${g.xR} ${g.fBR.t2.y}`,
    `L ${g.xR} ${g.yB}`,
    `L ${g.xL} ${g.yB}`,
    'Z'
  ].join(' ');

  const dimLeftX = g.xL - 58;
  const dimBottomY = g.yB + 48;
  const midY = (g.yT + g.yB) / 2;
  const t1LabelX = g.xW + 74;
  const t2MidY = (g.yT + g.yTopRef) / 2;
  const t1Inset = Math.min(4, Math.max(1.5, (g.xW - g.xL) * 0.22));
  const t2Inset = Math.min(4, Math.max(1.5, (g.yTopRef - g.yT) * 0.22));
  const r1StartX = g.pTL.x + 10;
  const r1StartY = g.pTL.y + 10;
  const r1LabelX = Math.min(viewW - 84, r1StartX + 82);
  const r1LabelY = Math.min(viewH - 84, r1StartY + 44);
  const r2StartX = g.fBR.t1.x + 14;
  const r2StartY = g.fBR.t1.y - 10;
  const r2LabelX = Math.min(viewW - 72, r2StartX + 80);
  const r2LabelY = Math.min(viewH - 36, r2StartY + 48);
  const t2LabelX = Math.min(viewW - 66, g.xR + 80);

  const guide = '#111111';
  const guideSoft = '#111111';
  const dim = '#1f2937';
  const text = '#111111';
  const steelFill = '#ffffff';
  const steelEdge = '#111111';
  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <defs>
      <marker id="dtChannelArrowEnd" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
        <path d="M0,0 L9,4.5 L0,9 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtChannelArrowStart" markerWidth="9" markerHeight="9" refX="1" refY="4.5" orient="auto">
        <path d="M9,0 L0,4.5 L9,9 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtChannelSmallArrowEnd" markerWidth="5" markerHeight="5" refX="4.4" refY="2.5" orient="auto">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtChannelSmallArrowStart" markerWidth="5" markerHeight="5" refX="0.6" refY="2.5" orient="auto">
        <path d="M5,0 L0,2.5 L5,5 Z" fill="${dim}"></path>
      </marker>
      <filter id="dtChannelSoftShadow" x="-12%" y="-12%" width="124%" height="124%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.2" flood-color="#0f172a" flood-opacity="0.10"/>
      </filter>
      <style>
        .dt-channel-shape { fill: ${steelFill}; stroke: ${steelEdge}; stroke-width: 2.1; stroke-linejoin: round; filter: url(#dtChannelSoftShadow); }
        .dt-channel-guide { stroke: ${guide}; stroke-width: 1.25; fill: none; }
        .dt-channel-guide-soft { stroke: ${guideSoft}; stroke-width: 1.25; fill: none; }
        .dt-channel-dim { stroke: ${dim}; stroke-width: 1.6; fill: none; marker-start: url(#dtChannelArrowStart); marker-end: url(#dtChannelArrowEnd); }
        .dt-channel-thickness-dim { stroke: ${dim}; stroke-width: 1.35; fill: none; marker-start: url(#dtChannelSmallArrowStart); marker-end: url(#dtChannelSmallArrowEnd); }
        .dt-channel-label { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: ${text}; font-size: 20px !important; font-weight: 800; letter-spacing: 0; }
        .dt-channel-sub { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: #555555; font-size: 18px !important; font-weight: 750; letter-spacing: 0; }
      </style>
    </defs>

    <path class="dt-channel-shape" d="${path}"/>

    <line class="dt-channel-guide" x1="${dimLeftX - 13}" y1="${g.yT}" x2="${dimLeftX + 13}" y2="${g.yT}"/>
    <line class="dt-channel-guide" x1="${dimLeftX - 13}" y1="${g.yB}" x2="${dimLeftX + 13}" y2="${g.yB}"/>
    <line class="dt-channel-dim" x1="${dimLeftX}" y1="${g.yT + 12}" x2="${dimLeftX}" y2="${g.yB - 12}"/>
    <text class="dt-channel-label" x="${dimLeftX - 22}" y="${midY}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${dimLeftX - 22} ${midY})">H=${H}</text>

    <line class="dt-channel-guide" x1="${g.xL}" y1="${dimBottomY - 13}" x2="${g.xL}" y2="${dimBottomY + 13}"/>
    <line class="dt-channel-guide" x1="${g.xR}" y1="${dimBottomY - 13}" x2="${g.xR}" y2="${dimBottomY + 13}"/>
    <line class="dt-channel-dim" x1="${g.xL + 12}" y1="${dimBottomY}" x2="${g.xR - 12}" y2="${dimBottomY}"/>
    <text class="dt-channel-label" x="${(g.xL + g.xR) / 2}" y="${dimBottomY + 26}" text-anchor="middle">B=${B}</text>

    <line class="dt-channel-guide-soft" x1="${g.xL}" y1="${midY - 26}" x2="${g.xL}" y2="${midY + 26}"/>
    <line class="dt-channel-guide-soft" x1="${g.xW}" y1="${midY - 26}" x2="${g.xW}" y2="${midY + 26}"/>
    <line class="dt-channel-thickness-dim" x1="${g.xL + t1Inset}" y1="${midY}" x2="${g.xW - t1Inset}" y2="${midY}"/>
    <line class="dt-channel-guide" x1="${g.xW + 14}" y1="${midY}" x2="${t1LabelX - 14}" y2="${midY}"/>
    <text class="dt-channel-sub" x="${t1LabelX}" y="${midY + 6}">t1=${t1}</text>

    <line class="dt-channel-guide-soft" x1="${g.xRef - 22}" y1="${g.yT}" x2="${g.xRef + 22}" y2="${g.yT}"/>
    <line class="dt-channel-guide-soft" x1="${g.xRef - 22}" y1="${g.yTopRef}" x2="${g.xRef + 22}" y2="${g.yTopRef}"/>
    <line class="dt-channel-thickness-dim" x1="${g.xRef}" y1="${g.yT + t2Inset}" x2="${g.xRef}" y2="${g.yTopRef - t2Inset}"/>
    <line class="dt-channel-guide" x1="${g.xRef + 16}" y1="${t2MidY}" x2="${t2LabelX - 14}" y2="${t2MidY}"/>
    <text class="dt-channel-sub" x="${t2LabelX}" y="${t2MidY + 6}">t2=${t2}</text>

    <path class="dt-channel-guide" d="M ${r1StartX} ${r1StartY} L ${r1LabelX - 14} ${r1LabelY - 10}"/>
    <text class="dt-channel-sub" x="${r1LabelX}" y="${r1LabelY}">r1=${r1 || 0}</text>
    <path class="dt-channel-guide" d="M ${r2StartX} ${r2StartY} L ${r2LabelX - 14} ${r2LabelY - 10}"/>
    <text class="dt-channel-sub" x="${r2LabelX}" y="${r2LabelY}">r2=${r2 || 0}</text>
  </svg>`;
}

function getChannelGeometry(spec, x0, y0, scale) {
  const H = spec.H * scale;
  const B = spec.B * scale;
  const t1 = spec.t1 * scale;
  const t2 = spec.t2 * scale;
  const r1 = Math.max(0.01, spec.r1 * scale);
  const r2 = Math.max(0.01, spec.r2 * scale);
  const xL = x0;
  const xW = x0 + t1;
  const xR = x0 + B;
  const yT = y0;
  const yB = y0 + H;
  const angle = 5 * Math.PI / 180;
  const xRef = xR - (B - t1) / 2;
  const yTopRef = yT + t2;
  const yBotRef = yB - t2;
  const slope = Math.tan(angle);
  const yTopAt = function(x) { return yTopRef - slope * (x - xRef); };
  const yBotAt = function(x) { return yBotRef + slope * (x - xRef); };
  const pTR = { x: xR, y: yTopAt(xR) };
  const pTL = { x: xW, y: yTopAt(xW) };
  const pBL = { x: xW, y: yBotAt(xW) };
  const pBR = { x: xR, y: yBotAt(xR) };

  return {
    xL: xL, xW: xW, xR: xR, yT: yT, yB: yB, xRef: xRef, yTopRef: yTopRef,
    pTR: pTR, pTL: pTL, pBL: pBL, pBR: pBR,
    fTR: getChannelFillet(pTR, channelUnit(0, -1), channelUnit(-1, slope), r2),
    fTL: getChannelFillet(pTL, channelUnit(1, -slope), channelUnit(0, 1), r1),
    fBL: getChannelFillet(pBL, channelUnit(0, -1), channelUnit(1, slope), r1),
    fBR: getChannelFillet(pBR, channelUnit(-1, -slope), channelUnit(0, 1), r2)
  };
}

function channelUnit(vx, vy) {
  const len = Math.hypot(vx, vy) || 1;
  return { x: vx / len, y: vy / len };
}

function getChannelFillet(point, u1, u2, radius) {
  const dot = Math.min(1, Math.max(-1, u1.x * u2.x + u1.y * u2.y));
  const phi = Math.acos(dot) || Math.PI / 2;
  const offset = Math.min(radius / Math.tan(phi / 2), radius * 3);
  return {
    t1: { x: point.x + u1.x * offset, y: point.y + u1.y * offset },
    t2: { x: point.x + u2.x * offset, y: point.y + u2.y * offset }
  };
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
