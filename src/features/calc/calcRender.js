function showRegisterRemnantsBtn(resultData) {
  var rems = extractRemnants(resultData);
  var existing = document.getElementById('regRemBtn');
  if (existing) existing.remove();
  if (!rems.length) return;
  var minLen = parseInt((document.getElementById('minRemnantLen')||{}).value)||500;
  var validRems = rems.filter(function(r){ return r.len >= minLen; });
  if (!validRems.length) return;
  var btn = document.createElement('div');
  btn.id = 'regRemBtn';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:1000;display:flex;flex-direction:column;gap:8px;align-items:flex-end';
  btn.innerHTML =
    '<button onclick="doRegisterRemnants()" style="background:var(--cy);color:#000;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(34,211,238,.35);white-space:nowrap">' +
    '🗄 端材 '+validRems.length+'本を在庫登録</button>';
  btn._rems = validRems;
  document.body.appendChild(btn);
}

function doRegisterRemnants() {
  var btn = document.getElementById('regRemBtn');
  if (!btn || !btn._rems) return;
  registerRemnants(btn._rems);
  btn.remove();
  var n = btn._rems.length;
  // トースト通知
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:1001;background:var(--gn);color:#000;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;box-shadow:0 4px 16px rgba(74,222,128,.35);transition:opacity .5s';
  toast.textContent = '✅ 端材'+n+'本を在庫に登録しました';
  document.body.appendChild(toast);
  setTimeout(function(){ toast.style.opacity='0'; setTimeout(function(){toast.remove();},500); }, 2500);
}

// ============================================================
// 描画
// ============================================================

function patRows(bars) {
  return groupBars(bars).map(function(g) {
    // 同じ長さをまとめて「900 × 2」形式で表示
    var pieceCounts = {};
    g.pat.forEach(function(p){ pieceCounts[p] = (pieceCounts[p]||0)+1; });
    var sortedPieces = Object.keys(pieceCounts).map(Number).sort(function(a,b){return b-a;});
    var pieceStr = sortedPieces.map(function(len){
      var n = pieceCounts[len];
      return len.toLocaleString() + (n > 1 ? ' × ' + n : '');
    }).join(' ＋ ');
    return '<div class="pc-row">' +
      '<span class="px">×' + g.cnt + '</span>' +
      '<span class="pp">' + pieceStr + '</span>' +
      '' +
      '</div>';
  }).join('');
}

// ★ 切断図（バービジュアライザー）を生成

