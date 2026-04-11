# 山形鋼（等辺L形鋼）断面図・データ実装

## 対象ファイル
- `data.js`（既存ファイルに追記・修正）

---

## 変更① data.js — drawLAngleSVG 関数を追加

`drawHBeamSVG` 関数の**直後**に以下を追加する。

```js
/* ── 等辺山形鋼（L形鋼）断面SVG生成 ──
   A = 縦辺高さ(mm)、B = 横辺幅(mm)、t = 肉厚(mm)
   r1 = 根元フィレット半径(mm)、r2 = 先端フィレット半径(mm)
   Cx, Cy = 重心位置(cm)
   ※ 等辺山形鋼では A=B, Cx=Cy
   ※ r2 は leg先端の「外側2角のみ」に適用（内側は直角のまま）
*/
function drawLAngleSVG(A, B, t, r1, r2, Cx, Cy, viewW, viewH) {
  // マージン: 左42 上20 右52 下28
  const mL = 42, mT = 20, mR = 52, mB = 28;
  const sc = Math.min((viewW - mL - mR) / B, (viewH - mT - mB) / A);

  const Ap  = A  * sc;   // 縦辺高さ(px)
  const Bp  = B  * sc;   // 横辺幅(px)
  const tp  = t  * sc;   // 肉厚(px)
  const r1p = Math.max(1, r1 * sc);                    // 根元フィレット(px)
  const r2p = Math.max(0.5, Math.min(r2 * sc, tp * 0.45)); // 先端フィレット(px)、過大防止キャップ

  // 断面の原点: 左下外角を (ox, oyb) とする
  const ox  = mL;
  const oyt = mT;           // 断面上端y
  const oyb = mT + Ap;      // 断面下端y（＝横辺外底面）

  /* ── 断面輪郭パス（時計回り） ──────────────────────────────
     ① 左下外角（ヒール、直角）
     ② 左上外角（直角！外側は丸めない）
     ③ 縦辺右上内角（r2、内角を丸める）
     ④ 根元フィレット（r1、凹）
     ⑤ 横辺右端上角（r2、内角を丸める）
     ⑥ 横辺右下外角（直角！外側は丸めない）
  ──────────────────────────────────────────────────────── */
  const path = [
    // ① 左下外角（直角のまま）
    `M ${ox} ${oyb}`,
    // 左外面を上へ（直角のまま ② へ）
    `L ${ox} ${oyt}`,
    // 縦辺上面を右へ
    `L ${ox + tp - r2p} ${oyt}`,
    // ③ 縦辺右上内角: 先端内側フィレット（sweep=1 = CW = 凸）
    `A ${r2p} ${r2p} 0 0 1 ${ox + tp} ${oyt + r2p}`,
    // 縦辺内面を下へ
    `L ${ox + tp} ${oyb - tp - r1p}`,
    // ④ 根元フィレット（凹、sweep=0 = CCW）
    `A ${r1p} ${r1p} 0 0 0 ${ox + tp + r1p} ${oyb - tp}`,
    // 横辺内面（上面）を右へ
    `L ${ox + Bp - r2p} ${oyb - tp}`,
    // ⑤ 横辺右端上角: 先端内側フィレット（sweep=1 = CW = 凸）
    `A ${r2p} ${r2p} 0 0 1 ${ox + Bp} ${oyb - tp + r2p}`,
    // 横辺右外面を下へ（直角のまま ⑥ へ）
    `L ${ox + Bp} ${oyb}`,
    // 横辺底面を左へ（スタートに戻る）
    `L ${ox} ${oyb}`,
    `Z`
  ].join(' ');

  /* ── 寸法・注釈 ── */
  const ax = ox - 14;
  const myY = (oyt + oyb) / 2;
  const dimA = `
    <line x1="${ax}" y1="${oyt}" x2="${ax}" y2="${oyb}" stroke="#475569" stroke-width="1"/>
    <line x1="${ax-4}" y1="${oyt}" x2="${ax+4}" y2="${oyt}" stroke="#475569" stroke-width="1"/>
    <line x1="${ax-4}" y1="${oyb}" x2="${ax+4}" y2="${oyb}" stroke="#475569" stroke-width="1"/>
    <text x="${ax-5}" y="${myY}" font-size="9" font-weight="700" fill="#1d4ed8"
      text-anchor="middle" dominant-baseline="middle"
      transform="rotate(-90,${ax-5},${myY})">A=${A}</text>`;

  const by = oyb + 14;
  const dimB = `
    <line x1="${ox}" y1="${by}" x2="${ox+Bp}" y2="${by}" stroke="#475569" stroke-width="1"/>
    <line x1="${ox}" y1="${by-4}" x2="${ox}" y2="${by+4}" stroke="#475569" stroke-width="1"/>
    <line x1="${ox+Bp}" y1="${by-4}" x2="${ox+Bp}" y2="${by+4}" stroke="#475569" stroke-width="1"/>
    <text x="${ox+Bp/2}" y="${by+10}" font-size="9" font-weight="700" fill="#1d4ed8" text-anchor="middle">B=${B}</text>`;

  const tx = ox + Bp + 6;
  const dimT = `
    <line x1="${tx}" y1="${oyb-tp}" x2="${tx}" y2="${oyb}" stroke="#475569" stroke-width="1"/>
    <line x1="${tx-3}" y1="${oyb-tp}" x2="${tx+3}" y2="${oyb-tp}" stroke="#475569" stroke-width="1"/>
    <line x1="${tx-3}" y1="${oyb}" x2="${tx+3}" y2="${oyb}" stroke="#475569" stroke-width="1"/>
    <text x="${tx+4}" y="${oyb - tp/2}" font-size="8" fill="#475569" dominant-baseline="middle">t=${t}</text>`;

  /* ── r1 根元フィレット強調（H形鋼スタイル）── */
  const r1sw = Math.max(1.5, r1p * 0.3);
  const r1High = `<path d="M ${ox+tp} ${oyb-tp-r1p} A ${r1p} ${r1p} 0 0 0 ${ox+tp+r1p} ${oyb-tp}"
    fill="none" stroke="#f59e0b" stroke-width="${r1sw}"/>`;
  const r1dx = ox + tp + r1p, r1dy = oyb - tp - r1p;
  const r1lx = r1dx + 14, r1ly = r1dy - 10;
  const r1Anno = `
    <circle cx="${r1dx}" cy="${r1dy}" r="2" fill="#f59e0b"/>
    <line x1="${r1dx}" y1="${r1dy}" x2="${r1lx-2}" y2="${r1ly}"
      stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,2"/>
    <text x="${r1lx+1}" y="${r1ly}" font-size="9" font-weight="700" fill="#b45309"
      dominant-baseline="middle">r1=${r1}</text>`;

  /* ── r2 先端フィレット強調（縦辺③コーナー）── */
  const r2sw = Math.max(1.5, r2p * 0.4);
  const r2High = `<path d="M ${ox+tp-r2p} ${oyt} A ${r2p} ${r2p} 0 0 1 ${ox+tp} ${oyt+r2p}"
    fill="none" stroke="#f59e0b" stroke-width="${r2sw}"/>`;
  const r2dx = ox + tp, r2dy = oyt;
  const r2lx = r2dx + r2p + 14, r2ly = r2dy - 2;
  const r2Anno = `
    <circle cx="${r2dx}" cy="${r2dy}" r="2" fill="#f59e0b"/>
    <line x1="${r2dx}" y1="${r2dy}" x2="${r2lx-2}" y2="${r2ly}"
      stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,2"/>
    <text x="${r2lx+1}" y="${r2ly}" font-size="9" font-weight="700" fill="#b45309"
      dominant-baseline="middle">r2=${r2}</text>`;

  return `<svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
    <path d="${path}" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.5" stroke-linejoin="miter"/>
    ${r1High}${r2High}${r1Anno}${r2Anno}${dimA}${dimB}${dimT}
  </svg>`;
}
```

