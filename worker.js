/**
 * steel_optimizer worker.js
 * Web Worker として動作する計算エンジン。
 * メインスレッドから postMessage({mode, ...params}) を受け取り、
 * 計算結果を postMessage({ok, result, mode}) で返す。
 *
 * mode:
 *   'yield'  → 歩留まり最大計算 (BnB + DP)
 *   'patA'   → 同一パターン最大 (歩留まり90%以上)
 *   'patB'   → 同一パターン最大 (歩留まり80%以上)
 */

// ── 定数 ──────────────────────────────────────────────────
/** @type {number[]} デフォルト定尺リスト (mm) */
var STD = [5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000];

// ── 貪欲法パッキング ──────────────────────────────────────
/**
 * 部材リストを1本の鋼材に貪欲に詰める（長い順）。
 * DP対象種類数が9以上の場合はこちらを使う。
 * @param {number[]} pieces - 部材長さ配列
 * @param {number} eff - 有効長さ (定尺 - 端部ロス)
 * @param {number} blade - 刃厚 (mm)
 * @returns {{pat: number[], loss: number}[]} - 切断バーのリスト
 */
function pack(pieces,eff,blade){
  var remaining=pieces.slice().sort(function(a,b){return b-a;});
  var bars=[];
  while(remaining.length>0){
    var cnt2={};remaining.forEach(function(p){cnt2[p]=(cnt2[p]||0)+1;});
    var kinds=Object.keys(cnt2).length;
    var best;
    if(kinds<=8){best=dpBestPat(remaining,eff,blade);}
    else{
      var space=eff,pat=[],unused=[];
      remaining.forEach(function(p){var add=p+(pat.length>0?blade:0);if(space-add>=0){space-=add;pat.push(p);}else unused.push(p);});
      best={pat:pat,used:pat.reduce(function(s,p){return s+p;},0),loss:space};
    }
    if(!best.pat.length)break;
    bars.push({pat:best.pat,loss:best.loss});
    var rem2=remaining.slice();
    best.pat.forEach(function(p){var ix=rem2.indexOf(p);if(ix>=0)rem2.splice(ix,1);});
    remaining=rem2;
  }
  return bars;
}

function packWithRemnants(pieces,remnants,stdStocks,blade,endLoss){
  var sortedRemnants=remnants.slice().sort(function(a,b){return b-a;});
  var remaining=pieces.slice().sort(function(a,b){return b-a;});
  var allBars=[];
  sortedRemnants.forEach(function(remLen){
    if(!remaining.length)return;
    var eff=remLen-endLoss;if(eff<=0)return;
    var space=eff,pat=[],unused=[];
    remaining.forEach(function(p){var add=p+(pat.length>0?blade:0);if(space-add>=0){space-=add;pat.push(p);}else unused.push(p);});
    if(!pat.length)return;
    remaining=unused;
    allBars.push({pat:pat,loss:space,sl:remLen});
  });
  return{remaining:remaining,remnantBars:allBars};
}

function groupBars(bars){
  var g=[];
  bars.forEach(function(b){
    var key=b.pat.join(',')+':'+b.loss;
    var f=g.find(function(x){return x.key===key;});
    if(f)f.cnt++;else g.push({key:key,pat:b.pat,loss:b.loss,cnt:1});
  });
  return g;
}

