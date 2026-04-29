/**
 * TORIAI 計算アルゴリズム v2.1 (drop-in patch)
 *
 * 既存ファイル（patternPacking.js, repeatPlans.js）の **後ろから** ロードして使う。
 * 既存ファイルは1行も書き換えない。
 *
 * v2.1 での変更点:
 *   - boundedKnapsackDP を Int32Array / Uint16Array ベースに（1セル 80→14 byte）
 *   - findRepeatPlans を Y.enumAllPatterns / Y.bnbSolve を動的解決する版に置換
 *     → 旧 v1 closure 経由の指数爆発を回避
 *   - calcPatternA / calcPatternB を新版に置換（findRepeatPlansV2 を使用）
 *   - calcPatternC は新 calcPatternA / calcPatternB を使った正規版に
 *   - 出力契約は不変、k<=13 互換性も維持
 *
 * ロード順:
 *   patternPacking.js -> repeatPlans.js -> bundlePlan.js -> algorithmV2.js (-> calcCore.js)
 *
 * ロールバック:
 *   ns.calculation.yield.algorithmV2Config.rollback();
 */

(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns || !ns.calculation || !ns.calculation.yield) return;
  var Y = ns.calculation.yield;

  var EXACT_THRESHOLD = 13;
  var SAMPLE_PATTERNS = 80;
  var MAX_PATTERN_RETURN = 500;

  // Phase 2-1: 長考モード用のモード別設定値
  var _currentMode = 'normal';
  var MODE_CONFIGS = {
    normal: { exactThreshold: 13, samplePatterns: 80,  maxPatternReturn: 500,  bnbTimeLimit: 3000,  frpDeadline: 1500 },
    deep:   { exactThreshold: 18, samplePatterns: 200, maxPatternReturn: 2000, bnbTimeLimit: 30000, frpDeadline: 15000 }
  };

  var origPack = Y.pack;
  var origEnumAllPatterns = Y.enumAllPatterns;
  var origDpBestPat = Y.dpBestPat;
  var origCalcPatternA = Y.calcPatternA;
  var origCalcPatternB = Y.calcPatternB;
  var origCalcPatternC = Y.calcPatternC;
  var origFindRepeatPlans = Y.findRepeatPlans;
  var origCalcCore = Y.calcCore;
  var origBnbSolve = Y.bnbSolve;

  if (!origPack || !origEnumAllPatterns || !origDpBestPat) {
    console.warn('[TORIAI v2.1] 既存関数が見つかりません。読み込み順を確認してください。');
    return;
  }

  // ===========================================================
  // ユーティリティ
  // ===========================================================
  function uniqueLenCount(pieces) {
    var s = {};
    for (var i = 0; i < pieces.length; i++) s[pieces[i]] = 1;
    return Object.keys(s).length;
  }

  function patSize(pat, blade) {
    var s = 0;
    for (var i = 0; i < pat.length; i++) {
      s += pat[i];
      if (i > 0) s += blade;
    }
    return s;
  }

  // ===========================================================
  // pack() - k<=13 は v1 そのまま、k>=14 は DP-greedy
  // ===========================================================
  // EXACT_DEMAND_LIMIT を超える総需要だと v1 の exhaustive enumeration が爆発するので
  // k<=EXACT_THRESHOLD でも v2 path に逃がす。これにより H125 のような
  // 「k=5 だが各長さ 60本ずつ（実物件あるある）」での OOM を防ぐ。
  var EXACT_DEMAND_LIMIT = 80;

  function packV2(pieces, eff, blade) {
    var k = uniqueLenCount(pieces);
    var n = pieces.length;

    // 安全弁: 部品の最大長が eff を超えると v1 pack() の leftover ループが
    // 無限化する（TODO.md の既知 bug）。この場合は packDpGreedy に逃がす。
    var maxPiece = 0;
    for (var pi = 0; pi < pieces.length; pi++) {
      if (pieces[pi] > maxPiece) maxPiece = pieces[pi];
    }
    if (maxPiece > eff) {
      return packDpGreedy(pieces, eff, blade);
    }

    if (k <= EXACT_THRESHOLD && n <= EXACT_DEMAND_LIMIT) {
      return origPack(pieces, eff, blade);
    }
    return packDpGreedy(pieces, eff, blade);
  }

  function packDpGreedy(pieces, eff, blade) {
    var cnt = {};
    pieces.forEach(function(p) { cnt[p] = (cnt[p] || 0) + 1; });
    var lengths = Object.keys(cnt).map(Number).sort(function(a, b) { return b - a; });
    var remaining = {};
    lengths.forEach(function(l) { remaining[l] = cnt[l]; });

    var bars = [];
    var maxIter = pieces.length + 50;

    for (var iter = 0; iter < maxIter; iter++) {
      var hasRest = false;
      for (var li = 0; li < lengths.length; li++) {
        if (remaining[lengths[li]] > 0) { hasRest = true; break; }
      }
      if (!hasRest) break;

      var remPieces = [];
      lengths.forEach(function(l) {
        for (var j = 0; j < remaining[l]; j++) remPieces.push(l);
      });

      var best = origDpBestPat(remPieces, eff, blade);

      if (!best.pat || best.pat.length === 0) {
        lengths.forEach(function(l) {
          while (remaining[l] > 0) {
            if (l <= eff) bars.push({ pat: [l], loss: eff - l });
            remaining[l]--;
          }
        });
        break;
      }

      bars.push({ pat: best.pat.slice(), loss: best.loss });
      best.pat.forEach(function(p) { remaining[p]--; });
    }

    return bars;
  }

  // ===========================================================
  // enumAllPatterns() - k<=13 は v1、k>=14 は smart 生成
  // ===========================================================
  // ===========================================================
  // enumAllPatterns キャッシュ（Phase 1.5-2）
  //
  // findRepeatPlans の内側ループで「同じ stocks/items/blade/endLoss、異なる demArr」
  // の組み合わせを最大 30 回呼ぶので、結果をメモ化。head呼出は thresholds 間で完全共有。
  // ===========================================================
  var _eapCache = new Map();
  var _EAP_CACHE_MAX = 128;
  var _eapStats = { hits: 0, misses: 0 };

  function _eapCacheKey(stocks, items, demArr, blade, endLoss) {
    var ss = stocks.map(function(s) { return s.sl + ':' + (s.max||''); }).join(',');
    var is = items.join(',');
    var ds = demArr.join(',');
    return ss + '|' + is + '|' + ds + '|' + blade + ',' + endLoss;
  }

  function enumAllPatternsV2(stocks, items, demArr, blade, endLoss) {
    var key = _eapCacheKey(stocks, items, demArr, blade, endLoss);
    if (_eapCache.has(key)) {
      _eapStats.hits++;
      var cached = _eapCache.get(key);
      _eapCache.delete(key);
      _eapCache.set(key, cached);
      return cached;
    }
    _eapStats.misses++;
    var result;
    var totalDemand = 0;
    for (var di = 0; di < demArr.length; di++) totalDemand += demArr[di];
    if (items.length <= EXACT_THRESHOLD && totalDemand <= EXACT_DEMAND_LIMIT) {
      result = origEnumAllPatterns(stocks, items, demArr, blade, endLoss);
    } else {
      result = generateSmartPatterns(stocks, items, demArr, blade, endLoss);
    }
    while (_eapCache.size >= _EAP_CACHE_MAX) {
      var oldest = _eapCache.keys().next().value;
      _eapCache.delete(oldest);
    }
    _eapCache.set(key, result);
    return result;
  }

  function generateSmartPatterns(stocks, items, demArr, blade, endLoss) {
    var allPats = [];
    var seen = {};

    function addPattern(pat, sl, eff) {
      if (!pat || !pat.length) return;
      var size = patSize(pat, blade);
      if (size > eff) return;
      var sortedKey = pat.slice().sort(function(a, b) { return a - b; }).join(',');
      var key = sl + '|' + sortedKey;
      if (seen[key]) return;
      seen[key] = true;

      var sortedPat = pat.slice().sort(function(a, b) { return b - a; });
      var piece = sortedPat.reduce(function(a, b) { return a + b; }, 0);
      allPats.push({
        pat: sortedPat,
        sl: sl,
        eff: eff,
        loss: eff - size,
        piece: piece,
        yld: piece / eff
      });
    }

    stocks.forEach(function(stock) {
      var eff = stock.sl - endLoss;
      if (eff <= 0) return;

      items.forEach(function(len, i) {
        if (demArr[i] === 0 || len > eff) return;
        var maxN = Math.min(demArr[i], Math.floor((eff + blade) / (len + blade)));
        for (var n = 1; n <= maxN; n++) {
          var pat = [];
          for (var j = 0; j < n; j++) pat.push(len);
          addPattern(pat, stock.sl, eff);
        }
      });

      items.forEach(function(leadLen, leadIdx) {
        if (demArr[leadIdx] === 0 || leadLen > eff) return;
        var pat = bestPatternWithLead(items, demArr, eff, blade, leadIdx);
        addPattern(pat, stock.sl, eff);
      });

      for (var si = 0; si < SAMPLE_PATTERNS; si++) {
        var weights = items.map(function(len, i) {
          return len * Math.sqrt(demArr[i] || 1) * (0.6 + Math.random() * 0.8);
        });
        var pat = greedyByWeight(items, demArr, eff, blade, weights);
        addPattern(pat, stock.sl, eff);
      }
    });

    allPats.sort(function(a, b) { return b.yld - a.yld; });
    return allPats.slice(0, MAX_PATTERN_RETURN);
  }

  function bestPatternWithLead(items, demArr, eff, blade, leadIdx) {
    var leadLen = items[leadIdx];
    if (leadLen > eff) return [];

    var rem = eff - leadLen;
    var newDem = demArr.slice();
    newDem[leadIdx]--;

    var subPat = boundedKnapsackDP(items, newDem, rem, blade, true);
    var pat = [leadLen];
    subPat.forEach(function(p) { pat.push(p); });
    return pat;
  }

  // ===========================================================
  // boundedKnapsackDP - TypedArray 版（メモリ削減の核）
  // 1 セル 80 bytes -> 14 bytes、約 6 倍効率化
  // sentinel: dpUsed[c] = -1 は「未到達」
  // ===========================================================
  function boundedKnapsackDP(items, demArr, capacity, blade, needsBlade) {
    if (capacity <= 0) return [];
    var bladeAdd = needsBlade ? blade : 0;
    var size = capacity + 1;

    var dpUsed = new Int32Array(size);
    var dpPrev = new Int32Array(size);
    var dpItem = new Int32Array(size);
    var dpBatch = new Uint16Array(size);

    dpUsed.fill(-1);
    dpPrev.fill(-1);
    dpUsed[0] = 0;

    for (var i = 0; i < items.length; i++) {
      var len = items[i];
      var w = len + bladeAdd;
      if (w > capacity) continue;
      var maxK = demArr[i];
      var kBatch = 1;
      while (maxK > 0) {
        var take = Math.min(kBatch, maxK);
        var ww = w * take;
        var val = len * take;
        for (var c = capacity; c >= ww; c--) {
          var prevUsed = dpUsed[c - ww];
          if (prevUsed < 0) continue;
          var nu = prevUsed + val;
          if (dpUsed[c] < 0 || nu > dpUsed[c]) {
            dpUsed[c] = nu;
            dpPrev[c] = c - ww;
            dpItem[c] = len;
            dpBatch[c] = take;
          }
        }
        maxK -= take;
        kBatch *= 2;
      }
    }

    var bestC = 0;
    var bestUsed = 0;
    for (var c2 = 1; c2 <= capacity; c2++) {
      var u = dpUsed[c2];
      if (u >= 0 && u > bestUsed) {
        bestUsed = u;
        bestC = c2;
      }
    }

    var pat = [];
    var cur = bestC;
    while (cur > 0 && dpPrev[cur] >= 0) {
      var batch = dpBatch[cur] || 1;
      var item = dpItem[cur];
      for (var b = 0; b < batch; b++) pat.push(item);
      cur = dpPrev[cur];
    }
    return pat;
  }

  function greedyByWeight(items, demArr, eff, blade, weights) {
    var idx = items.map(function(_, i) { return i; })
      .sort(function(a, b) { return weights[b] - weights[a]; });

    var pat = [];
    var space = eff;
    var used = demArr.map(function() { return 0; });
    var hasAny = false;

    for (var pass = 0; pass < 3; pass++) {
      for (var ii = 0; ii < idx.length; ii++) {
        var i = idx[ii];
        var len = items[i];
        var available = demArr[i] - used[i];
        for (var k = 0; k < available; k++) {
          var cost = hasAny ? len + blade : len;
          if (cost > space) break;
          space -= cost;
          pat.push(len);
          used[i]++;
          hasAny = true;
        }
      }
    }
    return pat;
  }

  // ===========================================================
  // findRepeatPlans キャッシュ（Phase 1.5-1）
  //
  // patA/B/C で同一 (pieces, stocks, blade, endLoss, kgm, threshold) が
  // 重複呼出されるのでメモ化。LRU で _FRP_CACHE_MAX 超過時に古い順から捨てる。
  //
  // 期待: patA(90) → patB(90,80) → patC(orig A→ orig B→ thr=0)
  //   = 6回呼出 → 3 ユニーク呼出に削減 → 約 2倍速
  // ===========================================================
  var _frpCache = new Map();
  var _FRP_CACHE_MAX = 64;
  var _frpStats = { hits: 0, misses: 0 };

  function _frpCacheKey(pieces, stocks, blade, endLoss, kgm, threshold) {
    var sp = pieces.slice().sort(function(a,b) { return a-b; }).join(',');
    var ss = stocks.map(function(s) { return s.sl + ':' + (s.max||''); }).join(',');
    return sp + '|' + ss + '|' + blade + ',' + endLoss + ',' + kgm + ',' + threshold;
  }

  function findRepeatPlansV2(pieces, stocks, blade, endLoss, kgm, threshold) {
    var key = _frpCacheKey(pieces, stocks, blade, endLoss, kgm, threshold);
    if (_frpCache.has(key)) {
      _frpStats.hits++;
      var cached = _frpCache.get(key);
      _frpCache.delete(key);
      _frpCache.set(key, cached); // LRU: re-insert as most recent
      return cached;
    }
    _frpStats.misses++;
    var result = findRepeatPlansCore(pieces, stocks, blade, endLoss, kgm, threshold);
    while (_frpCache.size >= _FRP_CACHE_MAX) {
      var oldest = _frpCache.keys().next().value;
      _frpCache.delete(oldest);
    }
    _frpCache.set(key, result);
    return result;
  }

  // ===========================================================
  // findRepeatPlansCore - キャッシュなしの実体
  //
  // v1 のロジックほぼそのままだが、enumAllPatterns / bnbSolve を
  // **動的に Y から取る**（呼び出し時に v2 が使われる）。
  // これにより k>=14 で v2 の smart pattern 生成が使われる。
  // ===========================================================
  function findRepeatPlansCore(pieces, stocks, blade, endLoss, kgm, yieldThreshold) {
    var enumAllPatterns = Y.enumAllPatterns;
    var bnbSolve = Y.bnbSolve;
    var calcMetrics = Y.calcMetrics;
    if (!enumAllPatterns || !bnbSolve) return [];

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
    var frpDeadlineMs = (MODE_CONFIGS[_currentMode] || MODE_CONFIGS.normal).frpDeadline;
    var deadline = Date.now() + frpDeadlineMs;

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
      var mm = (typeof calcMetrics === 'function')
        ? calcMetrics(allBars, p.sl, endLoss, kgm)
        : { yieldPct: yld, lossRate: 100 - yld };
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

  // ===========================================================
  // calcPatternA - 90% 以上で繰り返し最大
  // ===========================================================
  function calcPatternAV2(pieces, stocks, blade, endLoss, kgm) {
    var results = findRepeatPlansV2(pieces, stocks, blade, endLoss, kgm, 90);
    if (!results.length) return null;
    var best = results[0];
    return { label: 'A', name: 'Pattern A', bars: best.bars, sl: best.sl, metrics: best.metrics };
  }

  // ===========================================================
  // calcPatternB - 80% 以上で patA より repeat が多いものがあれば
  // ===========================================================
  function calcPatternBV2(pieces, stocks, blade, endLoss, kgm) {
    var res90 = findRepeatPlansV2(pieces, stocks, blade, endLoss, kgm, 90);
    var repeatA = res90.length ? res90[0].repeat : 0;
    var res80 = findRepeatPlansV2(pieces, stocks, blade, endLoss, kgm, 80);
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

  // ===========================================================
  // calcPatternC - patA, patB が両方 null のとき限定で repeat 最大を返す
  // PRESERVATION_CONTRACT.md §1.2 準拠
  // ===========================================================
  function calcPatternCV2(pieces, stocks, blade, endLoss, kgm) {
    // 自前の v2 版で A/B 存在チェック（v1 への呼び出しはしない＝OOM 防止）
    var pA = calcPatternAV2(pieces, stocks, blade, endLoss, kgm);
    if (pA) return null;
    var pB = calcPatternBV2(pieces, stocks, blade, endLoss, kgm);
    if (pB) return null;

    var results = findRepeatPlansV2(pieces, stocks, blade, endLoss, kgm, 0);
    if (!results || !results.length) return null;

    var best = results[0];
    if (!best || best.repeat < 2) return null;

    return {
      label: 'C',
      name: 'Pattern C',
      bars: best.bars,
      sl: best.sl,
      metrics: best.metrics,
      repeat: best.repeat,
      yld: best.yld
    };
  }

  // ===========================================================
  // bnbSolve wrapper（Phase 2-1）
  //
  // calcCore.js が `bnbSolve(..., 3000)` とハードコードしているので、
  // _currentMode='deep' のとき timeLimit を上書きする。
  // ===========================================================
  function bnbSolveV2(demArr, items, allPats, timeLimit) {
    if (typeof origBnbSolve !== 'function') return { sol: null, bars: Infinity, piece: 0 };
    var actualLimit = (_currentMode === 'deep')
      ? MODE_CONFIGS.deep.bnbTimeLimit
      : timeLimit;
    return origBnbSolve(demArr, items, allPats, actualLimit);
  }

  // ===========================================================
  // LP 下界計算（Phase 3-1）
  //
  // 「N 本以下では物理的に詰められない」を保証する最小バー本数。
  //   N * (maxEff + blade) >= totalLen + totalPieces * blade
  //   ⇒ N >= ceil( (totalLen + n*blade) / (maxEff + blade) )
  // これは LP 緩和より緩い「材料下界」だが、実装が軽量で十分な目安になる。
  // Phase 4（Column Generation）でより厳密な LP 下界に置き換え予定。
  // ===========================================================
  function computeLPLowerBound(pieces, stocks, blade, endLoss) {
    if (!pieces || !pieces.length || !stocks || !stocks.length) return 0;
    var totalLen = 0;
    for (var i = 0; i < pieces.length; i++) totalLen += pieces[i];
    var maxEff = 0;
    for (var j = 0; j < stocks.length; j++) {
      var eff = stocks[j].sl - (endLoss || 0);
      if (eff > maxEff) maxEff = eff;
    }
    if (maxEff <= 0) return 0;
    var b = blade || 0;
    return Math.ceil((totalLen + pieces.length * b) / (maxEff + b));
  }

  // ===========================================================
  // 最適性バッジ判定（Phase 3-2）
  //
  //   optimal    : 実本数 == LP下界（証明的に最適）
  //   lp99       : ギャップ < 1%
  //   nearOpt    : ギャップ < 5%
  //   heuristic  : それ以上
  //   unknown    : 計算不能
  // ===========================================================
  function computeOptimalityBadge(yieldCard1, lpLB) {
    if (!yieldCard1 || !yieldCard1.bars || lpLB <= 0) return { badge: 'unknown', gap: null };
    var actualBars = yieldCard1.bars.length;
    if (actualBars === 0) return { badge: 'unknown', gap: null };
    var gap = (actualBars - lpLB) / lpLB;
    if (gap < 0) gap = 0; // LBより少ないことは数値誤差以外あり得ない
    if (actualBars <= lpLB) return { badge: 'optimal', gap: 0 };
    if (gap < 0.01) return { badge: 'lp99', gap: gap };
    if (gap < 0.05) return { badge: 'nearOpt', gap: gap };
    return { badge: 'heuristic', gap: gap };
  }

  // ===========================================================
  // calcCore wrapper（Phase 2-1 + Phase 3）
  //
  // options.mode = 'normal' | 'deep' を見て v2 内部設定を切替。
  // calcCore 本体には触らない。終了時に必ず元の設定へ戻す（safe-restore）。
  // 戻り値の yieldCard1 に optimalityBadge / optimalityGap / lpLowerBound を付与。
  // ===========================================================
  function calcCoreV2(options) {
    options = options || {};
    var requestedMode = options.mode === 'deep' ? 'deep' : 'normal';

    var prevMode = _currentMode;
    var prevExact = EXACT_THRESHOLD;
    var prevSamples = SAMPLE_PATTERNS;
    var prevReturn = MAX_PATTERN_RETURN;

    var cfg = MODE_CONFIGS[requestedMode];
    _currentMode = requestedMode;
    EXACT_THRESHOLD = cfg.exactThreshold;
    SAMPLE_PATTERNS = cfg.samplePatterns;
    MAX_PATTERN_RETURN = cfg.maxPatternReturn;

    try {
      if (typeof origCalcCore !== 'function') {
        throw new Error('[TORIAI v2.2] origCalcCore が未定義です。algorithmV2.js は calcCore.js の **後** にロードしてください。');
      }
      var result = origCalcCore(options);

      // Phase 3: 最適性バッジを付与（既存キーには触らず追加のみ）
      if (result && result.yieldCard1) {
        var lbPieces = result.calcPieces && result.calcPieces.length
          ? result.calcPieces
          : (options.pieces || []);
        var lpLB = computeLPLowerBound(lbPieces, options.stocks || [], options.blade || 0, options.endLoss || 0);
        var bg = computeOptimalityBadge(result.yieldCard1, lpLB);
        result.yieldCard1.lpLowerBound = lpLB;
        result.yieldCard1.optimalityBadge = bg.badge;
        result.yieldCard1.optimalityGap = bg.gap;
        result.yieldCard1.algorithmTier = (lbPieces && uniqueLenCount(lbPieces) <= EXACT_THRESHOLD) ? 1 : 2;
      }
      return result;
    } finally {
      _currentMode = prevMode;
      EXACT_THRESHOLD = prevExact;
      SAMPLE_PATTERNS = prevSamples;
      MAX_PATTERN_RETURN = prevReturn;
    }
  }

  // ===========================================================
  // インストール
  // ===========================================================
  Y.packV1 = origPack;
  Y.enumAllPatternsV1 = origEnumAllPatterns;
  Y.calcPatternAV1 = origCalcPatternA;
  Y.calcPatternBV1 = origCalcPatternB;
  Y.calcPatternCV1 = origCalcPatternC;
  Y.findRepeatPlansV1 = origFindRepeatPlans;

  Y.packV2 = packV2;
  Y.enumAllPatternsV2 = enumAllPatternsV2;
  Y.calcPatternAV2 = calcPatternAV2;
  Y.calcPatternBV2 = calcPatternBV2;
  Y.calcPatternCV2 = calcPatternCV2;
  Y.findRepeatPlansV2 = findRepeatPlansV2;

  Y.pack = packV2;
  Y.enumAllPatterns = enumAllPatternsV2;
  Y.calcPatternA = calcPatternAV2;
  Y.calcPatternB = calcPatternBV2;
  Y.calcPatternC = calcPatternCV2;
  Y.findRepeatPlans = findRepeatPlansV2;

  // Phase 2-1: calcCore と bnbSolve の wrapper を上書き
  if (typeof origCalcCore === 'function') {
    Y.calcCoreV1 = origCalcCore;
    Y.calcCoreV2 = calcCoreV2;
    Y.calcCore = calcCoreV2;
  } else {
    console.warn('[TORIAI v2.2] origCalcCore が見つかりません。algorithmV2.js は calcCore.js の **後** にロードしてください。長考モードは無効化されます。');
  }
  if (typeof origBnbSolve === 'function') {
    Y.bnbSolveV1 = origBnbSolve;
    Y.bnbSolveV2 = bnbSolveV2;
    Y.bnbSolve = bnbSolveV2;
  }

  Y.algorithmV2Config = {
    setExactThreshold: function(n) { EXACT_THRESHOLD = n; },
    setSamplePatterns: function(n) { SAMPLE_PATTERNS = n; },
    setMaxPatternReturn: function(n) { MAX_PATTERN_RETURN = n; },
    getConfig: function() {
      return {
        exactThreshold: EXACT_THRESHOLD,
        samplePatterns: SAMPLE_PATTERNS,
        maxPatternReturn: MAX_PATTERN_RETURN
      };
    },
    clearCache: function() {
      _frpCache.clear();
      _eapCache.clear();
      _frpStats = { hits: 0, misses: 0 };
      _eapStats = { hits: 0, misses: 0 };
    },
    getCacheStats: function() {
      return {
        frp: { hits: _frpStats.hits, misses: _frpStats.misses, size: _frpCache.size },
        eap: { hits: _eapStats.hits, misses: _eapStats.misses, size: _eapCache.size }
      };
    },
    setMode: function(mode) {
      _currentMode = mode === 'deep' ? 'deep' : 'normal';
    },
    getMode: function() { return _currentMode; },
    setModeConfig: function(mode, partial) {
      if (!MODE_CONFIGS[mode]) return;
      Object.keys(partial || {}).forEach(function(k) { MODE_CONFIGS[mode][k] = partial[k]; });
    },
    getModeConfigs: function() { return JSON.parse(JSON.stringify(MODE_CONFIGS)); },
    rollback: function() {
      _frpCache.clear();
      _eapCache.clear();
      _currentMode = 'normal';
      if (origCalcCore) Y.calcCore = origCalcCore;
      if (origBnbSolve) Y.bnbSolve = origBnbSolve;
      Y.pack = origPack;
      Y.enumAllPatterns = origEnumAllPatterns;
      Y.calcPatternA = origCalcPatternA || function() { return null; };
      Y.calcPatternB = origCalcPatternB || function() { return null; };
      Y.calcPatternC = origCalcPatternC || function() { return null; };
      Y.findRepeatPlans = origFindRepeatPlans;
      console.log('[TORIAI v2.1] Rolled back to v1.');
    }
  };

  console.log('[TORIAI v2.1] Algorithm patches loaded.', {
    exactThreshold: EXACT_THRESHOLD,
    samplePatterns: SAMPLE_PATTERNS,
    maxPatternReturn: MAX_PATTERN_RETURN,
    patternCImplemented: true,
    typedArrayDP: true,
    findRepeatPlansV2: true,
    calcPatternAV2: true,
    calcPatternBV2: true
  });

})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window));
