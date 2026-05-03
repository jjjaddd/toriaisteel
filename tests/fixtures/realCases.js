/**
 * tests/fixtures/realCases.js
 *
 * 実務で発生した切断案件データ。2026-05-03 ユーザー提供。
 *
 * 6 ケース。うち 2 ケース (L20, L65) は V2 計算結果（ベースライン）付き。
 * 残り 4 ケース (□175, H175, H194, C100) は入力のみで V2 結果未提供。
 *
 * 用途:
 *   - Phase 2 (Arc-Flow + HiGHS) ソルバー完成時の精度ベンチマーク
 *   - Phase 4 (本番置換判定) で V1 / V2 / V3 比較の入力セット
 *   - 現時点 (Phase 1 完了時) では「TERM として load 可能か」のスモークのみ
 *
 * 共通定数:
 *   blade   = 3 mm
 *   endLoss = 150 mm（両端合算）
 *
 * 定尺リストは src/data/steel/<kind>/stockLengths.js から取得した実値。
 */

const STOCKS = {
  // 等辺山形鋼
  L: [5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000],
  // H 形鋼
  H: [6000, 7000, 8000, 9000, 10000, 11000, 12000],
  // 溝形鋼 / Channel
  C: [5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000],
  // 角パイプ
  SQUARE_PIPE: [4000, 5000, 5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000]
};

const COMMON = {
  blade: 3,
  endLoss: 150
};