function calcMetrics(bars,sl,endLoss,kgm,minValidLen){
  minValidLen=minValidLen||500;
  var switchCount=0,validRemnants=0,invalidRemnants=0;
  var patternMap={};
  var prevLen=null;
  var totalLoss=0,totalUsable=0;
  bars.forEach(function(b){
    totalUsable+=(b.sl||sl);
    totalLoss+=b.loss;
    b.pat.forEach(function(len){
      if(prevLen!==null&&len!==prevLen)switchCount++;
      prevLen=len;
    });
    if(b.loss>=minValidLen)validRemnants++;
    else if(b.loss>0)invalidRemnants++;
    var key=b.pat.slice().sort(function(a,b){return b-a;}).join(',');
    patternMap[key]=(patternMap[key]||0)+1;
  });
  var totalCuts=Object.keys(patternMap).reduce(function(acc,key){
    var patLen=key?key.split(',').length:0;return acc+1+patLen;
  },0);
  var samePatternCount=Object.keys(patternMap).reduce(function(mx,k){return Math.max(mx,patternMap[k]);},0);
  var totalPieceLen=0;
  bars.forEach(function(b){b.pat.forEach(function(p){totalPieceLen+=p;});});
  var yieldPct=totalUsable>0?(totalPieceLen/totalUsable)*100:0;
  var lossKg=(totalLoss/1000)*kgm;
  // 残材混在時も正しく計算するため per-bar 合計（BUG-FIX 2026-04）
  var barKg=bars.reduce(function(acc,b){return acc+((b.sl||sl)/1000)*kgm;},0);
  var lossRate=100-yieldPct;
  var balanceScore=yieldPct*0.5-totalCuts*0.2-invalidRemnants*0.2-switchCount*0.1;
  return{totalCuts:totalCuts,switchCount:switchCount,validRemnants:validRemnants,
    invalidRemnants:invalidRemnants,samePatternCount:samePatternCount,
    yieldPct:yieldPct,lossRate:lossRate,lossKg:lossKg,barKg:barKg,
    totalLoss:totalLoss,balanceScore:balanceScore,barCount:bars.length,patternMap:patternMap};
}

function bestStockForPat(pat,stocks,blade,endLoss){
  var needed=pat.reduce(function(s,p,i){return s+p+(i>0?blade:0);},0);
  var sorted=stocks.slice().sort(function(a,b){return a.sl-b.sl;});
  for(var i=0;i<sorted.length;i++){if(sorted[i].sl-endLoss>=needed)return sorted[i];}
  return null;
}

// ---- CSP Engine ----

function enumAllPatterns(stocks,items,demArr,blade,endLoss){
  var allPats=[];
  stocks.forEach(function(s){
    var eff=s.sl-endLoss;if(eff<=0)return;
    function bt(idx,rem,cur){
      if(cur.length>0){
        var piece=cur.reduce(function(a,p){return a+p;},0);
        allPats.push({pat:cur.slice(),sl:s.sl,eff:eff,loss:rem,piece:piece,yld:piece/eff});
      }
      for(var i=idx;i<items.length;i++){
        var w=items[i]+(cur.length>0?blade:0);
        if(rem<w)continue;
        var used=0;for(var k=0;k<cur.length;k++)if(cur[k]===items[i])used++;
        if(used>=demArr[i])continue;
        cur.push(items[i]);bt(i,rem-w,cur);cur.pop();
      }
    }
    bt(0,eff,[]);
  });
  allPats.sort(function(a,b){return b.yld-a.yld;});
  return allPats;
}

function bnbSolve(demArr,items,allPats,timeLimit){
  var best={sol:null,bars:Infinity,piece:0};
  var deadline=Date.now()+(timeLimit||2000);
  function bnb(rem,chosen,bars){
    if(Date.now()>deadline)return;
    if(!rem.some(function(r){return r>0;})){
      var piece=chosen.reduce(function(s,c){return s+c.piece;},0);
      if(bars<best.bars||(bars===best.bars&&piece>best.piece)){
        best.bars=bars;best.piece=piece;best.sol=chosen.slice();
      }
      return;
    }
    if(bars>=best.bars)return;
    var totalRem=rem.reduce(function(s,r,i){return s+r*items[i];},0);
    var maxEff=allPats.length?allPats[allPats.length-1].eff:1;
    if(bars+Math.ceil(totalRem/Math.max(maxEff,1))>=best.bars)return;
    var tried=0;
    for(var pi=0;pi<allPats.length&&tried<120;pi++){
      var p=allPats[pi];var ok=true;
      for(var i=0;i<items.length;i++){
        var n=0;for(var k=0;k<p.pat.length;k++)if(p.pat[k]===items[i])n++;
        if(n>rem[i]){ok=false;break;}
      }
      if(!ok)continue;tried++;
      var nr=rem.slice();
      for(var i=0;i<items.length;i++){
        var n=0;for(var k=0;k<p.pat.length;k++)if(p.pat[k]===items[i])n++;
        nr[i]-=n;
      }
      chosen.push(p);bnb(nr,chosen,bars+1);chosen.pop();
    }
  }
  bnb(demArr,[],0);
  return best;
}

