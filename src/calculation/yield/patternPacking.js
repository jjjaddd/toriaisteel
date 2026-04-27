(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns) return;

  ns.calculation.yield = ns.calculation.yield || {};

  var dpCache = {};

  function resetDpCache() {
    dpCache = {};
  }

  function pack(pieces, eff, blade) {
    var cnt = {};
    pieces.forEach(function(p) { cnt[p] = (cnt[p] || 0) + 1; });
    var lengths = Object.keys(cnt).map(Number).sort(function(a, b) { return b - a; });

    var allPats = [];
    function enumPats(idx, remSpace, counts, hasAny) {
      if (idx === lengths.length) {
        if (hasAny) allPats.push({ counts: counts.slice(), loss: remSpace });
        return;
      }
      var len = lengths[idx];
      for (var n = 0; n <= cnt[len]; n++) {
        var addSpace = n === 0 ? 0
          : (hasAny || counts.slice(0, idx).some(function(c) { return c > 0; }) ? blade : 0)
            + len + (n - 1) * (len + blade);
        if (n > 0 && addSpace > remSpace) break;
        counts[idx] = n;
        enumPats(idx + 1, remSpace - addSpace, counts, hasAny || n > 0);
      }
      counts[idx] = 0;
    }
    enumPats(0, eff, new Array(lengths.length).fill(0), false);

    allPats.sort(function(a, b) {
      var sa = a.counts.reduce(function(s, n) { return s + n; }, 0);
      var sb = b.counts.reduce(function(s, n) { return s + n; }, 0);
      return sb - sa || a.loss - b.loss;
    });

    var remaining = {};
    lengths.forEach(function(l) { remaining[l] = cnt[l]; });
    var bars = [];

    for (var iter = 0; iter < 500; iter++) {
      var anyLeft = lengths.some(function(l) { return (remaining[l] || 0) > 0; });
      if (!anyLeft) break;

      var bestPat = null;
      var bestPrimary = -1;
      var bestSecondary = -1;
      for (var pi = 0; pi < allPats.length; pi++) {
        var p = allPats[pi];
        var ok = lengths.every(function(l, li) { return p.counts[li] <= (remaining[l] || 0); });
        if (!ok) continue;
        var primary = (remaining[lengths[0]] || 0) > 0 ? p.counts[0] : 0;
        var secondary = lengths.reduce(function(s, l, li) { return s + p.counts[li]; }, 0);
        if (primary > bestPrimary ||
          (primary === bestPrimary && secondary > bestSecondary) ||
          (primary === bestPrimary && secondary === bestSecondary && bestPat && p.loss < bestPat.loss)) {
          bestPrimary = primary;
          bestSecondary = secondary;
          bestPat = p;
        }
      }
      if (!bestPat || bestSecondary === 0) break;

      var pat = [];
      lengths.forEach(function(l, li) {
        for (var n = 0; n < bestPat.counts[li]; n++) {
          pat.push(l);
          remaining[l]--;
        }
      });
      pat.sort(function(a, b) { return b - a; });
      bars.push({ pat: pat, loss: bestPat.loss });
    }

    var leftover = [];
    lengths.forEach(function(l) {
      for (var i = 0; i < (remaining[l] || 0); i++) leftover.push(l);
    });
    leftover.sort(function(a, b) { return b - a; });
    while (leftover.length > 0) {
      var rem = eff;
      var pat2 = [];
      var newLeft = [];
      for (var j = 0; j < leftover.length; j++) {
        var need = leftover[j] + (pat2.length > 0 ? blade : 0);
        if (need <= rem) {
          rem -= need;
          pat2.push(leftover[j]);
        } else {
          newLeft.push(leftover[j]);
        }
      }
      bars.push({ pat: pat2, loss: rem });
      leftover = newLeft;
    }

    return bars;
  }

  function dpBestPat(pieces, capacity, blade) {
    var cnt = {};
    pieces.forEach(function(p) { cnt[p] = (cnt[p] || 0) + 1; });
    var lens = Object.keys(cnt).map(Number).sort(function(a, b) { return b - a; });
    if (!lens.length) return { pat: [], used: 0, loss: capacity };

    var key = capacity + '|' + lens.map(function(l) { return l + ':' + cnt[l]; }).join(',');
    if (dpCache[key]) return dpCache[key];

    var cap = capacity + blade;
    var dp = new Array(cap + 1).fill(null);
    dp[0] = { used: 0, prev: -1, item: 0 };
    lens.forEach(function(len) {
      var maxTake = cnt[len];
      var w = len + blade;
      for (var k = 0; k < maxTake; k++) {
        for (var c = cap; c >= w; c--) {
          var pv = dp[c - w];
          if (!pv) continue;
          var nu = pv.used + len;
          if (!dp[c] || nu > dp[c].used) dp[c] = { used: nu, prev: c - w, item: len };
        }
      }
    });

    var best = { pat: [], used: 0, loss: capacity };
    for (var c2 = cap; c2 >= 0; c2--) {
      if (!dp[c2] || dp[c2].used === 0) continue;
      var items2 = [];
      var cur = c2;
      while (cur > 0 && dp[cur] && dp[cur].prev >= 0) {
        items2.push(dp[cur].item);
        cur = dp[cur].prev;
      }
      if (!items2.length) continue;
      var au = items2.reduce(function(s, p) { return s + p; }, 0);
      var as2 = au + (items2.length - 1) * blade;
      if (as2 <= capacity && au > best.used) {
        best = { pat: items2.sort(function(a, b) { return b - a; }), used: au, loss: capacity - as2 };
        break;
      }
    }
    dpCache[key] = best;
    return best;
  }

  function packWithRemnants(pieces, remnants, stdStocks, blade, endLoss) {
    var sortedRemnants = remnants.slice().sort(function(a, b) { return b - a; });
    var remaining = pieces.slice().sort(function(a, b) { return b - a; });
    var allBars = [];

    sortedRemnants.forEach(function(remLen) {
      if (!remaining.length) return;
      var eff = remLen - endLoss;
      if (eff <= 0) return;
      var best = dpBestPat(remaining, eff, blade);
      if (!best.pat.length) return;

      best.pat.forEach(function(p) {
        var idx = remaining.indexOf(p);
        if (idx >= 0) remaining.splice(idx, 1);
      });

      allBars.push({ pat: best.pat, loss: best.loss, sl: remLen });
    });

    return { remaining: remaining, remnantBars: allBars };
  }

  function bestStockForPat(pat, stocks, blade, endLoss) {
    var needed = pat.reduce(function(s, p, i) { return s + p + (i > 0 ? blade : 0); }, 0);
    var sorted = stocks.slice().sort(function(a, b) { return a.sl - b.sl; });
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].sl - endLoss >= needed) return sorted[i];
    }
    return null;
  }

  function packDP(piecesIn, eff, blade) {
    var remaining = piecesIn.slice().sort(function(a, b) { return b - a; });
    var bars = [];
    while (remaining.length > 0) {
      var cnt2 = {};
      remaining.forEach(function(p) { cnt2[p] = (cnt2[p] || 0) + 1; });
      var best;
      if (Object.keys(cnt2).length <= 8) {
        best = dpBestPat(remaining, eff, blade);
      } else {
        var space = eff;
        var pat = [];
        var unused = [];
        remaining.forEach(function(p) {
          var add = p + (pat.length > 0 ? blade : 0);
          if (space - add >= 0) {
            space -= add;
            pat.push(p);
          } else {
            unused.push(p);
          }
        });
        best = { pat: pat, used: pat.reduce(function(s, p) { return s + p; }, 0), loss: space };
      }
      if (!best.pat.length) break;
      bars.push({ pat: best.pat, loss: best.loss });
      var rem2 = remaining.slice();
      best.pat.forEach(function(p) {
        var ix = rem2.indexOf(p);
        if (ix >= 0) rem2.splice(ix, 1);
      });
      remaining = rem2;
    }
    return bars;
  }

  function calcChargeMin(pieces, stocks, blade, endLoss, kgm) {
    var cnt = {};
    pieces.forEach(function(p) { cnt[p] = (cnt[p] || 0) + 1; });
    var plans = [];
    stocks.forEach(function(s) {
      var eff = s.sl - endLoss;
      if (eff <= 0) return;
      for (var nBars = 1; nBars <= pieces.length; nBars++) {
        var perBar = {};
        Object.keys(cnt).forEach(function(len) { perBar[len] = Math.ceil(cnt[len] / nBars); });
        var flatPat = [];
        Object.keys(perBar).map(Number).sort(function(a, b) { return b - a; }).forEach(function(len) {
          for (var k = 0; k < perBar[len]; k++) flatPat.push(len);
        });
        var used = flatPat.reduce(function(sum, p, i) { return sum + p + (i > 0 ? blade : 0); }, 0);
        if (used > eff) continue;
        var actualN = 0;
        Object.keys(cnt).forEach(function(len) {
          actualN = Math.max(actualN, Math.ceil(cnt[len] / perBar[len]));
        });
        var lossPerBar = eff - used;
        var extraLoss = 0;
        Object.keys(cnt).forEach(function(len) {
          var excess = perBar[len] * actualN - cnt[len];
          if (excess > 0) extraLoss += excess * Number(len);
        });
        var totalLoss = lossPerBar * actualN + extraLoss;
        var totalUsable = s.sl * actualN;
        plans.push({
          sl: s.sl,
          N: actualN,
          flatPat: flatPat,
          used: used,
          lossPerBar: lossPerBar,
          totalLoss: totalLoss,
          chargeCount: 1 + flatPat.length,
          lossKg: (totalLoss / 1000) * kgm,
          barKg: (s.sl / 1000) * kgm * actualN,
          lossRate: totalUsable > 0 ? (totalLoss / totalUsable) * 100 : 0
        });
        break;
      }
    });
    plans.sort(function(a, b) { return a.chargeCount - b.chargeCount || a.totalLoss - b.totalLoss; });
    var seen = {};
    var top = [];
    plans.forEach(function(p) {
      var key = p.sl + 'x' + p.N;
      if (!seen[key]) {
        seen[key] = true;
        top.push(p);
      }
    });
    return top.slice(0, 4);
  }

  ns.calculation.yield.resetDpCache = resetDpCache;
  ns.calculation.yield.pack = pack;
  ns.calculation.yield.dpBestPat = dpBestPat;
  ns.calculation.yield.packWithRemnants = packWithRemnants;
  ns.calculation.yield.bestStockForPat = bestStockForPat;
  ns.calculation.yield.packDP = packDP;
  ns.calculation.yield.calcChargeMin = calcChargeMin;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