const cases = [
  // ===========================================================================
  // CASE-1: 角形鋼管 □175×175×12
  // V2 結果: 未提供
  // ===========================================================================
  {
    id: 'CASE-1-square175',
    kind: '角パイプ',
    spec: '□-175×175×12',
    blade: COMMON.blade,
    endLoss: COMMON.endLoss,
    availableStocks: STOCKS.SQUARE_PIPE,
    pieces: [
      { length: 176, count: 96 },  // 92 + 4
      { length: 292, count: 4 }    // 2 + 2
    ],
    totalPieceCount: 100,
    v2Baseline: null,
    notes: 'ユーザー入力で 176 と 292 が分かれて記載されていたため count を合算した'
  },

  // ===========================================================================
  // CASE-2: 山形鋼 L-20×20×3   ★ V2 ベースライン提供
  // ===========================================================================
  {
    id: 'CASE-2-L20',
    kind: '等辺山形鋼',
    spec: 'L-20×20×3',
    blade: COMMON.blade,
    endLoss: COMMON.endLoss,
    availableStocks: STOCKS.L,
    pieces: [
      { length: 1750, count: 4 },
      { length: 1825, count: 50 },
      { length: 1830, count: 60 },
      { length: 1992, count: 18 },
      { length: 2806, count: 60 }
    ],
    totalPieceCount: 192,
    v2Baseline: {
      bars: [
        { stock: 6000, count: 44 },
        { stock: 9000, count: 1 },
        { stock: 10000, count: 5 },
        { stock: 12000, count: 10 }
      ],
      totalBars: 60,
      stockTotal: 44 * 6000 + 1 * 9000 + 5 * 10000 + 10 * 12000, // = 443,000
      yieldPctReported: 93.1,
      cutContent: '2,806×60 / 1,992×18 / 1,830×60 / 1,825×50 / 1,750×4'
    }
  },

  // ===========================================================================
  // CASE-3: H 形鋼 H-175×175×7.5×9
  // V2 結果: 未提供
  // ===========================================================================
  {
    id: 'CASE-3-H175',
    kind: 'H形鋼',
    spec: 'H-175×175×7.5×9',
    blade: COMMON.blade,
    endLoss: COMMON.endLoss,
    availableStocks: STOCKS.H,
    pieces: [
      { length: 2292, count: 2 },
      { length: 2792, count: 20 },  // 8 + 12
      { length: 6744, count: 2 },
      { length: 7244, count: 20 }   // 8 + 12
    ],
    totalPieceCount: 44,
    v2Baseline: null,
    notes: '同一長の重複行はユーザー入力でロット分割されていたものを合算'
  },

  // ===========================================================================
  // CASE-4: H 形鋼 H-194×150
  // V2 結果: 未提供
  // ===========================================================================
  {
    id: 'CASE-4-H194',
    kind: 'H形鋼',
    spec: 'H-194×150',
    blade: COMMON.blade,
    endLoss: COMMON.endLoss,
    availableStocks: STOCKS.H,
    pieces: [
      { length: 362,  count: 4 },
      { length: 412,  count: 44 },
      { length: 425,  count: 4 },
      { length: 512,  count: 8 },
      { length: 1375, count: 4 },
      { length: 1750, count: 2 },
      { length: 1825, count: 30 },
      { length: 2792, count: 2 },
      { length: 3480, count: 4 },
      { length: 4490, count: 4 },
      { length: 4590, count: 4 },
      { length: 4790, count: 4 },
      { length: 4968, count: 4 },
      { length: 5280, count: 8 },
      { length: 5530, count: 4 },
      { length: 5880, count: 4 },
      { length: 6180, count: 8 },
      { length: 6190, count: 12 },
      { length: 7544, count: 2 }
    ],
    totalPieceCount: 156,
    v2Baseline: null,
    notes: 'k=19 と多種、6m 級の長尺が多い。Phase 2 でストレステスト候補'
  },

  // ===========================================================================
  // CASE-5: 溝形鋼 C-100×50×5
  // V2 結果: 未提供
  // ===========================================================================
  {
    id: 'CASE-5-C100',
    kind: '溝形鋼',
    spec: 'C-100×50×5',
    blade: COMMON.blade,
    endLoss: COMMON.endLoss,
    availableStocks: STOCKS.C,
    pieces: [
      { length: 1385, count: 2 },
      { length: 1451, count: 16 },
      { length: 1495, count: 4 },
      { length: 1616, count: 4 },
      { length: 1656, count: 4 },
      { length: 1696, count: 4 },
      { length: 1815, count: 44 },
      { length: 1830, count: 43 },
      { length: 1855, count: 18 },
      { length: 2619, count: 2 },
      { length: 2950, count: 1 },
      { length: 3085, count: 8 },
      { length: 3128, count: 4 },
      { length: 3131, count: 2 },
      { length: 3173, count: 2 },
      { length: 3176, count: 2 },
      { length: 3205, count: 4 },
      { length: 3248, count: 16 },
      { length: 3353, count: 4 },
      { length: 3358, count: 2 },
      { length: 3368, count: 2 },
      { length: 3385, count: 2 },
      { length: 3395, count: 6 },
      { length: 3428, count: 6 },
      { length: 3468, count: 14 },
      { length: 3543, count: 2 }
    ],
    totalPieceCount: 218,
    v2Baseline: null,
    notes: 'k=26 で大規模。NOTES.md の旧 V2 ベンチでは⭐optimalバッジが取れていた件'
  },

  // ===========================================================================
  // CASE-6: 山形鋼 L-65×65×6   ★ V2 ベースライン提供
  // V2 cut content をそのまま pieces に転写（V2 が集約済み）
  // ===========================================================================
  {
    id: 'CASE-6-L65',
    kind: '等辺山形鋼',
    spec: 'L-65×65×6',
    blade: COMMON.blade,
    endLoss: COMMON.endLoss,
    availableStocks: STOCKS.L,
    pieces: [
      // 1100 mm 台
      { length: 1142, count: 6 },
      { length: 1145, count: 2 },
      { length: 1147, count: 4 },
      { length: 1148, count: 2 },
      { length: 1152, count: 6 },
      { length: 1155, count: 6 },
      { length: 1156, count: 2 },
      { length: 1157, count: 7 },
      { length: 1165, count: 6 },
      { length: 1166, count: 2 },
      { length: 1167, count: 7 },
      { length: 1171, count: 39 },
      { length: 1180, count: 2 },
      { length: 1189, count: 38 },
      { length: 1191, count: 38 },
      // 1200 mm 台
      { length: 1201, count: 34 },
      { length: 1207, count: 8 },
      { length: 1208, count: 30 },
      { length: 1209, count: 3 },
      { length: 1217, count: 3 },
      { length: 1219, count: 4 },
      { length: 1238, count: 12 },
      { length: 1243, count: 8 },
      { length: 1248, count: 12 },
      { length: 1253, count: 8 },
      { length: 1257, count: 2 },
      { length: 1260, count: 1 },
      { length: 1261, count: 7 },
      { length: 1271, count: 8 },
      { length: 1278, count: 4 },
      { length: 1283, count: 4 },
      { length: 1290, count: 2 },
      { length: 1292, count: 1 },
      { length: 1294, count: 4 },
      { length: 1296, count: 11 },
      { length: 1299, count: 4 },
      // 1300 mm 台
      { length: 1306, count: 11 },
      { length: 1309, count: 4 },
      { length: 1331, count: 5 },
      { length: 1332, count: 2 },
      { length: 1341, count: 6 },
      { length: 1342, count: 2 },
      { length: 1363, count: 1 },
      { length: 1373, count: 1 },
      // 2300〜2900 mm 台（中尺）
      { length: 2389, count: 1 },
      { length: 2439, count: 15 },
      { length: 2465, count: 1 },
      { length: 2475, count: 1 },
      { length: 2476, count: 19 },
      { length: 2506, count: 3 },
      { length: 2516, count: 16 },
      { length: 2520, count: 3 },
      { length: 2523, count: 3 },
      { length: 2585, count: 12 },
      { length: 2681, count: 4 },
      { length: 2695, count: 1 },
      { length: 2705, count: 1 },
      { length: 2714, count: 3 },
      { length: 2731, count: 1 },
      { length: 2780, count: 5 },
      { length: 2848, count: 1 },
      { length: 2855, count: 4 }
    ],
    // 計算した totalPieceCount は V2 cut content 集計と一致（1mm×207 は除外）
    totalPieceCount: 463,
    v2Baseline: {
      bars: [
        { stock: 11000, count: 67 }
      ],
      totalBars: 67,
      stockTotal: 67 * 11000, // = 737,000
      yieldPctReported: 93.5,
      cutContent: '上記 pieces と一致（V2 出力末尾の "1mm × 207" は端材記録の表示揺れと判断、入力からは除外）'
    },
    notes: [
      'k=61 / n=472 級の最大規模ケース',
      'V2 は 11m 単一定尺で 67 本に解いた → 多定尺ミックスで改善余地あるはず',
      'V3 ソルバー (Phase 2) 完成時の最終ボス'
    ].join(' / ')
  }
];

module.exports = {
  COMMON: COMMON,
  STOCKS: STOCKS,
  cases: cases
};
