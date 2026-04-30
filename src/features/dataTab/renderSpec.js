
/* 断面図・データ描画 */
function renderDataSpec() {
  const kindData = SECTION_DATA[_dataKind];
  if (!kindData) return;
  const spec = kindData.specs[_dataSpecIdx];
  if (!spec) return;

  // ヘッダー（eyebrow: カテゴリ、h1: 規格名、subtitle: JIS）
  const infoEl = document.getElementById('dtHeader');
  const W = spec.W || spec.w || null;
  const S = (typeof wGetPaintPerM === 'function') ? wGetPaintPerM(kindData.label, spec.name) : null;
  if (infoEl) {
    var subParts = [];
    if (kindData.jis) subParts.push(kindData.jis);
    if (W != null) subParts.push('W = ' + W + ' kg/m');
    if (S != null) subParts.push('塗装 ' + S + ' m²/m');
    infoEl.innerHTML =
      '<span class="eyebrow">' + kindData.label + '</span>' +
      '<h1>' + spec.name + '</h1>' +
      '<div class="subtitle">' + subParts.join('  ·  ') + '</div>';
  }

  // 断面形状パネル下部の JIS 表記
  var figJis = document.getElementById('dtFigJis');
  if (figJis) {
    figJis.textContent = kindData.jis || '';
  }

  // 断面寸法セクションの .ico 部に断面積・単位質量を表示
  var dimMeta = document.getElementById('dtDimMeta');
  if (dimMeta) {
    var areaVal = (kindData.type === 'RB' || kindData.type === 'SB' || kindData.type === 'PIPE')
      ? spec.A
      : ((kindData.type === 'SQUARE_PIPE' || kindData.type === 'RECT_PIPE' || kindData.type === 'C_LIGHT' || kindData.type === 'BCR') ? spec.Asec : spec.Ac);
    var metaParts = [];
    if (areaVal != null) metaParts.push('A = ' + areaVal + ' cm²');
    if (W != null) metaParts.push('W = ' + W + ' kg/m');
    dimMeta.textContent = metaParts.join(' · ');
  }

  // 流通定尺セクションの .ico 部を既定値に
  var stdMeta = document.getElementById('dtStdMeta');
  if (stdMeta) stdMeta.textContent = 'JIS標準 + 工場長尺';

  // 定尺チップ（規格ごとに管理）
  renderDataStdChips(_dataKind, spec.name);

  // SVG断面図（鋼種タイプに応じて切り替え）
  const svgEl = document.getElementById('dataSVGWrap');
  if (svgEl) {
    const diagramViewW = 620;
    const diagramViewH = 460;
    const channelViewW = 600;
    const channelViewH = 600;
    const flatViewW = 600;
    const flatViewH = 600;
    const compactViewW = 510;
    const compactViewH = 390;
    if (kindData.type === 'H') {
      svgEl.innerHTML = drawHBeamSVG(spec.H, spec.B, spec.t1, spec.t2, spec.r, diagramViewW, diagramViewH);
    } else if (kindData.type === 'C') {
      svgEl.innerHTML = drawChannelSVG(spec.H, spec.B, spec.t1, spec.t2, spec.r1, spec.r2, channelViewW, channelViewH);
    } else if (kindData.type === 'C_LIGHT') {
      svgEl.innerHTML = drawCChannelSVG(spec.H, spec.A, spec.B, spec.t, compactViewW, compactViewH);
    } else if (kindData.type === 'LGC') {
      var lgcSpecForSvg = parseLightChannelSpecForDataTab(spec);
      svgEl.innerHTML = drawLightChannelSVG(lgcSpecForSvg.H, lgcSpecForSvg.A, lgcSpecForSvg.t, compactViewW, compactViewH);
    } else if (kindData.type === 'I') {
      svgEl.innerHTML = drawIBeamSVG(spec.H, spec.B, spec.t1, spec.t2, spec.r1, diagramViewW, diagramViewH);
    } else if (kindData.type === 'L' || kindData.type === 'LU' || kindData.type === 'LUT') {
      svgEl.innerHTML = drawLAngleSVG(spec, diagramViewW, diagramViewH);
    } else if (kindData.type === 'RB') {
      svgEl.innerHTML = drawRoundBarSVG(spec.D, compactViewW, compactViewH);
    } else if (kindData.type === 'SB') {
      svgEl.innerHTML = drawSquareBarSVG(spec.a, compactViewW, compactViewH);
    } else if (kindData.type === 'PIPE') {
      svgEl.innerHTML = drawPipeSVG(spec.D, spec.d, compactViewW, compactViewH);
    } else if (kindData.type === 'SQUARE_PIPE' || kindData.type === 'RECT_PIPE') {
      svgEl.innerHTML = drawRectPipeSVG(spec.A, spec.B, spec.t, compactViewW, compactViewH);
    } else if (kindData.type === 'BCR') {
      svgEl.innerHTML = drawRectPipeSVG(spec.H, spec.B, spec.t, compactViewW, compactViewH);
    } else if (kindData.type === 'FL') {
      svgEl.innerHTML = drawFlatBarSVG(spec.t, spec.B, flatViewW, flatViewH);
    }
  }

  // 断面寸法グリッド
  const dimEl = document.getElementById('dataDimGrid');
  if (dimEl) {
    // helper: 新マークアップ .dim > .dim-l + .dim-v[value<span class="unit">unit</span>]
    var _d = function(label, value, unit) {
      var u = unit ? '<span class="unit">' + unit + '</span>' : '';
      return '<div class="dim"><div class="dim-l">' + label + '</div>' +
             '<div class="dim-v">' + value + u + '</div></div>';
    };
    if (kindData.type === 'H') {
      dimEl.innerHTML =
        _d('H', spec.H, 'mm') +
        _d('B', spec.B, 'mm') +
        _d('t1（ウェブ）', spec.t1, 'mm') +
        _d('t2（フランジ）', spec.t2, 'mm') +
        (spec.r != null ? _d('r（フィレット）', spec.r, 'mm') : '') +
        _d('断面積 A', spec.Ac, 'cm²');
    } else if (kindData.type === 'C' || kindData.type === 'I') {
      dimEl.innerHTML =
        _d('H', spec.H, 'mm') +
        _d('B', spec.B, 'mm') +
        _d('t1（ウェブ）', spec.t1, 'mm') +
        _d('t2（フランジ）', spec.t2, 'mm') +
        _d('r1（根元）', spec.r1, 'mm') +
        _d('r2（先端）', spec.r2, 'mm');
    } else if (kindData.type === 'C_LIGHT') {
      dimEl.innerHTML =
        _d('H', spec.H, 'mm') +
        _d('A', spec.A, 'mm') +
        _d('B（リップ）', spec.B, 'mm') +
        _d('t', spec.t, 'mm') +
        _d('断面積 A', spec.Asec, 'cm²') +
        _d('単位質量 W', spec.W, 'kg/m');
    } else if (kindData.type === 'L') {
      dimEl.innerHTML =
        _d('A = B', spec.A, 'mm') +
        _d('t（肉厚）', spec.t, 'mm') +
        (spec.r1 != null ? _d('r1（根元）', spec.r1, 'mm') : '') +
        (spec.r2 != null ? _d('r2（先端）', spec.r2, 'mm') : '') +
        (spec.Ac != null ? _d('断面積 Ac', spec.Ac, 'cm²') : '') +
        (spec.Cx != null ? _d('Cx = Cy', spec.Cx, 'cm') : '');
    } else if (kindData.type === 'LU') {
      dimEl.innerHTML =
        _d('A（長辺）', spec.A, 'mm') +
        _d('B（短辺）', spec.B, 'mm') +
        _d('t（板厚）', spec.t, 'mm') +
        (spec.r1 != null ? _d('r1（根元）', spec.r1, 'mm') : '') +
        (spec.r2 != null ? _d('r2（先端）', spec.r2, 'mm') : '') +
        (spec.Ac != null ? _d('断面積 Ac', spec.Ac, 'cm²') : '') +
        (spec.Cx != null ? _d('A 方向', spec.Cx, 'cm') : '') +
        (spec.Cy != null ? _d('B 方向', spec.Cy, 'cm') : '');
    } else if (kindData.type === 'LUT') {
      dimEl.innerHTML =
        _d('A（長辺）', spec.A, 'mm') +
        _d('B（短辺）', spec.B, 'mm') +
        _d('t1（長辺板厚）', spec.t1, 'mm') +
        _d('t2（短辺板厚）', spec.t2, 'mm') +
        (spec.r1 != null ? _d('r1（根元）', spec.r1, 'mm') : '') +
        (spec.r2 != null ? _d('r2（先端）', spec.r2, 'mm') : '') +
        (spec.Ac != null ? _d('断面積 Ac', spec.Ac, 'cm²') : '') +
        (spec.Cx != null ? _d('A 方向', spec.Cx, 'cm') : '') +
        (spec.Cy != null ? _d('B 方向', spec.Cy, 'cm') : '');
    } else if (kindData.type === 'LGC') {
      var lgcSpec = parseLightChannelSpecForDataTab(spec);
      dimEl.innerHTML =
        _d('H', lgcSpec.H, 'mm') +
        _d('A', lgcSpec.A, 'mm') +
        _d('t', lgcSpec.t, 'mm') +
        _d('単位質量 W', spec.W, 'kg/m');
    } else if (kindData.type === 'FL') {
      dimEl.innerHTML =
        _d('厚さ t', spec.t, 'mm') +
        _d('幅 B', spec.B, 'mm') +
        _d('断面積', spec.Ac, 'cm²');
    } else if (kindData.type === 'RB') {
      dimEl.innerHTML =
        _d('直径 D', spec.D, 'mm') +
        _d('断面積 A', spec.A, 'cm²') +
        _d('単位質量 W', spec.W, 'kg/m');
    } else if (kindData.type === 'SB') {
      dimEl.innerHTML =
        _d('一辺 a', spec.a, 'mm') +
        _d('断面積 A', spec.A, 'cm²') +
        _d('単位質量 W', spec.W, 'kg/m');
    } else if (kindData.type === 'PIPE') {
      dimEl.innerHTML =
        _d('呼び径', spec.name, '') +
        _d('inch', spec.inch, '') +
        _d('外径 D', spec.D, 'mm') +
        _d('内径 d', spec.d, 'mm') +
        _d('厚さ t', spec.t, 'mm') +
        _d('断面積 A', spec.A, 'cm²');
    } else if (kindData.type === 'SQUARE_PIPE' || kindData.type === 'RECT_PIPE') {
      dimEl.innerHTML =
        _d('A', spec.A, 'mm') +
        _d('B', spec.B, 'mm') +
        _d('t', spec.t, 'mm') +
        _d('断面積 A', spec.Asec, 'cm²') +
        _d('単位質量 W', spec.W, 'kg/m');
    } else if (kindData.type === 'BCR') {
      dimEl.innerHTML =
        _d('H', spec.H, 'mm') +
        _d('B', spec.B, 'mm') +
        _d('t', spec.t, 'mm') +
        _d('r', spec.r, 'mm') +
        _d('t/r', spec.Ht, '') +
        _d('ランク', spec.rank, '');
  }
}

function parseLightChannelSpecForDataTab(spec) {
  var nums = (String((spec && spec.name) || '').match(/[\d.]+/g) || []).map(Number);
  return {
    H: Number(spec && spec.H != null ? spec.H : nums[0] || 0),
    A: Number(spec && spec.A != null ? spec.A : nums[1] || 0),
    t: Number(spec && spec.t != null ? spec.t : nums[2] || 0)
  };
}

  // 断面性能グリッド（規格切替えのたびに必ず折りたたみ状態へ戻す）
  const perfWrap = document.getElementById('dataPerfWrap');
  const perfToggle = document.getElementById('dataPerfToggle');
  const perfAction = document.getElementById('dataPerfAction');
  if (perfWrap) {
    perfWrap.classList.add('is-collapsed');
    perfWrap.setAttribute('data-collapsed', 'true');
  }
  if (perfToggle) perfToggle.setAttribute('aria-expanded', 'false');
  if (perfAction) perfAction.textContent = '開く';
  const perfEl = document.getElementById('dataPerfGrid');
  if (perfEl) {
    perfEl.hidden = true;
    perfEl.style.display = 'none';
  }
  if (perfEl) {
    var _p = function(label, value, unit) {
      var u = unit ? '<span class="unit">' + unit + '</span>' : '';
      return '<div class="dim"><div class="dim-l">' + label + '</div>' +
             '<div class="dim-v">' + value + u + '</div></div>';
    };
    if (kindData.type === 'RB' || kindData.type === 'SB' || kindData.type === 'PIPE') {
      perfEl.innerHTML =
        _p('I', spec.I, 'cm⁴') +
        _p('Z', spec.Z, 'cm³') +
        _p('i', spec.i, 'cm');
    } else if (kindData.type === 'SQUARE_PIPE' || kindData.type === 'RECT_PIPE') {
      perfEl.innerHTML =
        _p('Ix', spec.Ix, 'cm⁴') +
        _p('Iy', spec.Iy != null ? spec.Iy : spec.Ix, 'cm⁴') +
        _p('Zx', spec.Zx, 'cm³') +
        _p('Zy', spec.Zy != null ? spec.Zy : spec.Zx, 'cm³') +
        _p('ix', spec.ix, 'cm') +
        _p('iy', spec.iy != null ? spec.iy : spec.ix, 'cm');
    } else if (kindData.type === 'BCR') {
      perfEl.innerHTML =
        _p('I', spec.I, 'cm⁴') +
        _p('Z', spec.Z, 'cm³') +
        _p('Zp', spec.Zp, 'cm³') +
        _p('i', spec.i, 'cm');
    } else {
      perfEl.innerHTML =
        _p('Ix', spec.Ix, 'cm⁴') +
        _p('Iy', spec.Iy, 'cm⁴') +
        _p('Zx', spec.Zx, 'cm³') +
        _p('Zy', spec.Zy, 'cm³') +
        _p('ix', spec.ix, 'cm') +
        _p('iy', spec.iy, 'cm');
    }
  }

  // 単位重量の計算式 / 塗装面積 は削除済（ユーザー指示）
  const extraEl = document.getElementById('dataExtraInfo');
  if (extraEl) {
    extraEl.innerHTML = '';
    extraEl.style.display = 'none';
  }

  // チップバーの選択状態を更新（renderDataSpecPicker は selectDataSpec で再描画される）

  // 殴り書きメモ表示
  renderDataNote(spec.name);
}

function toggleDataPerfSection() {
  var perfWrap = document.getElementById('dataPerfWrap');
  var perfEl = document.getElementById('dataPerfGrid');
  var perfToggle = document.getElementById('dataPerfToggle');
  var perfAction = document.getElementById('dataPerfAction');
  if (!perfWrap || !perfEl) return;
  var collapsed = perfWrap.classList.toggle('is-collapsed');
  perfWrap.setAttribute('data-collapsed', collapsed ? 'true' : 'false');
  if (perfToggle) perfToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  if (perfAction) perfAction.textContent = collapsed ? '開く' : '閉じる';
  perfEl.hidden = collapsed;
  perfEl.style.display = collapsed ? 'none' : 'grid';
}