function findRepeatPlans(pieces,stocks,blade,endLoss,kgm,yieldThreshold){
  var cnt={};
  pieces.forEach(function(p){cnt[p]=(cnt[p]||0)+1;});
  var items=Object.keys(cnt).map(Number).sort(function(a,b){return b-a;});
  var demArr=items.map(function(l){return cnt[l];});
  if(!items.length)return[];
  var allPats=enumAllPatterns(stocks,items,demArr,blade,endLoss);
  if(!allPats.length)return[];
  function maxRep(p){
    var mr=Infinity;
    items.forEach(function(l,i){
      var n=0;for(var k=0;k<p.pat.length;k++)if(p.pat[k]===l)n++;
      if(n>0)mr=Math.min(mr,Math.floor(demArr[i]/n));
    });
    return isFinite(mr)?mr:0;
  }
  var candidates=allPats.map(function(p){
    var mr=maxRep(p);
    return{pat:p,maxRep:mr,score:p.yld*mr};
  }).filter(function(c){
    return c.maxRep>=2&&c.pat.yld>=yieldThreshold/100;
  }).sort(function(a,b){
    return b.score-a.score||b.maxRep-a.maxRep||b.pat.yld-a.pat.yld;
  });
  var results=[],seenPat={},deadline=Date.now()+1500;
  candidates.slice(0,30).forEach(function(cand){
    if(Date.now()>deadline)return;
    var p=cand.pat;
    var key=p.sl+'|'+p.pat.join(',');
    if(seenPat[key])return;seenPat[key]=true;
    var nr=demArr.slice(),ok=true;
    items.forEach(function(l,i){
      var n=0;for(var k=0;k<p.pat.length;k++)if(p.pat[k]===l)n++;
      nr[i]-=n*cand.maxRep;if(nr[i]<0)ok=false;
    });
    if(!ok)return;
    var remBest;
    if(nr.some(function(r){return r>0;})){
      var remDem=items.map(function(l,i){return nr[i];});
      var remPats=enumAllPatterns(stocks,items,remDem,blade,endLoss);
      remBest=bnbSolve(nr,items,remPats,800);
    }else{remBest={sol:[],bars:0,piece:0};}
    if(!remBest.sol)return;
    var repBars=[];
    for(var i=0;i<cand.maxRep;i++)repBars.push({pat:p.pat.slice(),loss:p.loss,sl:p.sl});
    var allBars=repBars.concat(remBest.sol.map(function(c){return{pat:c.pat.slice(),loss:c.loss,sl:c.sl};}));
    var totalUsable=allBars.reduce(function(s,b){return s+b.sl;},0);
    var totalPiece=allBars.reduce(function(s,b){return s+b.pat.reduce(function(a,x){return a+x;},0);},0);
    var yld=totalUsable>0?totalPiece/totalUsable*100:0;
    var mm=calcMetrics(allBars,p.sl,endLoss,kgm);
    mm.yieldPct=yld;mm.patYieldPct=p.yld*100;mm.lossRate=100-yld;
    mm.barKg=allBars.reduce(function(s,b){return s+b.sl/1000*kgm;},0);
    mm.lossKg=allBars.reduce(function(s,b){return s+b.loss;},0)/1000*kgm;
    mm.barCount=allBars.length;mm.repeatCount=cand.maxRep;
    results.push({sl:p.sl,bars:allBars,repeat:cand.maxRep,yld:yld,patYld:p.yld*100,metrics:mm,pat:p.pat});
  });
  results.sort(function(a,b){return b.repeat-a.repeat||b.patYld-a.patYld;});
  var seen2={};
  return results.filter(function(r){
    var k=r.sl+'|'+r.pat.join(',');
    if(seen2[k])return false;seen2[k]=true;return true;
  });
}

function calcPatternA(pieces,stocks,blade,endLoss,kgm){
  var results=findRepeatPlans(pieces,stocks,blade,endLoss,kgm,90);
  if(!results.length)return null;
  var best=results[0];
  return{label:'A',name:'Pattern A',bars:best.bars,sl:best.sl,metrics:best.metrics};
}

