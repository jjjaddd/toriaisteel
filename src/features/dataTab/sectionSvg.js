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

function drawCChannelSVG(H, A, B, t, viewW, viewH) {
  H = Number(H || 0);
  A = Number(A || 0);
  B = Number(B || 0);
  t = Number(t || 0);

  const margin = { left: 104, top: 46, right: 122, bottom: 96 };
  const scale = Math.min(
    (viewW - margin.left - margin.right) / Math.max(A, 1),
    (viewH - margin.top - margin.bottom) / Math.max(H, 1)
  );
  const h = H * scale;
  const a = A * scale;
  const lip = B * scale;
  const th = Math.max(3, t * scale);
  const innerR = Math.max(0.01, th);
  const outerR = Math.max(0.01, th * 2);
  const x = margin.left + (viewW - margin.left - margin.right - a) / 2;
  const y = margin.top + (viewH - margin.top - margin.bottom - h) / 2;
  const xL = x;
  const xR = x + a;
  const yT = y;
  const yB = y + h;
  const topLipEnd = yT + lip;
  const botLipStart = yB - lip;
  const xi = xL + th;
  const xr = xR - th;
  const yt = yT + th;
  const yb = yB - th;
  const path = [
    `M ${xL + outerR} ${yT}`,
    `L ${xR - outerR} ${yT}`,
    `Q ${xR} ${yT} ${xR} ${yT + outerR}`,
    `L ${xR} ${topLipEnd}`,
    `L ${xr} ${topLipEnd}`,
    `L ${xr} ${yt + innerR}`,
    `Q ${xr} ${yt} ${xr - innerR} ${yt}`,
    `L ${xi + innerR} ${yt}`,
    `Q ${xi} ${yt} ${xi} ${yt + innerR}`,
    `L ${xi} ${yb - innerR}`,
    `Q ${xi} ${yb} ${xi + innerR} ${yb}`,
    `L ${xr - innerR} ${yb}`,
    `Q ${xr} ${yb} ${xr} ${yb - innerR}`,
    `L ${xr} ${botLipStart}`,
    `L ${xR} ${botLipStart}`,
    `L ${xR} ${yB - outerR}`,
    `Q ${xR} ${yB} ${xR - outerR} ${yB}`,
    `L ${xL + outerR} ${yB}`,
    `Q ${xL} ${yB} ${xL} ${yB - outerR}`,
    `L ${xL} ${yT + outerR}`,
    `Q ${xL} ${yT} ${xL + outerR} ${yT}`,
    `Z`
  ].join(' ');

  const midY = yT + h / 2;
  const dimLeftX = xL - 58;
  const dimBottomY = yB + 50;
  const dimRightX = xR + 46;
  const tDimY = midY;
  const tLabelX = Math.min(viewW - 72, xi + 92);
  const tInset = Math.min(4, Math.max(1.5, th * 0.22));
  const guideGap = 12;
  const fmt = function(n) { return Number(n || 0).toFixed(1).replace(/\.0$/, ''); };
  const dim = '#1f2937';
  const guide = '#111111';
  const text = '#111111';

  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <defs>
      <marker id="dtCShapeArrowEnd" markerWidth="6" markerHeight="6" refX="5.3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtCShapeArrowStart" markerWidth="6" markerHeight="6" refX="0.7" refY="3" orient="auto">
        <path d="M6,0 L0,3 L6,6 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtCShapeSmallArrowEnd" markerWidth="5" markerHeight="5" refX="4.4" refY="2.5" orient="auto">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtCShapeSmallArrowStart" markerWidth="5" markerHeight="5" refX="0.6" refY="2.5" orient="auto">
        <path d="M5,0 L0,2.5 L5,5 Z" fill="${dim}"></path>
      </marker>
      <style>
        .dt-cshape-shape { fill: #ffffff; stroke: #111111; stroke-width: 2.1; stroke-linejoin: round; }
        .dt-cshape-guide { stroke: ${guide}; stroke-width: 1.25; fill: none; }
        .dt-cshape-dim { stroke: ${dim}; stroke-width: 1.6; fill: none; marker-start: url(#dtCShapeArrowStart); marker-end: url(#dtCShapeArrowEnd); }
        .dt-cshape-thickness { stroke: ${dim}; stroke-width: 1.35; fill: none; marker-start: url(#dtCShapeSmallArrowStart); marker-end: url(#dtCShapeSmallArrowEnd); }
        .dt-cshape-label { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: ${text}; font-size: 20px !important; font-weight: 800; letter-spacing: 0; }
        .dt-cshape-sub { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: #555555; font-size: 18px !important; font-weight: 750; letter-spacing: 0; }
      </style>
    </defs>
    <path class="dt-cshape-shape" d="${path}"/>

    <line class="dt-cshape-guide" x1="${xL - guideGap}" y1="${yT}" x2="${dimLeftX + 18}" y2="${yT}"/>
    <line class="dt-cshape-guide" x1="${xL - guideGap}" y1="${yB}" x2="${dimLeftX + 18}" y2="${yB}"/>
    <line class="dt-cshape-dim" x1="${dimLeftX}" y1="${yT + 12}" x2="${dimLeftX}" y2="${yB - 12}"/>
    <text class="dt-cshape-label" x="${dimLeftX - 22}" y="${midY}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${dimLeftX - 22} ${midY})">H=${fmt(H)}</text>

    <line class="dt-cshape-guide" x1="${xL}" y1="${yB + guideGap}" x2="${xL}" y2="${dimBottomY - 18}"/>
    <line class="dt-cshape-guide" x1="${xR}" y1="${yB + guideGap}" x2="${xR}" y2="${dimBottomY - 18}"/>
    <line class="dt-cshape-dim" x1="${xL + 12}" y1="${dimBottomY}" x2="${xR - 12}" y2="${dimBottomY}"/>
    <text class="dt-cshape-label" x="${xL + a / 2}" y="${dimBottomY + 28}" text-anchor="middle">A=${fmt(A)}</text>

    <line class="dt-cshape-guide" x1="${xR + guideGap}" y1="${yT}" x2="${dimRightX + 18}" y2="${yT}"/>
    <line class="dt-cshape-guide" x1="${xR + guideGap}" y1="${topLipEnd}" x2="${dimRightX + 18}" y2="${topLipEnd}"/>
    <line class="dt-cshape-dim" x1="${dimRightX}" y1="${yT + 12}" x2="${dimRightX}" y2="${topLipEnd - 12}"/>
    <text class="dt-cshape-label" x="${dimRightX + 24}" y="${yT + lip / 2 + 7}">B=${fmt(B)}</text>

    <line class="dt-cshape-guide" x1="${xL}" y1="${tDimY - 22}" x2="${xL}" y2="${tDimY + 22}"/>
    <line class="dt-cshape-guide" x1="${xi}" y1="${tDimY - 22}" x2="${xi}" y2="${tDimY + 22}"/>
    <line class="dt-cshape-thickness" x1="${xL + tInset}" y1="${tDimY}" x2="${xi - tInset}" y2="${tDimY}"/>
    <line class="dt-cshape-guide" x1="${xi + 14}" y1="${tDimY}" x2="${tLabelX - 14}" y2="${tDimY}"/>
    <text class="dt-cshape-sub" x="${tLabelX}" y="${tDimY + 6}">t=${fmt(t)}</text>
  </svg>`;
}

function drawLightChannelSVG(H, A, t, viewW, viewH) {
  H = Number(H || 0);
  A = Number(A || 0);
  t = Number(t || 0);

  const margin = { left: 104, top: 46, right: 122, bottom: 96 };
  const scale = Math.min(
    (viewW - margin.left - margin.right) / Math.max(A, 1),
    (viewH - margin.top - margin.bottom) / Math.max(H, 1)
  );
  const h = H * scale;
  const a = A * scale;
  const th = Math.max(3, t * scale);
  const innerR = Math.max(0.01, th);
  const outerR = Math.max(0.01, th * 2);
  const x = margin.left + (viewW - margin.left - margin.right - a) / 2;
  const y = margin.top + (viewH - margin.top - margin.bottom - h) / 2;
  const xL = x;
  const xR = x + a;
  const yT = y;
  const yB = y + h;
  const xi = xL + th;
  const yt = yT + th;
  const yb = yB - th;
  const path = [
    `M ${xL + outerR} ${yT}`,
    `L ${xR} ${yT}`,
    `L ${xR} ${yt}`,
    `L ${xi + innerR} ${yt}`,
    `Q ${xi} ${yt} ${xi} ${yt + innerR}`,
    `L ${xi} ${yb - innerR}`,
    `Q ${xi} ${yb} ${xi + innerR} ${yb}`,
    `L ${xR} ${yb}`,
    `L ${xR} ${yB}`,
    `L ${xL + outerR} ${yB}`,
    `Q ${xL} ${yB} ${xL} ${yB - outerR}`,
    `L ${xL} ${yT + outerR}`,
    `Q ${xL} ${yT} ${xL + outerR} ${yT}`,
    'Z'
  ].join(' ');

  const midY = yT + h / 2;
  const dimLeftX = xL - 58;
  const dimBottomY = yB + 50;
  const tDimY = midY;
  const tLabelX = Math.min(viewW - 72, xi + 92);
  const tInset = Math.min(4, Math.max(1.5, th * 0.22));
  const guideGap = 12;
  const fmt = function(n) { return Number(n || 0).toFixed(1).replace(/\.0$/, ''); };
  const dim = '#1f2937';
  const guide = '#111111';
  const text = '#111111';

  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <defs>
      <marker id="dtLightChannelArrowEnd" markerWidth="6" markerHeight="6" refX="5.3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtLightChannelArrowStart" markerWidth="6" markerHeight="6" refX="0.7" refY="3" orient="auto">
        <path d="M6,0 L0,3 L6,6 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtLightChannelSmallArrowEnd" markerWidth="5" markerHeight="5" refX="4.4" refY="2.5" orient="auto">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtLightChannelSmallArrowStart" markerWidth="5" markerHeight="5" refX="0.6" refY="2.5" orient="auto">
        <path d="M5,0 L0,2.5 L5,5 Z" fill="${dim}"></path>
      </marker>
      <style>
        .dt-light-channel-shape { fill: #ffffff; stroke: #111111; stroke-width: 2.1; stroke-linejoin: round; }
        .dt-light-channel-guide { stroke: ${guide}; stroke-width: 1.25; fill: none; }
        .dt-light-channel-dim { stroke: ${dim}; stroke-width: 1.6; fill: none; marker-start: url(#dtLightChannelArrowStart); marker-end: url(#dtLightChannelArrowEnd); }
        .dt-light-channel-thickness { stroke: ${dim}; stroke-width: 1.35; fill: none; marker-start: url(#dtLightChannelSmallArrowStart); marker-end: url(#dtLightChannelSmallArrowEnd); }
        .dt-light-channel-label { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: ${text}; font-size: 20px !important; font-weight: 800; letter-spacing: 0; }
        .dt-light-channel-sub { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: #555555; font-size: 18px !important; font-weight: 750; letter-spacing: 0; }
      </style>
    </defs>
    <path class="dt-light-channel-shape" d="${path}"/>

    <line class="dt-light-channel-guide" x1="${xL - guideGap}" y1="${yT}" x2="${dimLeftX + 18}" y2="${yT}"/>
    <line class="dt-light-channel-guide" x1="${xL - guideGap}" y1="${yB}" x2="${dimLeftX + 18}" y2="${yB}"/>
    <line class="dt-light-channel-dim" x1="${dimLeftX}" y1="${yT + 12}" x2="${dimLeftX}" y2="${yB - 12}"/>
    <text class="dt-light-channel-label" x="${dimLeftX - 22}" y="${midY}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${dimLeftX - 22} ${midY})">H=${fmt(H)}</text>

    <line class="dt-light-channel-guide" x1="${xL}" y1="${yB + guideGap}" x2="${xL}" y2="${dimBottomY - 18}"/>
    <line class="dt-light-channel-guide" x1="${xR}" y1="${yB + guideGap}" x2="${xR}" y2="${dimBottomY - 18}"/>
    <line class="dt-light-channel-dim" x1="${xL + 12}" y1="${dimBottomY}" x2="${xR - 12}" y2="${dimBottomY}"/>
    <text class="dt-light-channel-label" x="${xL + a / 2}" y="${dimBottomY + 28}" text-anchor="middle">A=${fmt(A)}</text>

    <line class="dt-light-channel-guide" x1="${xL}" y1="${tDimY - 22}" x2="${xL}" y2="${tDimY + 22}"/>
    <line class="dt-light-channel-guide" x1="${xi}" y1="${tDimY - 22}" x2="${xi}" y2="${tDimY + 22}"/>
    <line class="dt-light-channel-thickness" x1="${xL + tInset}" y1="${tDimY}" x2="${xi - tInset}" y2="${tDimY}"/>
    <line class="dt-light-channel-guide" x1="${xi + 14}" y1="${tDimY}" x2="${tLabelX - 14}" y2="${tDimY}"/>
    <text class="dt-light-channel-sub" x="${tLabelX}" y="${tDimY + 6}">t=${fmt(t)}</text>
  </svg>`;
}


/* ── H形鋼 断面SVG生成 ──
   H=全高, B=フランジ幅, t1=ウェブ厚, t2=フランジ厚, r=フィレット半径 (mm)
   全フィレット sweep=0（凹フィレット）
*/
function drawHBeamSVG(H, B, t1, t2, r, viewW, viewH) {
  const hasR = r !== null && r !== undefined && r !== '';
  H = Number(H || 0);
  B = Number(B || 0);
  t1 = Number(t1 || 0);
  t2 = Number(t2 || 0);
  r = Number(r || 0);

  const margin = { left: 116, top: 48, right: 136, bottom: 118 };
  const sc = Math.min(
    (viewW - margin.left - margin.right) / Math.max(B, 1),
    (viewH - margin.top - margin.bottom) / Math.max(H, 1)
  );
  const h = H * sc;
  const b = B * sc;
  const w = Math.max(2.5, t1 * sc);
  const f = Math.max(4, t2 * sc);
  const rr = Math.max(0.01, Math.min(r * sc, Math.min((b - w) / 2, (h - f * 2) / 2) * 0.42));
  const x0 = margin.left + (viewW - margin.left - margin.right - b) / 2;
  const y0 = margin.top + (viewH - margin.top - margin.bottom - h) / 2;
  const fl = x0;
  const fr = x0 + b;
  const cx = x0 + b / 2;
  const cy = y0 + h / 2;
  const wl = cx - w / 2;
  const wr = cx + w / 2;
  const uft = y0;
  const ufb = y0 + f;
  const lft = y0 + h - f;
  const lfb = y0 + h;

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

  const dimLeftX = fl - 56;
  const dimBottomY = lfb + 50;
  const t1Inset = Math.min(4, Math.max(1.5, w * 0.22));
  const t2Inset = Math.min(4, Math.max(1.5, f * 0.22));
  const t1LabelX = Math.min(viewW - 80, wr + 86);
  const t2DimX = Math.min(viewW - 110, fr + 46);
  const t2LabelX = Math.min(viewW - 66, t2DimX + 34);
  const rPointX = wr + rr * 0.72;
  const rPointY = ufb + rr * 0.72;
  const rLabelX = Math.min(viewW - 72, Math.max(fr + 28, rPointX + 88));
  const rLabelY = Math.min(viewH - 86, rPointY + 44);
  const rAnno = hasR ? `
    <path class="dt-hbeam-guide" d="M ${rPointX} ${rPointY} L ${rLabelX - 14} ${rLabelY - 8}"/>
    <text class="dt-hbeam-sub" x="${rLabelX}" y="${rLabelY + 14}">r=${r}</text>` : '';
  const dim = '#1f2937';
  const guide = '#111111';
  const text = '#111111';

  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <defs>
      <marker id="dtHBeamArrowEnd" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
        <path d="M0,0 L9,4.5 L0,9 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtHBeamArrowStart" markerWidth="9" markerHeight="9" refX="1" refY="4.5" orient="auto">
        <path d="M9,0 L0,4.5 L9,9 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtHBeamSmallArrowEnd" markerWidth="5" markerHeight="5" refX="4.4" refY="2.5" orient="auto">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtHBeamSmallArrowStart" markerWidth="5" markerHeight="5" refX="0.6" refY="2.5" orient="auto">
        <path d="M5,0 L0,2.5 L5,5 Z" fill="${dim}"></path>
      </marker>
      <style>
        .dt-hbeam-shape { fill: #ffffff; stroke: #111111; stroke-width: 2.1; stroke-linejoin: round; }
        .dt-hbeam-guide { stroke: ${guide}; stroke-width: 1.25; fill: none; }
        .dt-hbeam-dim { stroke: ${dim}; stroke-width: 1.6; fill: none; marker-start: url(#dtHBeamArrowStart); marker-end: url(#dtHBeamArrowEnd); }
        .dt-hbeam-thickness { stroke: ${dim}; stroke-width: 1.35; fill: none; marker-start: url(#dtHBeamSmallArrowStart); marker-end: url(#dtHBeamSmallArrowEnd); }
        .dt-hbeam-label { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: ${text}; font-size: 20px !important; font-weight: 800; letter-spacing: 0; }
        .dt-hbeam-sub { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: #555555; font-size: 18px !important; font-weight: 750; letter-spacing: 0; }
      </style>
    </defs>
    <path class="dt-hbeam-shape" d="${path}"/>

    <line class="dt-hbeam-guide" x1="${dimLeftX - 13}" y1="${uft}" x2="${dimLeftX + 13}" y2="${uft}"/>
    <line class="dt-hbeam-guide" x1="${dimLeftX - 13}" y1="${lfb}" x2="${dimLeftX + 13}" y2="${lfb}"/>
    <line class="dt-hbeam-dim" x1="${dimLeftX}" y1="${uft + 12}" x2="${dimLeftX}" y2="${lfb - 12}"/>
    <text class="dt-hbeam-label" x="${dimLeftX - 22}" y="${cy}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${dimLeftX - 22} ${cy})">H=${H}</text>

    <line class="dt-hbeam-guide" x1="${fl}" y1="${dimBottomY - 13}" x2="${fl}" y2="${dimBottomY + 13}"/>
    <line class="dt-hbeam-guide" x1="${fr}" y1="${dimBottomY - 13}" x2="${fr}" y2="${dimBottomY + 13}"/>
    <line class="dt-hbeam-dim" x1="${fl + 12}" y1="${dimBottomY}" x2="${fr - 12}" y2="${dimBottomY}"/>
    <text class="dt-hbeam-label" x="${cx}" y="${dimBottomY + 28}" text-anchor="middle">B=${B}</text>

    <line class="dt-hbeam-guide" x1="${wl}" y1="${cy - 28}" x2="${wl}" y2="${cy + 28}"/>
    <line class="dt-hbeam-guide" x1="${wr}" y1="${cy - 28}" x2="${wr}" y2="${cy + 28}"/>
    <line class="dt-hbeam-thickness" x1="${wl + t1Inset}" y1="${cy}" x2="${wr - t1Inset}" y2="${cy}"/>
    <line class="dt-hbeam-guide" x1="${wr + 14}" y1="${cy}" x2="${t1LabelX - 14}" y2="${cy}"/>
    <text class="dt-hbeam-sub" x="${t1LabelX}" y="${cy + 6}">t1=${t1}</text>

    <line class="dt-hbeam-guide" x1="${t2DimX - 18}" y1="${uft}" x2="${t2DimX + 18}" y2="${uft}"/>
    <line class="dt-hbeam-guide" x1="${t2DimX - 18}" y1="${ufb}" x2="${t2DimX + 18}" y2="${ufb}"/>
    <line class="dt-hbeam-thickness" x1="${t2DimX}" y1="${uft + t2Inset}" x2="${t2DimX}" y2="${ufb - t2Inset}"/>
    <text class="dt-hbeam-sub" x="${t2LabelX}" y="${(uft + ufb) / 2 + 6}">t2=${t2}</text>

    ${rAnno}
  </svg>`;
}

/* ── 等辺山形鋼（L形鋼）断面SVG生成 ──
   A = 縦辺高さ(mm)、B = 横辺幅(mm)、t = 肉厚(mm)
   r1 = 根元フィレット半径(mm)、r2 = 先端フィレット半径(mm)
   Cx, Cy = 重心位置(cm) ※等辺山形鋼では A=B, Cx=Cy
   ※ r2 は leg先端の「内側2角のみ」に適用（外側は直角）
*/
function drawLAngleSVG(spec, viewW, viewH) {
  const hasR1 = spec.r1 !== null && spec.r1 !== undefined && spec.r1 !== '';
  const hasR2 = spec.r2 !== null && spec.r2 !== undefined && spec.r2 !== '';
  const A = Number(spec.A || 0);
  const B = Number(spec.B || 0);
  const tWeb = Number(spec.t1 || spec.t || 0);
  const tFlange = Number(spec.t2 || spec.t || 0);
  const r1 = Number(spec.r1 || 0);
  const r2 = Number(spec.r2 || 0);
  const margin = { left: 112, top: 58, right: 150, bottom: 118 };
  const sc = Math.min(
    (viewW - margin.left - margin.right) / Math.max(B, 1),
    (viewH - margin.top - margin.bottom) / Math.max(A, 1)
  );
  const Ap = A * sc;
  const Bp = B * sc;
  const tWebP = Math.max(3.5, tWeb * sc);
  const tFlangeP = Math.max(3.5, tFlange * sc);
  const r1p = Math.max(0.01, Math.min(r1 * sc, Math.min(tWebP, tFlangeP) * 0.75));
  const r2p = Math.max(0.01, Math.min(r2 * sc, Math.min(tWebP, tFlangeP) * 0.42));
  const ox = margin.left + (viewW - margin.left - margin.right - Bp) / 2;
  const oyt = margin.top + (viewH - margin.top - margin.bottom - Ap) / 2;
  const oyb = oyt + Ap;

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

  const midY = (oyt + oyb) / 2;
  const dimLeftX = ox - 50;
  const dimBottomY = oyb + 50;
  const tFlangeDimX = ox + Bp + 34;
  const tWebDimY = Math.max(34, oyt - 18);
  const tWebLabelY = Math.max(18, tWebDimY - 28);
  const tLabel = spec.t1 ? `t2=${tFlange}` : `t=${tFlange}`;
  const tWebLabel = spec.t1 ? `t1=${tWeb}` : `t=${tWeb}`;
  const tInsetWeb = Math.min(4, Math.max(1.5, tWebP * 0.22));
  const tInsetFlange = Math.min(4, Math.max(1.5, tFlangeP * 0.22));
  const r1PointX = ox + tWebP + r1p * 0.7;
  const r1PointY = oyb - tFlangeP - r1p * 0.7;
  const r1LabelX = Math.min(viewW - 70, r1PointX + 88);
  const r1LabelY = Math.max(36, r1PointY - 48);
  const r2PointX = ox + tWebP - r2p * 0.35;
  const r2PointY = oyt + r2p * 0.35;
  const r2LabelX = Math.min(viewW - 70, r2PointX + 82);
  const r2LabelY = Math.max(32, r2PointY - 34);
  const r1Anno = hasR1 ? `
    <path class="dt-angle-guide" d="M ${r1PointX} ${r1PointY} L ${r1LabelX - 14} ${r1LabelY + 8}"/>
    <text class="dt-angle-sub" x="${r1LabelX}" y="${r1LabelY + 14}">r1=${r1}</text>` : '';
  const r2Anno = hasR2 ? `
    <path class="dt-angle-guide" d="M ${r2PointX} ${r2PointY} L ${r2LabelX - 14} ${r2LabelY + 8}"/>
    <text class="dt-angle-sub" x="${r2LabelX}" y="${r2LabelY + 14}">r2=${r2}</text>` : '';
  const dim = '#1f2937';
  const guide = '#111111';
  const text = '#111111';

  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <defs>
      <marker id="dtAngleArrowEnd" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
        <path d="M0,0 L9,4.5 L0,9 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtAngleArrowStart" markerWidth="9" markerHeight="9" refX="1" refY="4.5" orient="auto">
        <path d="M9,0 L0,4.5 L9,9 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtAngleSmallArrowEnd" markerWidth="5" markerHeight="5" refX="4.4" refY="2.5" orient="auto">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtAngleSmallArrowStart" markerWidth="5" markerHeight="5" refX="0.6" refY="2.5" orient="auto">
        <path d="M5,0 L0,2.5 L5,5 Z" fill="${dim}"></path>
      </marker>
      <style>
        .dt-angle-shape { fill: #ffffff; stroke: #111111; stroke-width: 2.1; stroke-linejoin: round; }
        .dt-angle-guide { stroke: ${guide}; stroke-width: 1.25; fill: none; }
        .dt-angle-dim { stroke: ${dim}; stroke-width: 1.6; fill: none; marker-start: url(#dtAngleArrowStart); marker-end: url(#dtAngleArrowEnd); }
        .dt-angle-thickness { stroke: ${dim}; stroke-width: 1.35; fill: none; marker-start: url(#dtAngleSmallArrowStart); marker-end: url(#dtAngleSmallArrowEnd); }
        .dt-angle-label { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: ${text}; font-size: 20px !important; font-weight: 800; letter-spacing: 0; }
        .dt-angle-sub { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: #555555; font-size: 18px !important; font-weight: 750; letter-spacing: 0; }
      </style>
    </defs>
    <path class="dt-angle-shape" d="${path}"/>

    <line class="dt-angle-guide" x1="${dimLeftX - 13}" y1="${oyt}" x2="${dimLeftX + 13}" y2="${oyt}"/>
    <line class="dt-angle-guide" x1="${dimLeftX - 13}" y1="${oyb}" x2="${dimLeftX + 13}" y2="${oyb}"/>
    <line class="dt-angle-dim" x1="${dimLeftX}" y1="${oyt + 12}" x2="${dimLeftX}" y2="${oyb - 12}"/>
    <text class="dt-angle-label" x="${dimLeftX - 22}" y="${midY}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${dimLeftX - 22} ${midY})">A=${A}</text>

    <line class="dt-angle-guide" x1="${ox}" y1="${dimBottomY - 13}" x2="${ox}" y2="${dimBottomY + 13}"/>
    <line class="dt-angle-guide" x1="${ox + Bp}" y1="${dimBottomY - 13}" x2="${ox + Bp}" y2="${dimBottomY + 13}"/>
    <line class="dt-angle-dim" x1="${ox + 12}" y1="${dimBottomY}" x2="${ox + Bp - 12}" y2="${dimBottomY}"/>
    <text class="dt-angle-label" x="${ox + Bp / 2}" y="${dimBottomY + 28}" text-anchor="middle">B=${B}</text>

    <line class="dt-angle-guide" x1="${ox}" y1="${tWebDimY - 17}" x2="${ox}" y2="${tWebDimY + 17}"/>
    <line class="dt-angle-guide" x1="${ox + tWebP}" y1="${tWebDimY - 17}" x2="${ox + tWebP}" y2="${tWebDimY + 17}"/>
    <line class="dt-angle-guide" x1="${ox}" y1="${tWebDimY + 16}" x2="${ox}" y2="${oyt}"/>
    <line class="dt-angle-guide" x1="${ox + tWebP}" y1="${tWebDimY + 16}" x2="${ox + tWebP}" y2="${oyt}"/>
    <line class="dt-angle-thickness" x1="${ox + tInsetWeb}" y1="${tWebDimY}" x2="${ox + tWebP - tInsetWeb}" y2="${tWebDimY}"/>
    <text class="dt-angle-sub" x="${ox + tWebP / 2}" y="${tWebLabelY}" text-anchor="middle">${tWebLabel}</text>

    <line class="dt-angle-guide" x1="${tFlangeDimX - 17}" y1="${oyb - tFlangeP}" x2="${tFlangeDimX + 17}" y2="${oyb - tFlangeP}"/>
    <line class="dt-angle-guide" x1="${tFlangeDimX - 17}" y1="${oyb}" x2="${tFlangeDimX + 17}" y2="${oyb}"/>
    <line class="dt-angle-thickness" x1="${tFlangeDimX}" y1="${oyb - tFlangeP + tInsetFlange}" x2="${tFlangeDimX}" y2="${oyb - tInsetFlange}"/>
    <text class="dt-angle-sub" x="${Math.min(viewW - 70, tFlangeDimX + 30)}" y="${oyb - tFlangeP / 2 + 6}">${tLabel}</text>

    ${r1Anno}${r2Anno}
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
  const margin = { left: 86, top: 46, right: 86, bottom: 110 };
  const maxDiameter = Math.min(viewW - margin.left - margin.right, viewH - margin.top - margin.bottom);
  const radius = (maxDiameter * 0.88) / 2;
  const cx = viewW / 2;
  const cy = margin.top + (viewH - margin.top - margin.bottom) / 2;
  const dimBottomY = cy + radius + 48;
  const dim = '#111111';

  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <defs>
      <pattern id="dtRoundHatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
        <rect width="10" height="10" fill="#ffffff"></rect>
        <line x1="0" y1="0" x2="0" y2="10" stroke="#c8ced8" stroke-width="1.3"></line>
      </pattern>
      <marker id="dtRoundArrowEnd" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtRoundArrowStart" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto">
        <path d="M8,0 L0,4 L8,8 Z" fill="${dim}"></path>
      </marker>
      <style>
        .dt-round-shape { fill: url(#dtRoundHatch); stroke: ${dim}; stroke-width: 2.3; }
        .dt-round-guide { stroke: ${dim}; stroke-width: 1.25; fill: none; }
        .dt-round-dim { stroke: ${dim}; stroke-width: 1.55; fill: none; marker-start: url(#dtRoundArrowStart); marker-end: url(#dtRoundArrowEnd); }
        .dt-round-label { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: ${dim}; font-size: 20px !important; font-weight: 800; letter-spacing: 0; }
      </style>
    </defs>
    <circle class="dt-round-shape" cx="${cx}" cy="${cy}" r="${radius}"/>

    <line class="dt-round-guide" x1="${cx - radius}" y1="${dimBottomY - 14}" x2="${cx - radius}" y2="${dimBottomY + 14}"/>
    <line class="dt-round-guide" x1="${cx + radius}" y1="${dimBottomY - 14}" x2="${cx + radius}" y2="${dimBottomY + 14}"/>
    <line class="dt-round-dim" x1="${cx - radius + 12}" y1="${dimBottomY}" x2="${cx + radius - 12}" y2="${dimBottomY}"/>
    <text class="dt-round-label" x="${cx}" y="${dimBottomY + 30}" text-anchor="middle">D=${D}</text>
  </svg>`;
}

function drawPipeSVG(D, d, viewW, viewH) {
  D = Number(D || 0);
  d = Number(d || 0);
  const t = Math.max(0, (D - d) / 2);
  const margin = { left: 108, top: 46, right: 124, bottom: 124 };
  const maxDiameter = Math.min(viewW - margin.left - margin.right, viewH - margin.top - margin.bottom);
  const outerRadius = (maxDiameter * 0.9) / 2;
  const rawInnerRadius = D > 0 ? Math.max(0, (d / D) * outerRadius) : 0;
  const minWall = Math.min(18, Math.max(10, outerRadius * 0.08));
  const innerRadius = Math.max(0, Math.min(rawInnerRadius, outerRadius - minWall));
  const cx = viewW / 2;
  const cy = margin.top + (viewH - margin.top - margin.bottom) / 2;
  const dimBottomY = cy + outerRadius + 48;
  const innerDimY = cy;
  const tDimX1 = cx + innerRadius;
  const tDimX2 = cx + outerRadius;
  const tDimY = cy - 40;
  const tLabelX = Math.min(viewW - 76, cx + outerRadius + 54);
  const fmt = function(n) { return Number(n || 0).toFixed(1).replace(/\.0$/, ''); };
  const dim = '#111111';

  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <defs>
      <marker id="dtPipeArrowEnd" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtPipeArrowStart" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto">
        <path d="M8,0 L0,4 L8,8 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtPipeSmallArrowEnd" markerWidth="5" markerHeight="5" refX="4.4" refY="2.5" orient="auto">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtPipeSmallArrowStart" markerWidth="5" markerHeight="5" refX="0.6" refY="2.5" orient="auto">
        <path d="M5,0 L0,2.5 L5,5 Z" fill="${dim}"></path>
      </marker>
      <style>
        .dt-pipe-shape { fill: #ffffff; stroke: ${dim}; stroke-linejoin: round; }
        .dt-pipe-hole { fill: var(--surface-2, #f8f8fc); stroke: ${dim}; stroke-width: 1.6; }
        .dt-pipe-guide { stroke: ${dim}; stroke-width: 1.25; fill: none; }
        .dt-pipe-dim { stroke: ${dim}; stroke-width: 1.55; fill: none; marker-start: url(#dtPipeArrowStart); marker-end: url(#dtPipeArrowEnd); }
        .dt-pipe-small-dim { stroke: ${dim}; stroke-width: 1.35; fill: none; marker-start: url(#dtPipeSmallArrowStart); marker-end: url(#dtPipeSmallArrowEnd); }
        .dt-pipe-label { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: ${dim}; font-size: 20px !important; font-weight: 800; letter-spacing: 0; }
        .dt-pipe-sub { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: #555555; font-size: 18px !important; font-weight: 750; letter-spacing: 0; }
      </style>
    </defs>
    <circle class="dt-pipe-shape" cx="${cx}" cy="${cy}" r="${outerRadius}" stroke-width="2.3"/>
    <circle class="dt-pipe-hole" cx="${cx}" cy="${cy}" r="${innerRadius}"/>

    <line class="dt-pipe-guide" x1="${cx - outerRadius}" y1="${dimBottomY - 14}" x2="${cx - outerRadius}" y2="${dimBottomY + 14}"/>
    <line class="dt-pipe-guide" x1="${cx + outerRadius}" y1="${dimBottomY - 14}" x2="${cx + outerRadius}" y2="${dimBottomY + 14}"/>
    <line class="dt-pipe-dim" x1="${cx - outerRadius + 12}" y1="${dimBottomY}" x2="${cx + outerRadius - 12}" y2="${dimBottomY}"/>
    <text class="dt-pipe-label" x="${cx}" y="${dimBottomY + 30}" text-anchor="middle">D=${fmt(D)}</text>

    <line class="dt-pipe-guide" x1="${cx - innerRadius}" y1="${innerDimY}" x2="${cx + innerRadius}" y2="${innerDimY}"/>
    <line class="dt-pipe-small-dim" x1="${cx - innerRadius + 10}" y1="${innerDimY}" x2="${cx + innerRadius - 10}" y2="${innerDimY}"/>
    <text class="dt-pipe-label" x="${cx}" y="${innerDimY + 30}" text-anchor="middle">d=${fmt(d)}</text>

    <line class="dt-pipe-guide" x1="${tDimX1}" y1="${tDimY - 18}" x2="${tDimX1}" y2="${tDimY + 18}"/>
    <line class="dt-pipe-guide" x1="${tDimX2}" y1="${tDimY - 18}" x2="${tDimX2}" y2="${tDimY + 18}"/>
    <line class="dt-pipe-small-dim" x1="${tDimX1 + 3}" y1="${tDimY}" x2="${tDimX2 - 3}" y2="${tDimY}"/>
    <line class="dt-pipe-guide" x1="${tDimX2 + 12}" y1="${tDimY}" x2="${tLabelX - 16}" y2="${tDimY}"/>
    <text class="dt-pipe-sub" x="${tLabelX}" y="${tDimY + 6}">t=${fmt(t)}</text>
  </svg>`;
}

function drawSquareBarSVG(a, viewW, viewH) {
  const margin = { left: 92, top: 54, right: 72, bottom: 108 };
  const maxSize = Math.min(viewW - margin.left - margin.right, viewH - margin.top - margin.bottom);
  const size = maxSize * 0.82;
  const x = (viewW - size) / 2 + 10;
  const y = margin.top + (viewH - margin.top - margin.bottom - size) / 2;
  const dimBottomY = y + size + 48;
  const dimLeftX = x - 44;
  const midY = y + size / 2;
  const dim = '#111111';

  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <defs>
      <pattern id="dtSquareHatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
        <rect width="10" height="10" fill="#ffffff"></rect>
        <line x1="0" y1="0" x2="0" y2="10" stroke="#c8ced8" stroke-width="1.3"></line>
      </pattern>
      <marker id="dtSquareArrowEnd" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="${dim}"></path>
      </marker>
      <marker id="dtSquareArrowStart" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto">
        <path d="M8,0 L0,4 L8,8 Z" fill="${dim}"></path>
      </marker>
      <style>
        .dt-square-shape { fill: url(#dtSquareHatch); stroke: ${dim}; stroke-width: 2.3; stroke-linejoin: miter; }
        .dt-square-guide { stroke: ${dim}; stroke-width: 1.25; fill: none; }
        .dt-square-dim { stroke: ${dim}; stroke-width: 1.55; fill: none; marker-start: url(#dtSquareArrowStart); marker-end: url(#dtSquareArrowEnd); }
        .dt-square-label { font-family: "Segoe UI", "Yu Gothic", sans-serif; fill: ${dim}; font-size: 20px !important; font-weight: 800; letter-spacing: 0; }
      </style>
    </defs>
    <rect class="dt-square-shape" x="${x}" y="${y}" width="${size}" height="${size}"/>

    <line class="dt-square-guide" x1="${x}" y1="${dimBottomY - 14}" x2="${x}" y2="${dimBottomY + 14}"/>
    <line class="dt-square-guide" x1="${x + size}" y1="${dimBottomY - 14}" x2="${x + size}" y2="${dimBottomY + 14}"/>
    <line class="dt-square-dim" x1="${x + 12}" y1="${dimBottomY}" x2="${x + size - 12}" y2="${dimBottomY}"/>
    <text class="dt-square-label" x="${x + size / 2}" y="${dimBottomY + 30}" text-anchor="middle">a=${a}</text>

    <line class="dt-square-guide" x1="${dimLeftX - 14}" y1="${y}" x2="${dimLeftX + 14}" y2="${y}"/>
    <line class="dt-square-guide" x1="${dimLeftX - 14}" y1="${y + size}" x2="${dimLeftX + 14}" y2="${y + size}"/>
    <line class="dt-square-dim" x1="${dimLeftX}" y1="${y + 12}" x2="${dimLeftX}" y2="${y + size - 12}"/>
    <text class="dt-square-label" x="${dimLeftX - 22}" y="${midY}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${dimLeftX - 22} ${midY})">a=${a}</text>
  </svg>`;
}