---

## 変更② data.js — SECTION_DATA に '山形鋼' を追加

`SECTION_DATA` オブジェクトに、**'H形鋼' の直後**に以下を追加する。

```js
  '山形鋼': {
    type: 'L',
    label: '等辺山形鋼',
    jis: 'JIS G 3192',
    jisSub: 'Equal leg angles',
    specs: [
      // name, A(=B), t, r1, r2, Ac(cm²), W(kg/m), Cx=Cy(cm), Ix=Iy(cm⁴), Zx=Zy(cm³), ix=iy(cm)
      { name:'L-25×25×3',   A:25,  B:25,  t:3,  r1:4,  r2:2, Ac:1.43,  W:1.12,  Cx:0.719, Cy:0.719, Ix:0.797, Iy:0.797, Zx:0.448, Zy:0.448, ix:0.747, iy:0.747 },
      { name:'L-30×30×3',   A:30,  B:30,  t:3,  r1:4,  r2:2, Ac:1.74,  W:1.37,  Cx:0.835, Cy:0.835, Ix:1.40,  Iy:1.40,  Zx:0.650, Zy:0.650, ix:0.898, iy:0.898 },
      { name:'L-40×40×3',   A:40,  B:40,  t:3,  r1:4,  r2:2, Ac:2.35,  W:1.85,  Cx:1.07,  Cy:1.07,  Ix:3.41,  Iy:3.41,  Zx:1.17,  Zy:1.17,  ix:1.21,  iy:1.21  },
      { name:'L-40×40×5',   A:40,  B:40,  t:5,  r1:4,  r2:2, Ac:3.79,  W:2.98,  Cx:1.18,  Cy:1.18,  Ix:5.24,  Iy:5.24,  Zx:1.85,  Zy:1.85,  ix:1.18,  iy:1.18  },
      { name:'L-50×50×4',   A:50,  B:50,  t:4,  r1:5,  r2:3, Ac:3.89,  W:3.06,  Cx:1.33,  Cy:1.33,  Ix:8.46,  Iy:8.46,  Zx:2.33,  Zy:2.33,  ix:1.47,  iy:1.47  },
      { name:'L-50×50×6',   A:50,  B:50,  t:6,  r1:5,  r2:3, Ac:5.69,  W:4.47,  Cx:1.44,  Cy:1.44,  Ix:11.9,  Iy:11.9,  Zx:3.36,  Zy:3.36,  ix:1.44,  iy:1.44  },
      { name:'L-65×65×6',   A:65,  B:65,  t:6,  r1:6,  r2:4, Ac:7.53,  W:5.91,  Cx:1.82,  Cy:1.82,  Ix:26.2,  Iy:26.2,  Zx:5.69,  Zy:5.69,  ix:1.86,  iy:1.86  },
      { name:'L-75×75×6',   A:75,  B:75,  t:6,  r1:7,  r2:4, Ac:8.74,  W:6.86,  Cx:2.07,  Cy:2.07,  Ix:41.2,  Iy:41.2,  Zx:7.62,  Zy:7.62,  ix:2.17,  iy:2.17  },
      { name:'L-75×75×9',   A:75,  B:75,  t:9,  r1:7,  r2:4, Ac:12.8,  W:10.1,  Cx:2.20,  Cy:2.20,  Ix:58.4,  Iy:58.4,  Zx:11.1,  Zy:11.1,  ix:2.13,  iy:2.13  },
      { name:'L-90×90×7',   A:90,  B:90,  t:7,  r1:8,  r2:5, Ac:12.2,  W:9.61,  Cx:2.44,  Cy:2.44,  Ix:84.8,  Iy:84.8,  Zx:13.3,  Zy:13.3,  ix:2.64,  iy:2.64  },
      { name:'L-100×100×7', A:100, B:100, t:7,  r1:9,  r2:6, Ac:13.7,  W:10.7,  Cx:2.68,  Cy:2.68,  Ix:131,   Iy:131,   Zx:18.3,  Zy:18.3,  ix:3.09,  iy:3.09  },
      { name:'L-100×100×10',A:100, B:100, t:10, r1:9,  r2:6, Ac:19.2,  W:15.1,  Cx:2.84,  Cy:2.84,  Ix:179,   Iy:179,   Zx:25.5,  Zy:25.5,  ix:3.05,  iy:3.05  },
      { name:'L-130×130×9', A:130, B:130, t:9,  r1:10, r2:7, Ac:22.7,  W:17.8,  Cx:3.47,  Cy:3.47,  Ix:449,   Iy:449,   Zx:48.0,  Zy:48.0,  ix:4.45,  iy:4.45  },
      { name:'L-150×150×12',A:150, B:150, t:12, r1:12, r2:8, Ac:35.0,  W:27.5,  Cx:4.09,  Cy:4.09,  Ix:874,   Iy:874,   Zx:82.8,  Zy:82.8,  ix:4.99,  iy:4.99  }
    ]
  },
```