function calcPatternB(pieces,stocks,blade,endLoss,kgm){
  var res90=findRepeatPlans(pieces,stocks,blade,endLoss,kgm,90);
  var repeatA=res90.length?res90[0].repeat:0;
  var res80=findRepeatPlans(pieces,stocks,blade,endLoss,kgm,80);
  if(!res80.length)return null;
  var better=res80.filter(function(r){return r.repeat>repeatA;});
  if(!better.length)return null;
  var plan80=better[0];
  return{label:'B',name:'Pattern B',plan90:null,
    plan80:{bars:plan80.bars,sl:plan80.sl,metrics:plan80.metrics}};
}

function calcPatternC(pieces,stocks,blade,endLoss,kgm){return null;}

var _dpCache={};
function dpBestPat(pieces,capacity,blade){
  var cnt={};pieces.forEach(function(p){cnt[p]=(cnt[p]||0)+1;});
  var lens=Object.keys(cnt).map(Number).sort(function(a,b){return b-a;});
  if(!lens.length)return{pat:[],used:0,loss:capacity};
  var key=capacity+'|'+lens.map(function(l){return l+':'+cnt[l];}).join(',');
  if(_dpCache[key])return _dpCache[key];
  var cap=capacity+blade,dp=new Array(cap+1).fill(null);
  dp[0]={used:0,prev:-1,item:0};
  lens.forEach(function(len){
    var maxTake=cnt[len],w=len+blade;
    for(var k=0;k<maxTake;k++)
      for(var c=cap;c>=w;c--){var pv=dp[c-w];if(!pv)continue;var nu=pv.used+len;if(!dp[c]||nu>dp[c].used)dp[c]={used:nu,prev:c-w,item:len};}
  });
  var best={pat:[],used:0,loss:capacity};
  for(var c2=cap;c2>=0;c2--){
    if(!dp[c2]||dp[c2].used===0)continue;
    var items2=[],cur=c2;
    while(cur>0&&dp[cur]&&dp[cur].prev>=0){items2.push(dp[cur].item);cur=dp[cur].prev;}
    if(!items2.length)continue;
    var au=items2.reduce(function(s,p){return s+p;},0),as2=au+(items2.length-1)*blade;
    if(as2<=capacity&&au>best.used){best={pat:items2.sort(function(a,b){return b-a;}),used:au,loss:capacity-as2};break;}
  }
  _dpCache[key]=best;return best;
}

function packDP(piecesIn,eff,blade){
  var remaining=piecesIn.slice().sort(function(a,b){return b-a;});
  var bars=[];
  while(remaining.length>0){
    var cnt2={};remaining.forEach(function(p){cnt2[p]=(cnt2[p]||0)+1;});
    var best;
    if(Object.keys(cnt2).length<=8){best=dpBestPat(remaining,eff,blade);}
    else{
      var space=eff,pat=[],unused=[];
      remaining.forEach(function(p){var add=p+(pat.length>0?blade:0);if(space-add>=0){space-=add;pat.push(p);}else unused.push(p);});
      best={pat:pat,used:pat.reduce(function(s,p){return s+p;},0),loss:space};
    }
    if(!best.pat.length)break;
    bars.push({pat:best.pat,loss:best.loss});
    var rem2=remaining.slice();
    best.pat.forEach(function(p){var ix=rem2.indexOf(p);if(ix>=0)rem2.splice(ix,1);});
    remaining=rem2;
  }
  return bars;
}

function calcBundlePlan(pieces,stocks,blade,endLoss,kgm){
  var sorted=pieces.slice().sort(function(a,b){return b-a;});
  var needed=sorted.reduce(function(s,p,i){return s+p+(i>0?blade:0);},0);
  var best=null;
  stocks.forEach(function(s){
    var eff=s.sl-endLoss;if(eff<needed)return;
    var loss=eff-needed;
    if(!best||s.sl<best.sl)best={sl:s.sl,pat:sorted.slice(),loss:loss,lossPerBar:loss,
      cutCount:1+sorted.length,lossRate:s.sl>0?(loss/eff)*100:100,
      barKg:(s.sl/1000)*kgm,lossKg:(loss/1000)*kgm};
  });
  return best;
}

