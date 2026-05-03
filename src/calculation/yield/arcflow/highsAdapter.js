/**
 * TORIAI 計算 V3 — Arc-Flow 数値ソルバー基盤
 *
 * highsAdapter.js — HiGHS-WASM ソルバーへのアクセス層。
 *
 * 役割:
 *   - HiGHS-WASM の lazy load（初回 solve 時に WASM をロード、以降キャッシュ）
 *   - LP / MIP 問題文字列を投げる薄いラッパー
 *   - 戻り値を JS 側で扱いやすい形に整形
 *
 * 環境別ローダ:
 *   - Node.js（テスト・ベンチマーク）: `require('highs')` を使う
 *   - Browser（Phase 3 配線時）: `globalThis.highsLoader` 経由で読む
 *     → ブラウザ用ローダの設定方法は Phase 3 で確定
 *
 * このモジュールは algebra と違い **CommonJS で書く**（require が必要なため）。
 * algebra/* と統合する際は、algebra namespace 経由ではなく直接 require する。
 *
 * 依存: 'highs' (npm), HiGHS-WASM 1.8.0
 */

'use strict';

// ============================================================================
// HiGHS インスタンスの lazy load（プロセス全体で 1 つにキャッシュ）
// ============================================================================

let _highsPromise = null;

/**
 * HiGHS インスタンスを返す（初回呼出時に WASM をロード）。
 *
 * @param {object} [options] HiGHS loader オプション (locateFile など)
 * @returns {Promise<{ solve: Function }>}
 */
function loadHighs(options) {
  if (_highsPromise) return _highsPromise;
  let highsLoader;
  // Node 環境
  if (typeof require === 'function') {
    try {
      highsLoader = require('highs');
    } catch (e) {
      throw new Error('[arcflow/highsAdapter] highs npm package not found. Run: npm install highs');
    }
  } else if (typeof globalThis !== 'undefined' && globalThis.highsLoader) {
    // Browser 環境（Phase 3 で configure）
    highsLoader = globalThis.highsLoader;
  } else {
    throw new Error('[arcflow/highsAdapter] no HiGHS loader available (need require("highs") or globalThis.highsLoader)');
  }
  _highsPromise = highsLoader(options || {});
  return _highsPromise;
}

/**
 * テスト・デバッグ用: load 状態をリセット。次の loadHighs で再ロードされる。
 */
function _resetForTesting() {
  _highsPromise = null;
}

// ============================================================================
// solve() — LP/MIP 問題文字列を解く
// ============================================================================

/**
 * @param {string} problemLp  CPLEX LP format の問題文字列
 * @param {object} [solveOptions] HiGHS solve オプション (output_flag, time_limit など)
 * @param {object} [loadOptions] HiGHS loader オプション (初回ロード時のみ有効)
 * @returns {Promise<HighsSolution>} HiGHS の生 solution
 */
async function solve(problemLp, solveOptions, loadOptions) {
  if (typeof problemLp !== 'string') {
    throw new TypeError('[arcflow/highsAdapter] problemLp must be a string');
  }
  const highs = await loadHighs(loadOptions);
  // ⚠ HiGHS-WASM 1.8.0 既知の罠:
  //   - `output_flag: false` または `log_to_console: false` を渡すと、解テキストも
  //     消されて "Unable to parse solution. Too few lines." で失敗する
  //   - 安全に動かすには **オプションを渡さない** こと
  //   - solveOptions が渡された場合は呼び出し側の責任で罠を避ける
  if (solveOptions === undefined || solveOptions === null) {
    return highs.solve(problemLp);
  }
  return highs.solve(problemLp, solveOptions);
}

// ============================================================================
// 整形ヘルパ — HiGHS の生 solution を扱いやすい形に
// ============================================================================

/**
 * HiGHS solution から「変数名 → 値（Primal）」の単純な辞書を返す。
 * 整数解（MIP）と連続解（LP）どちらでも動く。
 *
 * @param {HighsSolution} solution
 * @returns {Record<string, number>}
 */
function extractPrimal(solution) {
  if (!solution || !solution.Columns) return {};
  const out = {};
  for (const name in solution.Columns) {
    if (Object.prototype.hasOwnProperty.call(solution.Columns, name)) {
      out[name] = solution.Columns[name].Primal;
    }
  }
  return out;
}

/**
 * 解のステータスが 'Optimal' か判定。
 */
function isOptimal(solution) {
  return !!solution && solution.Status === 'Optimal';
}

// ============================================================================
// 公開
// ============================================================================

module.exports = {
  loadHighs: loadHighs,
  solve: solve,
  extractPrimal: extractPrimal,
  isOptimal: isOptimal,
  _resetForTesting: _resetForTesting
};