---

## 変更③ data.js — renderDataSpec 関数の SVG 描画部分を更新

`renderDataSpec` 関数内の「SVG断面図（H形鋼）」コメントのブロックを以下に置き換える。

**変更前：**
```js
  // SVG断面図（H形鋼）
  const svgEl = document.getElementById('dataSVGWrap');
  if (svgEl) {
    svgEl.innerHTML = drawHBeamSVG(spec.H, spec.B, spec.t1, spec.t2, spec.r, 260, 210);
  }
```

**変更後：**
```js
  // SVG断面図（鋼種タイプに応じて切り替え）
  const svgEl = document.getElementById('dataSVGWrap');
  if (svgEl) {
    if (kindData.type === 'H') {
      svgEl.innerHTML = drawHBeamSVG(spec.H, spec.B, spec.t1, spec.t2, spec.r, 260, 210);
    } else if (kindData.type === 'L') {
      svgEl.innerHTML = drawLAngleSVG(spec.A, spec.B, spec.t, spec.r1, spec.r2, spec.Cx, spec.Cy, 260, 210);
    }
  }
```

---

## 変更④ data.js — renderDataSpec 関数の寸法グリッド部分を更新

`renderDataSpec` 関数内の「断面寸法グリッド」コメントのブロックを以下に置き換える。