function calcChargeMin(pieces,stocks,blade,endLoss,kgm){
  var cnt={};pieces.forEach(function(p){cnt[p]=(cnt[p]||0)+1;});
  var plans=[];
  stocks.forEach(function(s){
    var eff=s.sl-endLoss;if(eff<=0)return;
    for(var N=1;N<=pieces.length;N++){
      var perBar={};
      Object.keys(cnt).forEach(function(len){perBar[len]=Math.ceil(cnt[len]/N);});
      var flatPat=[];
      Object.keys(perBar).map(Number).sort(function(a,b){return b-a;}).forEach(function(len){
        for(var k=0;k<perBar[len];k++)flatPat.push(len);
      });
      var used=flatPat.reduce(function(s,p,i){return s+p+(i>0?blade:0);},0);
      if(used>eff)continue;
      var actualN=0;
      Object.keys(cnt).forEach(function(len){actualN=Math.max(actualN,Math.ceil(cnt[len]/perBar[len]));});
      var lossPerBar=eff-used,extraLoss=0;
      Object.keys(cnt).forEach(function(len){
        var excess=perBar[len]*actualN-cnt[len];if(excess>0)extraLoss+=excess*Number(len);
      });
      var totalLoss=lossPerBar*actualN+extraLoss;
      var totalUsable=s.sl*actualN;
      plans.push({sl:s.sl,N:actualN,flatPat:flatPat,used:used,lossPerBar:lossPerBar,
        totalLoss:totalLoss,chargeCount:1+flatPat.length,
        lossKg:(totalLoss/1000)*kgm,barKg:(s.sl/1000)*kgm*actualN,
        lossRate:totalUsable>0?(totalLoss/totalUsable)*100:0});
      break;
    }
  });
  plans.sort(function(a,b){return a.chargeCount-b.chargeCount||a.totalLoss-b.totalLoss;});
  var seen={},top=[];
  plans.forEach(function(p){var k=p.sl+'x'+p.N;if(!seen[k]){seen[k]=true;top.push(p);}});
  return top.slice(0,4);
}

function calcCore(blade,endLoss,kgm,stocks,pieces,remnants,minValidLen){
  pieces=pieces.slice().sort(function(a,b){return b-a;});
  var rr={remaining:pieces,remnantBars:[]};
  if(remnants.length>0)rr=packWithRemnants(pieces,remnants,stocks,blade,endLoss);
  var cp=rr.remaining;
  var cs=(remnants.length>0&&cp.length>0)?STD.map(function(sl){return{sl:sl,max:Infinity};}):stocks;
  if(cp.length===0)return{single:[],chgPlans:[],allDP:[],remnantBars:rr.remnantBars,bundlePlan:null,patA:null,patB:null,patC:null,yieldCard1:null,calcPieces:[],origPieces:pieces};
  var single=[];
  cs.forEach(function(s){
    var eff=s.sl-endLoss;if(eff<=0)return;
    var bars=pack(cp,eff,blade);if(bars.length>s.max)return;
    bars.forEach(function(b){b.sl=s.sl;});
    var loss=bars.reduce(function(a,b){return a+b.loss;},0);
    var usable=s.sl*bars.length;
    var pl=bars.reduce(function(a,b){return a+b.pat.reduce(function(s,p){return s+p;},0);},0);
    var gm={};bars.forEach(function(b){var k=b.pat.join(',');if(!gm[k])gm[k]=b.pat;});
    var chg=Object.values(gm).reduce(function(a,p){return a+1+p.length;},0);
    single.push({sl:s.sl,bars:bars,loss:loss,max:s.max,yld:usable>0?(1-loss/usable)*100:0,lossRate:usable>0?(1-pl/usable)*100:100,barKg:(s.sl/1000)*kgm*bars.length,lossKg:(loss/1000)*kgm,chg:chg});
  });
  single.sort(function(a,b){return a.lossRate-b.lossRate;});
  var chgPlans=calcChargeMin(cp,cs,blade,endLoss,kgm);
  _dpCache={};
  var dps=[];
  cs.forEach(function(s){
    var eff=s.sl-endLoss;if(eff<=0)return;
    var bars=packDP(cp.slice(),eff,blade);if(bars.length>s.max)return;
    bars.forEach(function(b){b.sl=s.sl;});
    var loss=bars.reduce(function(a,b){return a+b.loss;},0);
    var tl=s.sl*bars.length;
    var pl=bars.reduce(function(a,b){return a+b.pat.reduce(function(s,p){return s+p;},0);},0);
    dps.push({sl:s.sl,bars:bars,loss:loss,lossRate:tl>0?(1-pl/tl)*100:100,barKg:(s.sl/1000)*kgm*bars.length,lossKg:(loss/1000)*kgm});
  });
  dps.sort(function(a,b){return a.lossRate-b.lossRate;});
  var allDP=[];
  dps.forEach(function(r){
    var gm={};r.bars.forEach(function(b){var k=b.pat.join(',');if(!gm[k])gm[k]=b.pat;});
    var chg=Object.values(gm).reduce(function(a,p){return a+1+p.length;},0);
    allDP.push({desc:r.sl.toLocaleString()+'mm x '+r.bars.length,lossRate:r.lossRate,lossKg:r.lossKg,barKg:r.barKg,bars:r.bars,slA:r.sl,slB:null,bA:r.bars,bB:[],chg:chg,type:'single'});
  });
  allDP.sort(function(a,b){return a.lossRate-b.lossRate;});
  var bp=calcBundlePlan(cp,cs,blade,endLoss,kgm);
  var heavy=cp.length>30;
  var patA=calcPatternA(cp,cs,blade,endLoss,kgm);
  var patB=heavy?null:calcPatternB(cp,cs,blade,endLoss,kgm);
  var patC=null;
  var rb=rr.remnantBars;
  if(rb&&rb.length){
    function mr(pat){if(!pat||!pat.bars)return pat;var mg=rb.concat(pat.bars);var sl=pat.sl||(mg[0]&&mg[0].sl)||cs[0].sl;var m2=calcMetrics(mg,sl,endLoss,kgm,minValidLen);return Object.assign({},pat,{bars:mg,metrics:m2});}
    if(patA)patA=mr(patA);
    if(patB){if(patB.plan90)patB.plan90=mr(patB.plan90);if(patB.plan80)patB.plan80=mr(patB.plan80);}
  }
  return{single:single,chgPlans:chgPlans,allDP:allDP,remnantBars:rr.remnantBars,bundlePlan:bp,patA:patA,patB:patB,patC:patC,yieldCard1:allDP.length?allDP[0]:null,calcPieces:cp,origPieces:pieces};
}