// ============================================================
// render: 結果エリアをクリアして各セクションを組み立て
// ============================================================
function render(single, top3, chgPlans, endLoss, remnantBars, kgm, allDP, origPieces, bundlePlan, patA, patB, patC, yieldCard1, yieldCard2) {
  var ph = document.getElementById('ph');
  if (ph) ph.style.display = 'none';
  var rp = document.getElementById('rp');
  while (rp.firstChild) rp.removeChild(rp.firstChild);
  var yieldBest = yieldCard1 || (allDP && allDP.length ? allDP[0] : null);
  var currentJob = typeof getJobInfo === 'function' ? getJobInfo() : {};

  // ── 作業指示書ヘッダー（印刷時のみ表示）──
  var blade2 = parseInt(document.getElementById('blade').value) || 3;
  var endLoss2 = parseInt(document.getElementById('endloss').value) || 75;
  var kgmVal = parseFloat(document.getElementById('kgm').value) || 0;
  var specVal = document.getElementById('spec') ? document.getElementById('spec').value : '';
  var jobDate = new Date().toLocaleDateString('ja-JP', {year:'numeric',month:'2-digit',day:'2-digit'});

  // 部材リスト収集
  var partRows = '';
  var totKg = 0;
  for (var pi=0; pi<totalRows; pi++) {
    var lEl=document.getElementById('pl'+pi), qEl=document.getElementById('pq'+pi);
    if (!lEl) continue;
    var l=parseInt(lEl.value), q=parseInt(qEl.value);
    if (l>0 && q>0) {
      var kg = (l/1000)*kgmVal*q;
      totKg += kg;
      partRows += '<tr><td style="text-align:center">'+(partRows.split('<tr>').length)+'</td><td>'+l.toLocaleString()+' mm</td><td style="text-align:center">'+q+'</td></tr>';
    }
  }

  var jobHeader = mk('div','print-job-header');
  // XSS 防御（2026-05-01）: spec はカスタム鋼材名を含むのでエスケープ必須
  var _esc = (window.Toriai && window.Toriai.utils && window.Toriai.utils.html && window.Toriai.utils.html.escapeHtml) || function(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  };
  jobHeader.innerHTML =
    '<div class="job-title">✂ 鋼材切断作業指示書</div>' +
    '<div class="job-meta">' +
      '<span>発行日：'+_esc(jobDate)+'</span>' +
      '<span>鋼材規格：'+_esc(specVal)+'</span>' +
      '<span>刃厚：'+(blade2|0)+'mm</span>' +
      '<span>端部ロス（両側合計）：'+(endLoss2|0)+'mm</span>' +
      '' +
    '</div>' +
    '<table>' +
      '<thead><tr><th>#</th><th>長さ</th><th>本数</th></tr></thead>' +
      '<tbody>' + partRows + '</tbody>' +
      '' +
    '</table>';
  jobHeader.style.display = 'none'; // 画面では非表示
  rp.appendChild(jobHeader); // 作業指示書は印刷時のみ（CSSで制御）

  // ★ 残材消費結果を表示
  // 残材カード: 組み合わせ最適化の前に統合表示
  // (remnantBarsは後続の組み合わせカードと統合して表示)

  // ── 残材のみモード ──
  if (remnantBars && remnantBars.length && !yieldBest && (!allDP || !allDP.length)) {
    var remOnlySec = mk('div', 'an');
    var remOnlyDiag = '';
    var rgo = {};
    remnantBars.forEach(function(rb){ var k=rb.sl; if(!rgo[k]) rgo[k]=[]; rgo[k].push(rb); });
    sortStockLengthsForDisplay(Object.keys(rgo).map(Number)).forEach(function(sl){
      remOnlyDiag += buildCutDiagram(rgo[sl], parseInt(sl), '残材 ' + parseInt(sl).toLocaleString() + 'mm');
    });
    // 端材リスト（残材の loss > 0 のもの）
    var minVL = parseInt(document.getElementById('minRemnantLen') ? document.getElementById('minRemnantLen').value : 500) || 500;
    var remEndCounted = {};
    remnantBars.forEach(function(rb){ if(rb.loss >= minVL && rb.loss > 0){ remEndCounted[rb.loss]=(remEndCounted[rb.loss]||0)+1; } });
    var remEndHtml = Object.keys(remEndCounted).length
      ? Object.keys(remEndCounted).map(Number).sort(function(a,b){return b-a;}).map(function(l){
          var n=remEndCounted[l];
          return '<span class="rem-pill-item">'+l.toLocaleString()+'mm'+(n>1?' <b>×'+n+'</b>':'')+'</span>';
        }).join('')
      : '<span style="font-size:11px;color:#8888a8">なし</span>';

    var remOnlyCardId = 'card_remonly_' + Date.now();
    rp.insertAdjacentHTML('beforeend', buildCalcProjectToolbar({
      customer: currentJob.client,
      projectName: currentJob.name,
      deadline: currentJob.deadline,
      memo: currentJob.memo
    }));
    remOnlySec.innerHTML =
      '<div class="res-hd"><div class="res-ttl">手持ち残材リスト</div></div>' +
      '<div class="cc yield-card r1" id="' + remOnlyCardId + '">' +
        '<div class="cc-hd">' +
          '<div class="cc-desc" style="color:var(--cy)">残材活用</div>' +
          '<div class="cc-stats">' +
            '<div class="cs"><div class="cl">残材本数</div><div class="cv">' + remnantBars.length + ' 本</div></div>' +
          '</div>' +
'<div class="cc-btns">' + buildCardActionButtons(remOnlyCardId, true) + '</div>' +
        '</div>' +
        '<div class="rem-section rem-strip">' +
          '<div class="rem-strip-label">端材リスト</div>' +
          '<div class="rem-strip-pills">' + remEndHtml + '</div>' +
        '</div>' +
        remOnlyDiag +
      '</div>';
    rp.appendChild(remOnlySec);
    updateCartBadge();
    return;
  }

  // ── 歩留まり最大プラン ──
  if (yieldBest) {
    var yieldSec = mk('div', 'an');
    // No.1：歩留まり最大、No.2：カット数考慮型（存在する場合のみ）
    var yieldCards = [yieldCard1].filter(Boolean);
    if (yieldCards.length) {
      rp.insertAdjacentHTML('beforeend', buildCalcProjectToolbar({
        customer: currentJob.client,
        projectName: currentJob.name,
        deadline: currentJob.deadline,
        memo: currentJob.memo
      }));
    }
    var yieldCardHtmls = yieldCards.map(function(yb, yi) {
      // bars を定尺ごとにグループ化（BnB混在定尺対応）
      var allBarsY = yb.bars || yb.bA || [];
      var slGroupsY = {};
      allBarsY.forEach(function(b){
        var sl = b.sl || yb.slA;
        if (!slGroupsY[sl]) slGroupsY[sl] = [];
        slGroupsY[sl].push(b);
      });
      // solver が既に残材を bars に含めているか判定（BUG-FIX 2026-04）
      var hasRemnantBarsInYield = allBarsY.some(function(bar) {
        var sl = (bar && bar.sl) || yb.slA || 0;
        return sl && typeof isStdStockLength === 'function' && !isStdStockLength(sl);
      });
      // solver が残材を含んでいない場合のみ、別管理の remnantBars を表示用にマージ
      var effectiveRemnantBars = (remnantBars && remnantBars.length && !hasRemnantBarsInYield) ? remnantBars : [];
      if (effectiveRemnantBars.length) {
        effectiveRemnantBars.forEach(function(rb) {
          var sl = rb.sl;
          if (!sl) return;
          if (!slGroupsY[sl]) slGroupsY[sl] = [];
          slGroupsY[sl].push(rb);
        });
      }
      var sortedSlsY = sortStockLengthsForDisplay(Object.keys(slGroupsY).map(Number));
      var ySummaryText = sortedSlsY.map(function(sl) {
        return sl.toLocaleString() + 'mm × ' + slGroupsY[sl].length;
      }).join(' + ');
      var yPatHtml = '';
      sortedSlsY.forEach(function(sl, si){
        var barsInSl = slGroupsY[sl];
        var cls = si === 0 ? 'pc best' : 'pc';
        yPatHtml += '<div class="' + cls + '"><div class="pc-hd"><span>' +
          sl.toLocaleString() + 'mm × ' + barsInSl.length + '</span></div>' +
          patRows(barsInSl) + '</div>';
      });
      // 切断図：残材と定尺は別ルートで描画（二重描画防止 BUG-FIX 2026-04）
      var yDiag2 = '';
      if (effectiveRemnantBars.length) {
        var rgy2 = {};
        effectiveRemnantBars.forEach(function(rb){ var k=rb.sl; if(!rgy2[k]) rgy2[k]=[]; rgy2[k].push(rb); });
        sortStockLengthsForDisplay(Object.keys(rgy2).map(Number)).forEach(function(sl){ yDiag2 += buildCutDiagram(rgy2[sl], parseInt(sl), '残材 ' + parseInt(sl).toLocaleString() + 'mm'); });
      }
      sortedSlsY.forEach(function(sl){
        // 残材は上の block で出しているのでスキップ（二重描画防止）
        if (typeof isStdStockLength === 'function' && !isStdStockLength(sl)) return;
        yDiag2 += buildCutDiagram(slGroupsY[sl], sl, sl.toLocaleString() + 'mm 定尺');
      });
      var yCardId2 = 'card_yield_' + yi;
      var yDetailId2 = 'detail_yield_' + yi;

      var yieldRemHtml = effectiveRemnantBars.length
        ? buildRemHtmlFromRemnants(extractRemnantsFromBars(effectiveRemnantBars))
        : '<span style="font-size:11px;color:#8888a8">なし</span>';

      // 残材分を加算した集計値（BUG-FIX 2026-04）
      var remUsable = effectiveRemnantBars.reduce(function(s, b){ return s + (b.sl || 0); }, 0);
      var remPieceLen = effectiveRemnantBars.reduce(function(s, b){
        return s + ((b.pat || []).reduce(function(a, p){ return a + p; }, 0));
      }, 0);

      // 歩留まりも残材を分母に含めて再計算
      var stockUsable = allBarsY.reduce(function(s, b){ return s + (b.sl || yb.slA || 0); }, 0);
      var stockPieceLen = allBarsY.reduce(function(s, b){
        return s + ((b.pat || []).reduce(function(a, p){ return a + p; }, 0));
      }, 0);
      var totalUsable = stockUsable + remUsable;
      var totalPieceLen = stockPieceLen + remPieceLen;
      var yld2 = totalUsable > 0 ? ((totalPieceLen / totalUsable) * 100).toFixed(1) : (100 - yb.lossRate).toFixed(1);

      return '<div class="cc" id="' + yCardId2 + '" style="border:1.5px solid #d4d4dc">' +
        '<div class="cc-hd">' +
          '<div class="cc-desc" style="color:#1a1a2e">' + ySummaryText +
            (effectiveRemnantBars.length ? '<span style="margin-left:8px;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;background:rgba(34,211,238,.18);border:1px solid var(--cy);color:var(--cy);vertical-align:middle">残材消費</span>' : '') +
          '</div>' +
          '<div class="cc-stats" style="margin-left:auto">' +
            '<div class="cs"><div class="cl">歩留まり</div><div class="cv">' + yld2 + ' %</div></div>' +
            '<div class="cs"><div class="cl">カット数</div><div class="cv">' + (yb.chg || '—') + ' 回</div></div>' +
            '<div class="cs"><div class="cl">母材合計重量</div><div class="cv">' + formatMaterialTotalWeightKg(yb.barKg) + '</div></div>' +
          '</div>' +
'<div class="cc-btns">' + buildCardActionButtons(yCardId2, true) + '</div>' +
        '</div>' +
        yDiag2 +
        '<div class="rem-section rem-strip">' +
          '<div class="rem-strip-label">端材リスト</div>' +
          '<div class="rem-strip-pills">' + yieldRemHtml + '</div>' +
        '</div>' +
        '<button class="detail-toggle" type="button" onclick="toggleCardDetail(\'' + yDetailId2 + '\',this)">詳細を表示 ▼</button>' +
        '<div class="cc-detail-body" id="' + yDetailId2 + '">' +
          '<div class="cc-pat"><div class="pgrid">' + yPatHtml + '</div></div>' +
        '</div>' +
      '</div>';
    }).join('');

    var yieldSec = mk('div', 'an');
    yieldSec.innerHTML =
      '<div class="res-hd">' +
        '<div class="res-ttl">歩留まり最大</div>' +
      '</div>' +
      '<div class="clist">' + yieldCardHtmls + '</div>';
    rp.appendChild(yieldSec);
  }

  // ── 3パターン取り合い ──
  var patterns = [patA, patB].filter(Boolean); // patCは廃止
  if (patterns.length) {
    var PAT_CFG = {
      'A':   { color:'#1a1a2e', bg:'', icon:'', name:'同一パターン最大', sub:'90%以上' },
      'B90': { color:'#1a1a2e', bg:'', icon:'', name:'同一パターン最大', sub:'80%以上' },
      'B80': { color:'#1a1a2e', bg:'', icon:'', name:'同一パターン最大', sub:'80%以上' },
      'C':   { color:'#1a1a2e', bg:'', icon:'', name:'バランス型', sub:'' }
    };

    // パターンBを展開、重複排除しながらdisplayPatsを構築
    var displayPats = [];
    var seenPatKey = {};

    function patKey(p) {
      if (!p || !p.bars) return '';
      // ユニークパターン（同一バー構成）だけでキー生成 → 順序・本数の違いを吸収
      var uniq = {};
      p.bars.forEach(function(b){
        var k = (b.sl||0)+':'+b.pat.slice().sort(function(a,b){return b-a;}).join(',');
        uniq[k] = (uniq[k]||0)+1;
      });
      return Object.keys(uniq).sort().map(function(k){return k+'x'+uniq[k];}).join('|');
    }

    patterns.forEach(function(p) {
      if (p.label === 'B') {
        // plan90があれば表示
        if (p.plan90) {
          var k90 = patKey(p.plan90);
          if (!seenPatKey[k90]) {
            seenPatKey[k90] = true;
            displayPats.push({ label:'B90', name:'Pattern B', bars:p.plan90.bars, sl:p.plan90.sl, metrics:p.plan90.metrics });
          }
        }
        // plan80があれば表示（plan90と重複しない場合）
        if (p.plan80) {
          var k80 = patKey(p.plan80);
          if (k80 && !seenPatKey[k80]) {
            seenPatKey[k80] = true;
            displayPats.push({ label:'B80', name:'Pattern B', bars:p.plan80.bars, sl:p.plan80.sl, metrics:p.plan80.metrics });
          }
        }
      } else {
        var kp = patKey(p);
        if (!seenPatKey[kp]) {
          seenPatKey[kp] = true;
          displayPats.push(p);
        }
      }
    });

    if (!yieldBest && displayPats.length) {
      rp.insertAdjacentHTML('beforeend', buildCalcProjectToolbar({
        customer: currentJob.client,
        projectName: currentJob.name,
        deadline: currentJob.deadline,
        memo: currentJob.memo
      }));
    }

    function buildPatCard(pat) {
      var cfg = PAT_CFG[pat.label] || { color:'var(--g2)', bg:'', icon:'', sub:'' };
      // 実際の歩留まり率で sub ラベルを上書き
      if (pat.metrics && pat.metrics.yieldPct !== undefined) {
        var _yp = pat.metrics.yieldPct;
        cfg = Object.assign({}, cfg, {
          sub: _yp >= 90 ? '90%以上' : _yp >= 80 ? '80%以上' : _yp.toFixed(1) + '%'
        });
      }
      // 実際の歩留まり率で sub を動的に設定
      if (pat.metrics && pat.metrics.yieldPct !== undefined) {
        var yPct = pat.metrics.yieldPct;
        if (yPct >= 90) cfg = Object.assign({}, cfg, {sub:'90%以上'});
        else if (yPct >= 80) cfg = Object.assign({}, cfg, {sub:'80%以上'});
        else cfg = Object.assign({}, cfg, {sub: yPct.toFixed(1)+'%'});
      }
      var m = pat.metrics;
      var isRec = pat.label === 'C';
      var detailId = 'detail_pat_' + pat.label + '_' + Date.now();

      // 切断図（定尺別グループ、同一パターン数の多い順）
      var diagHtml = '';
      if (pat.bars && pat.bars.length) {
        var slGroups = {};
        pat.bars.forEach(function(b) {
          var key = b.sl || pat.sl;
          if (!slGroups[key]) slGroups[key] = [];
          slGroups[key].push(b);
        });
        // 各定尺グループ内でbarsを同一パターン数の多い順にソート
        // groupBarsで同一パターンをまとめ、cnt降順でbuildCutDiagramに渡す
        sortStockLengthsForDisplay(Object.keys(slGroups).map(Number)).forEach(function(sl) {
          var barsInSl = slGroups[sl];
          // 同一パターン数が多い順にソート
          var grouped = groupBars(barsInSl);
          grouped.sort(function(a,b){return b.cnt - a.cnt;});
          // cntの多い順にbarsを再構築
          var sortedBars = [];
          grouped.forEach(function(g){
            for(var gi=0;gi<g.cnt;gi++) sortedBars.push({pat:g.pat, loss:g.loss});
          });
          diagHtml += buildCutDiagram(sortedBars, parseInt(sl), parseInt(sl).toLocaleString() + 'mm 定尺');
        });
      }

      // 端材リスト（minRemnantLen以上のみ・同じ長さをまとめてx表示）
      var minRemnantLen = parseInt((document.getElementById('minRemnantLen')||{}).value) || 500;
      var remRaw = (pat.bars||[]).filter(function(b){ return b.loss >= minRemnantLen && b.loss > 0; })
        .map(function(b){ return b.loss; }).sort(function(a,b){return b-a;});
      var remCounted = {};
      remRaw.forEach(function(l){ remCounted[l] = (remCounted[l]||0)+1; });
      var remHtml = remRaw.length
        ? Object.keys(remCounted).map(Number).sort(function(a,b){return b-a;}).map(function(l){
            var n = remCounted[l];
            return '<span class="rem-pill-item">' + l.toLocaleString() + 'mm' + (n>1?' <b>×'+n+'</b>':'') + '</span>';
          }).join('')
        : '<span style="font-size:11px;color:#8888a8">なし（' + minRemnantLen.toLocaleString() + 'mm未満除外）</span>';

      // パターン詳細（定尺別）
      var slGroupsCard = {};
      (pat.bars||[]).forEach(function(b) {
        var key = b.sl || pat.sl;
        if (!slGroupsCard[key]) slGroupsCard[key] = [];
        slGroupsCard[key].push(b);
      });
      var patDetailHtml = sortStockLengthsForDisplay(Object.keys(slGroupsCard).map(Number)).map(function(sl) {
        var barsInSl = slGroupsCard[sl];
        var grouped2 = groupBars(barsInSl);
        var rowsHtml = grouped2.map(function(g){
          var pc = {};
          g.pat.forEach(function(p){ pc[p]=(pc[p]||0)+1; });
          var ps = Object.keys(pc).map(Number).sort(function(a,b){return b-a;});
          var pieceStr = ps.map(function(l){ return l.toLocaleString()+(pc[l]>1?' × '+pc[l]:''); }).join(' ＋ ');
          return '<div class="pc-row"><span class="px">×' + g.cnt + '</span><span class="pp">' + pieceStr + '</span></div>';
        }).join('');
        return '<div class="pc best" style="margin-bottom:4px"><div class="pc-hd"><span>' + parseInt(sl).toLocaleString() + 'mm × ' + barsInSl.length + '本</span></div>' + rowsHtml + '</div>';
      }).join('');

      var cardId2 = 'card_pat_' + pat.label + '_' + Date.now();
      // 定尺別本数サマリー（印刷用）
      var slSummary = sortStockLengthsForDisplay(Object.keys(slGroupsCard).map(Number)).map(function(sl){
        return parseInt(sl).toLocaleString() + 'mm × ' + slGroupsCard[sl].length + '本';
      }).join('　＋　');
      // 定尺別本数サマリー
      var slSummary = sortStockLengthsForDisplay(Object.keys(slGroupsCard).map(Number)).map(function(sl){
        return parseInt(sl).toLocaleString() + 'mm × ' + slGroupsCard[sl].length;
      }).join(' + ');
      return '<div class="cc" id="' + cardId2 + '" style="border:1.5px solid #d4d4dc">' +
        '<div class="cc-hd">' +
          '<div class="cc-desc" style="color:#1a1a2e">' + slSummary +
            (cfg.sub ? '<span style="margin-left:8px;font-size:10px;font-weight:700;padding:1px 7px;border-radius:20px;background:#f0f0f4;color:#5a5a78;vertical-align:middle">' + cfg.sub + '</span>' : '') +
            (remnantBars && remnantBars.length ? '<span style="margin-left:6px;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;background:rgba(34,211,238,.18);border:1px solid var(--cy);color:var(--cy);vertical-align:middle">残材消費</span>' : '') +
          '</div>' +
          '<div class="cc-stats" style="margin-left:auto">' +
            '<div class="cs"><div class="cl">歩留まり</div><div class="cv">' + m.yieldPct.toFixed(1) + ' %</div></div>' +
            '<div class="cs"><div class="cl">カット数</div><div class="cv">' + m.totalCuts + ' 回</div></div>' +
            '<div class="cs"><div class="cl">母材合計重量</div><div class="cv">' + formatMaterialTotalWeightKg(m.barKg) + '</div></div>' +
          '</div>' +
'<div class="cc-btns">' + buildCardActionButtons(cardId2, true) + '</div>' +
        '</div>' +
        diagHtml +
        '<div class="rem-section rem-strip">' +
          '<div class="rem-strip-label">端材リスト</div>' +
          '<div class="rem-strip-pills">' + remHtml + '</div>' +
        '</div>' +
        '<button class="detail-toggle" type="button" onclick="toggleCardDetail(\'' + detailId + '\',this)">詳細を表示 ▼</button>' +
        '<div class="cc-detail-body" id="' + detailId + '">' +
          '<div class="cc-pat"><div class="pgrid">' + patDetailHtml + '</div></div>' +
        '</div>' +
      '</div>';
    }

    var patGrid = displayPats.map(buildPatCard).join('');

    var patSec = mk('div', 'an');
    patSec.innerHTML =
      '<div class="res-hd" style="margin-bottom:12px">' +
        '<div class="res-ttl">取り合いパターン比較</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px">' + patGrid + '</div>';
    rp.appendChild(patSec);
  }
  updateCartBadge();
  // 端材リスト UI の差し込み（src/features/calc/cardRemnants.js）
  if (typeof hydrateCardRemnantLists === 'function') hydrateCardRemnantLists();
}
