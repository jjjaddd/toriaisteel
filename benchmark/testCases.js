/**
 * benchmark/testCases.js
 *
 * 再現可能なテストケース生成器（mulberry32 seed RNG）。
 *
 * profile:
 *   'uniform'    : 500-5000mm の一様ランダム長 k 種類
 *   'realistic'  : 短材80% (500-2000) + 長材20% (2000-5000)、現場感ある分布
 *   'stressful'  : 種類間の素因数差を作り、組み合わせが詰まりにくい最悪寄り
 *   'manyShort'  : 短材集中（800-1500）、k多い時の組み合わせ爆発を狙う
 *
 * 1ケース = { pieces: number[], stocks: {sl,max}[], blade, endLoss, kgm, meta }
 */

'use strict';

function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundTo5(x) { return Math.round(x / 5) * 5; }

function generateLengths(k, profile, rng) {
  const lengths = [];
  if (profile === 'uniform') {
    for (let i = 0; i < k; i++) {
      lengths.push(roundTo5(500 + rng() * 4500));
    }
  } else if (profile === 'realistic') {
    for (let i = 0; i < k; i++) {
      const isLong = rng() < 0.2;
      lengths.push(roundTo5(isLong ? 2000 + rng() * 3000 : 500 + rng() * 1500));
    }
  } else if (profile === 'stressful') {
    // 互いに素に近い差を持たせる：基本値 + 大きな素因数オフセット
    const basis = [533, 727, 911, 1097, 1283, 1471, 1657, 1847, 2039, 2237, 2423, 2617, 2803, 3001, 3187];
    for (let i = 0; i < k; i++) {
      const b = basis[i % basis.length];
      const jitter = Math.floor(rng() * 30) * 5;
      lengths.push(b + jitter);
    }
  } else if (profile === 'manyShort') {
    for (let i = 0; i < k; i++) {
      lengths.push(roundTo5(800 + rng() * 700));
    }
  } else {
    throw new Error('Unknown profile: ' + profile);
  }
  // 重複排除（安全のため）
  const uniq = Array.from(new Set(lengths));
  while (uniq.length < k) {
    uniq.push(roundTo5(500 + rng() * 4500));
  }
  return uniq.slice(0, k);
}

function generatePieces(lengths, n, rng, distribution) {
  // distribution = 'flat' (一様抽選) or 'skewed' (短い長さに偏らせる)
  const pieces = [];
  if (distribution === 'skewed') {
    // 各長さに重みを与える：短いほど多い
    const sorted = lengths.slice().sort((a, b) => a - b);
    const weights = sorted.map((_, i) => Math.exp(-i / lengths.length * 1.2));
    const sum = weights.reduce((a, b) => a + b, 0);
    const cum = [];
    let acc = 0;
    for (const w of weights) { acc += w / sum; cum.push(acc); }
    for (let i = 0; i < n; i++) {
      const r = rng();
      let idx = 0;
      while (idx < cum.length - 1 && cum[idx] < r) idx++;
      pieces.push(sorted[idx]);
    }
  } else {
    for (let i = 0; i < n; i++) {
      pieces.push(lengths[Math.floor(rng() * lengths.length)]);
    }
  }
  return pieces;
}

const DEFAULT_STOCKS = [
  { sl: 6000, max: 200 },
  { sl: 8000, max: 200 },
  { sl: 10000, max: 200 },
  { sl: 12000, max: 200 },
];

function generateCase(opts) {
  const k = opts.k;
  const n = opts.n;
  const profile = opts.profile || 'uniform';
  const distribution = opts.distribution || 'flat';
  const seed = (opts.seed != null) ? opts.seed : (1000 + k * 31 + n * 7);
  const rng = mulberry32(seed);

  const lengths = generateLengths(k, profile, rng);
  const pieces = generatePieces(lengths, n, rng, distribution);

  return {
    pieces: pieces,
    stocks: DEFAULT_STOCKS.map(s => Object.assign({}, s)),
    blade: 5,
    endLoss: 30,
    kgm: 9.3,
    remnants: [],
    minValidLen: 500,
    meta: {
      k: k,
      n: n,
      uniqueLens: new Set(pieces).size,
      profile: profile,
      distribution: distribution,
      seed: seed,
      lengthsSample: lengths.slice().sort((a, b) => a - b),
    },
  };
}

/**
 * 用途別マトリクス：
 *   - calibration : 動作確認用の小さい集合（k=5〜13）
 *   - boundary    : v1/v2 切替境界（k=11..16）の正確な比較
 *   - normal      : 通常モード狙い（k≤30, n≤200）
 *   - heavy       : 長考モード狙い（k=30〜50, n≤500）
 *   - stress      : 落ちる境界探し（k=20〜80, n=300〜800）
 */
function buildMatrix(name) {
  const cases = [];
  const profiles = ['uniform', 'realistic', 'stressful', 'manyShort'];

  if (name === 'calibration') {
    for (const profile of ['uniform', 'realistic']) {
      for (const k of [5, 8, 10, 12, 13]) {
        for (const n of [40, 100]) {
          cases.push(generateCase({ k, n, profile }));
        }
      }
    }
  } else if (name === 'boundary') {
    // k=11..16 で v1/v2 が完全一致するか確認
    for (const profile of ['uniform', 'realistic', 'stressful']) {
      for (const k of [11, 12, 13, 14, 15]) {
        for (const n of [60, 120]) {
          cases.push(generateCase({ k, n, profile, seed: 50000 + k * 100 + n }));
        }
      }
    }
  } else if (name === 'normal') {
    for (const profile of profiles) {
      for (const k of [10, 15, 20, 25, 30]) {
        for (const n of [80, 150, 200]) {
          cases.push(generateCase({ k, n, profile }));
        }
      }
    }
  } else if (name === 'heavy') {
    for (const profile of profiles) {
      for (const k of [30, 40, 50]) {
        for (const n of [200, 350, 500]) {
          cases.push(generateCase({ k, n, profile }));
        }
      }
    }
  } else if (name === 'stress') {
    for (const profile of profiles) {
      for (const k of [40, 60, 80]) {
        for (const n of [300, 600]) {
          cases.push(generateCase({ k, n, profile }));
        }
      }
    }
  } else {
    throw new Error('Unknown matrix: ' + name);
  }
  return cases;
}

module.exports = {
  mulberry32,
  generateCase,
  buildMatrix,
  DEFAULT_STOCKS,
};