function calcYield(blade,endLoss,kgm,stocks,pieces,remnants,minValidLen){
  pieces=pieces.slice().sort(function(a,b){return b-a;});
  var rr={remaining:pieces,remnantBars:[]};
  if(remnants.length>0)rr=packWithRemnants(pieces,remnants,stocks,blade,endLoss);
  var cp=rr.remaining;
  var cs=(remnants.length>0&&cp.length>0)?STD.map(function(sl){return{sl:sl,max:Infinity};}):stocks;
  if(!cp.length)return{single:[],chgPlans:[],allDP:[],remnantBars:rr.remnantBars,bundlePlan:null,yieldCard1:null,calcPieces:[],origPieces:pieces};
  var cnt={};cp.forEach(function(p){cnt[p]=(cnt[p]||0)+1;});
  var bnbItems=Object.keys(cnt).map(Number).sort(function(a,b){return b-a;});
  var bnbDem=bnbItems.map(function(l){return cnt[l];});
  var bnbPats=enumAllPatterns(cs,bnbItems,bnbDem,blade,endLoss);
  var best=bnbSolve(bnbDem,bnbItems,bnbPats,3000);
  var allDP=[];
  if(best.sol){
    var bars=best.sol.map(function(c){return{pat:c.pat.slice(),loss:c.loss,sl:c.sl};});
    if(rr.remnantBars&&rr.remnantBars.length)bars=rr.remnantBars.concat(bars);
    var slCnt={};bars.forEach(function(b){slCnt[b.sl]=(slCnt[b.sl]||0)+1;});
    var desc=Object.keys(slCnt).map(Number).sort(function(a,b){return b-a;}).map(function(sl){return sl.toLocaleString()+'mm x '+slCnt[sl];}).join(' + ');
    var tu=bars.reduce(function(s,b){return s+b.sl;},0);
    var tp=bars.reduce(function(s,b){return s+b.pat.reduce(function(a,p){return a+p;},0);},0);
    var lr=tu>0?(1-tp/tu)*100:100;
    var tc=bars.reduce(function(s,b){return s+(b.pat?b.pat.length-1:0);},0);allDP.push({desc:desc,lossRate:lr,lossKg:bars.reduce(function(s,b){return s+b.loss;},0)/1000*kgm,barKg:tu/1000*kgm,bars:bars,slA:bars[0]?bars[0].sl:cs[0].sl,slB:null,bA:bars,bB:[],chg:tc,type:'bnb'});
  }
  _dpCache={};
  cs.forEach(function(s){
    var eff=s.sl-endLoss;if(eff<=0)return;
    var bars=packDP(cp.slice(),eff,blade);if(bars.length>s.max)return;
    bars.forEach(function(b){b.sl=s.sl;});
    var loss=bars.reduce(function(a,b){return a+b.loss;},0);
    var tl=s.sl*bars.length;
    var pl=bars.reduce(function(a,b){return a+b.pat.reduce(function(s,p){return s+p;},0);},0);
    var gm={};bars.forEach(function(b){var k=b.pat.join(',');if(!gm[k])gm[k]=b.pat;});
    var chg=Object.values(gm).reduce(function(a,p){return a+1+p.length;},0);
    allDP.push({desc:s.sl.toLocaleString()+'mm x '+bars.length,lossRate:tl>0?(1-pl/tl)*100:100,lossKg:loss/1000*kgm,barKg:tl/1000*kgm,bars:bars,slA:s.sl,slB:null,bA:bars,bB:[],chg:chg,type:'single'});
  });
  allDP.sort(function(a,b){return a.lossRate-b.lossRate;});
  var single=[];
  cs.forEach(function(s){
    var eff=s.sl-endLoss;if(eff<=0)return;
    var bars=pack(cp,eff,blade);if(bars.length>s.max)return;
    bars.forEach(function(b){b.sl=s.sl;});
    var loss=bars.reduce(function(a,b){return a+b.loss;},0);
    var usable=s.sl*bars.length;
    var pl=bars.reduce(function(a,b){return a+b.pat.reduce(function(s,p){return s+p;},0);},0);
    var gm={};bars.forEach(function(b){var k=b.pat.join(',');if(!gm[k])gm[k]=b.pat;});
    var chg=Object.values(gm).reduce(function(a,p){return a+1+p.length;},0);
    single.push({sl:s.sl,bars:bars,loss:loss,max:s.max,yld:usable>0?(1-loss/usable)*100:0,lossRate:usable>0?(1-pl/usable)*100:100,barKg:(s.sl/1000)*kgm*bars.length,lossKg:(loss/1000)*kgm,chg:chg});
  });
  single.sort(function(a,b){return a.lossRate-b.lossRate;});
  var chgPlans=calcChargeMin(cp,cs,blade,endLoss,kgm);
  var bp=calcBundlePlan(cp,cs,blade,endLoss,kgm);
  return{single:single,chgPlans:chgPlans,allDP:allDP,remnantBars:rr.remnantBars,bundlePlan:bp,yieldCard1:allDP.length?allDP[0]:null,calcPieces:cp,origPieces:pieces};
}


// ── メッセージハンドラ ────────────────────────────────────
/**
 * Worker エントリポイント。
 * mode に応じて計算を振り分け、結果を返す。
 */
self.onmessage = function(e) {
  var d=e.data;
  try{
    var r;
    if(d.mode==='yield'){
      r=calcYield(d.blade,d.endLoss,d.kgm,d.stocks,d.pieces,d.remnants,d.minValidLen);
    }else if(d.mode==='patA'){
      _dpCache={};
      r={patA:calcPatternA(d.pieces,d.stocks,d.blade,d.endLoss,d.kgm)};
    }else if(d.mode==='patB'){
      _dpCache={};
      r={patB:calcPatternB(d.pieces,d.stocks,d.blade,d.endLoss,d.kgm)};
    }else if(d.mode==='patC'){
      r={patC:null};
    }else{
      r=calcCore(d.blade,d.endLoss,d.kgm,d.stocks,d.pieces,d.remnants,d.minValidLen);
    }
    self.postMessage({ok:true,result:r,mode:d.mode});
  }catch(err){
    self.postMessage({ok:false,error:err.message,mode:d.mode});
  }
};