(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns) return;

  ns.calculation.yield = ns.calculation.yield || {};

  function getPackingApi() {
    return ns.calculation.yield || {};
  }

  function enumAllPatterns(stocks, items, demArr, blade, endLoss) {
    var allPats = [];
    stocks.forEach(function(s) {
      var eff = s.sl - endLoss;
      if (eff <= 0) return;
      function bt(idx, rem, cur) {
        if (cur.length > 0) {
          var piece = cur.reduce(function(a, p) { return a + p; }, 0);
          allPats.push({ pat: cur.slice(), sl: s.sl, eff: eff, loss: rem, piece: piece, yld: piece / eff });
        }
        for (var i = idx; i < items.length; i++) {
          var w = items[i] + (cur.length > 0 ? blade : 0);
          if (rem < w) continue;
          var used = 0;
          for (var k = 0; k < cur.length; k++) if (cur[k] === items[i]) used++;
          if (used >= demArr[i]) continue;
          cur.push(items[i]);
          bt(i, rem - w, cur);
          cur.pop();
        }
      }
      bt(0, eff, []);
    });
    allPats.sort(function(a, b) { return b.yld - a.yld; });
    return allPats;
  }

  function bnbSolve(demArr, items, allPats, timeLimit) {
    var best = { sol: null, bars: Infinity, piece: 0 };
    var deadline = Date.now() + (timeLimit || 2000);
    function bnb(rem, chosen, bars) {
      if (Date.now() > deadline) return;
      if (!rem.some(function(r) { return r > 0; })) {
        var piece = chosen.reduce(function(s, c) { return s + c.piece; }, 0);
        if (bars < best.bars || (bars === best.bars && piece > best.piece)) {
          best.bars = bars;
          best.piece = piece;
          best.sol = chosen.slice();
        }
        return;
      }
      if (bars >= best.bars) return;
      var totalRem = rem.reduce(function(s, r, i) { return s + r * items[i]; }, 0);
      var maxEff = allPats.length ? allPats[allPats.length - 1].eff : 1;
      var lb = Math.ceil(totalRem / Math.max(maxEff, 1));
      if (bars + lb >= best.bars) return;
      var tried = 0;
      for (var pi = 0; pi < allPats.length && tried < 120; pi++) {
        var p = allPats[pi];
        var ok = true;
        for (var i = 0; i < items.length; i++) {
          var n = 0;
          for (var k = 0; k < p.pat.length; k++) if (p.pat[k] === items[i]) n++;
          if (n > rem[i]) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        tried++;
        var nr = rem.slice();
        for (var j = 0; j < items.length; j++) {
          var n2 = 0;
          for (var m = 0; m < p.pat.length; m++) if (p.pat[m] === items[j]) n2++;
          nr[j] -= n2;
        }
        chosen.push(p);
        bnb(nr, chosen, bars + 1);
        chosen.pop();
      }
    }
    bnb(demArr, [], 0);
    return best;
  }

  function findRepeatPlans(pieces, stocks, blade, endLoss, kgm, yieldThreshold) {
    var api = getPackingApi();
    var calcMetrics = api.calcMetrics;
    var cnt = {};
    pieces.forEach(function(p) { cnt[p] = (cnt[p] || 0) + 1; });
    var items = Object.keys(cnt).map(Number).sort(function(a, b) { return b - a; });
    var demArr = items.map(function(l) { return cnt[l]; });
    if (!items.length) return [];
    var allPats = enumAllPatterns(stocks, items, demArr, blade, endLoss);
    if (!allPats.length) return [];

    function maxRep(p) {
      var mr = Infinity;
      items.forEach(function(l, i) {
        var n = 0;
        for (var k = 0; k < p.pat.length; k++) if (p.pat[k] === l) n++;
        if (n > 0) mr = Math.min(mr, Math.floor(demArr[i] / n));
      });
      return isFinite(mr) ? mr : 0;
    }

    var candidates = allPats.map(function(p) {
      var mr = maxRep(p);
      return { pat: p, maxRep: mr, score: p.yld * mr };
    }).filter(function(c) {
      return c.maxRep >= 2 && c.pat.yld >= yieldThreshold / 100;
    }).sort(function(a, b) {
      return b.score - a.score || b.maxRep - a.maxRep || b.pat.yld - a.pat.yld;
    });

    var results = [];
    var seenPat = {};
    var deadline = Date.now() + 1500;
    candidates.slice(0, 30).forEach(function(cand) {
      if (Date.now() > deadline) return;
      var p = cand.pat;
      var key = p.sl + '|' + p.pat.join(',');
      if (seenPat[key]) return;
      seenPat[key] = true;

      var nr = demArr.slice();
      var ok = true;
      items.forEach(function(l, i) {
        var n = 0;
        for (var k = 0; k < p.pat.length; k++) if (p.pat[k] === l) n++;
        nr[i] -= n * cand.maxRep;
        if (nr[i] < 0) ok = false;
      });
      if (!ok) return;

      var remBest;
      if (nr.some(function(r) { return r > 0; })) {
        var remDem = items.map(function(l, i) { return nr[i]; });
        var remPats = enumAllPatterns(stocks, items, remDem, blade, endLoss);
        remBest = bnbSolve(nr, items, remPats, 800);
      } else {
        remBest = { sol: [], bars: 0, piece: 0 };
      }
      if (!remBest.sol) return;

      var repBars = [];
      for (var r = 0; r < cand.maxRep; r++) repBars.push({ pat: p.pat.slice(), loss: p.loss, sl: p.sl });
      var allBars = repBars.concat(remBest.sol.map(function(c) {
        return { pat: c.pat.slice(), loss: c.loss, sl: c.sl };
      }));
      var totalUsable = allBars.reduce(function(s, b) { return s + b.sl; }, 0);
      var totalPiece = allBars.reduce(function(s, b) {
        return s + b.pat.reduce(function(a, x) { return a + x; }, 0);
      }, 0);
      var yld = totalUsable > 0 ? totalPiece / totalUsable * 100 : 0;
      var mm = calcMetrics(allBars, p.sl, endLoss, kgm);
      mm.yieldPct = yld;
      mm.patYieldPct = p.yld * 100;
      mm.lossRate = 100 - yld;
      mm.barKg = allBars.reduce(function(s, b) { return s + b.sl / 1000 * kgm; }, 0);
      mm.lossKg = allBars.reduce(function(s, b) { return s + b.loss; }, 0) / 1000 * kgm;
      mm.barCount = allBars.length;
      mm.repeatCount = cand.maxRep;
      results.push({ sl: p.sl, bars: allBars, repeat: cand.maxRep, yld: yld, patYld: p.yld * 100, metrics: mm, pat: p.pat });
    });

    results.sort(function(a, b) { return b.repeat - a.repeat || b.patYld - a.patYld; });
    var seen2 = {};
    return results.filter(function(r) {
      var key = r.sl + '|' + r.pat.join(',');
      if (seen2[key]) return false;
      seen2[key] = true;
      return true;
    });
  }

  function calcPatternA(pieces, stocks, blade, endLoss, kgm) {
    var results = findRepeatPlans(pieces, stocks, blade, endLoss, kgm, 90);
    if (!results.length) return null;
    var best = results[0];
    return { label: 'A', name: 'Pattern A', bars: best.bars, sl: best.sl, metrics: best.metrics };
  }

  function calcPatternB(pieces, stocks, blade, endLoss, kgm) {
    var res90 = findRepeatPlans(pieces, stocks, blade, endLoss, kgm, 90);
    var repeatA = res90.length ? res90[0].repeat : 0;
    var res80 = findRepeatPlans(pieces, stocks, blade, endLoss, kgm, 80);
    if (!res80.length) return null;
    var better = res80.filter(function(r) { return r.repeat > repeatA; });
    if (!better.length) return null;
    var plan80 = better[0];
    return {
      label: 'B',
      name: 'Pattern B',
      plan90: null,
      plan80: { bars: plan80.bars, sl: plan80.sl, metrics: plan80.metrics }
    };
  }

  function calcPatternC() {
    return null;
  }

  ns.calculation.yield.enumAllPatterns = enumAllPatterns;
  ns.calculation.yield.bnbSolve = bnbSolve;
  ns.calculation.yield.findRepeatPlans = findRepeatPlans;
  ns.calculation.yield.calcPatternA = calcPatternA;
  ns.calculation.yield.calcPatternB = calcPatternB;
  ns.calculation.yield.calcPatternC = calcPatternC;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