**変更前：**
```js
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
```

**変更後：**
```js
  // 断面寸法グリッド（鋼種タイプに応じて切り替え）
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
    }
  }
```

---

## 変更⑤ data.js — renderDataKindTabs で '山形鋼' を利用可能にする

`renderDataKindTabs` 関数内（変更不要 — `SECTION_DATA` に '山形鋼' が追加されれば自動的に available になる）。

---

## 変更⑥ data.js — 準備中ノートのテキストを更新

`renderDataSpec` 関数または index.html の `dp-wip-note` の文字列を更新する。

**変更前：**
```
※ 山形鋼・溝形鋼・平鋼・丸鋼・角パイプ・丸パイプのデータは準備中です
```

**変更後：**
```
※ 溝形鋼・平鋼・丸鋼・角パイプ・丸パイプのデータは準備中です
```

`index.html` の `class="dp-wip-note"` の div 内テキストを上記に変更する。

---

## 断面SVGパスの解説（実装の参考）

L形鋼（等辺山形鋼）のパスは「左下角→左上→右上→縦辺内面下→根元フィレット→横辺内面右→右上→右下→底面左」の時計回り。

```
 ┌─── 縦辺 ───┐
 │ ↑up  r2   │
 │         r1│╲
 │            ╲ 根元フィレット（凹、sweep=0）
 └──────────────┘
       横辺      B
```

**フィレットのsweepフラグ：**
- 先端フィレット（r2、凸）: `sweep=1`（CW）
- 根元フィレット（r1、凹）: `sweep=0`（CCW）

---

## 注意事項

- `data.js` への追記は既存の `drawHBeamSVG` 関数と `SECTION_DATA` を**一切変更しない**
- `SECTION_DATA['山形鋼']` を追加するだけで `renderDataKindTabs` が自動的に山形鋼タブをアクティブにする
- H形鋼の動作は既存のまま維持する
- 他ページは一切変更しない
