# CODEX指示：重量計算の丸めを JIS Z 8401 に統一

## 概要

サイト全体の重量表示を JIS Z 8401（偶数丸め＋有効数字ルール）に統一する。

---

## 丸めルール

### JIS Z 8401 偶数丸め（バンカーズ丸め）
端数がちょうど 0.5 のとき、通常の四捨五入（常に切り上げ）ではなく、
最も近い **偶数** に丸める。

| 値 | 普通の四捨五入 | JIS偶数丸め |
|---|---|---|
| 3.25 → 小数1位 | 3.3 | **3.2**（偶数） |
| 3.35 → 小数1位 | 3.4 | **3.4**（偶数） |
| 2.5 → 整数 | 3 | **2**（偶数） |
| 3.5 → 整数 | 4 | **4**（偶数） |

### 重量の有効桁ルール
- **1000kg未満**: 有効数字3桁に丸める
  - 123.456 kg → **123 kg**
  - 12.3456 kg → **12.3 kg**
  - 1.23456 kg → **1.23 kg**
  - 0.12345 kg → **0.123 kg**
- **1000kg以上**: 整数に丸める
  - 1050.6 kg → **1051 kg**
  - 12345.6 kg → **12346 kg**

---

## 実装手順

### STEP 1: 共通丸め関数を `weight.js` の先頭付近に追加

`_wFmt` 関数（24行付近）の**直前**に以下を追加する：

```js
/**
 * JIS Z 8401 偶数丸め
 * @param {number} value - 丸める値
 * @param {number} decimals - 小数点以下の桁数
 * @returns {number}
 */
function jisRound(value, decimals) {
  var factor = Math.pow(10, decimals);
  var shifted = value * factor;
  var floor   = Math.floor(shifted);
  var diff    = shifted - floor;
  if (Math.abs(diff - 0.5) < 1e-10) {
    // ちょうど0.5: 偶数に丸める
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }
  return Math.round(shifted) / factor;
}

/**
 * 重量 kg を JIS丸めで有効数字3桁（1t以上は整数）に丸める
 * @param {number} kg
 * @returns {number}
 */
function jisRoundKg(kg) {
  if (kg <= 0) return 0;
  if (kg >= 1000) {
    return jisRound(kg, 0);
  }
  var magnitude = Math.floor(Math.log10(kg));
  var decimals  = Math.max(0, 2 - magnitude);
  return jisRound(kg, decimals);
}
```

---

### STEP 2: `_wFmt` 関数を JIS対応版に差し替え

**対象ファイル: `weight.js`**

```js
// 変更前
function _wFmt(v, dec) {
  return v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// 変更後
function _wFmt(v, dec) {
  var rounded = jisRound(v, dec);
  return rounded.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// 重量専用フォーマット（有効数字3桁ルール適用）
function _wFmtKg(kg) {
  var rounded = jisRoundKg(kg);
  // 有効数字に合わせて小数点以下桁数を決定
  if (rounded >= 1000 || rounded <= 0) {
    return rounded.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  var magnitude = Math.floor(Math.log10(rounded));
  var dec = Math.max(0, 2 - magnitude);
  return rounded.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
```

---

### STEP 3: 重量表示を `_wFmtKg()` に切り替え

**対象ファイル: `weight.js`**

`wRenderRows()` 内で重量を表示している箇所を `_wFmt(r.kg1, 0)` → `_wFmtKg(r.kg1)` 、
`_wFmt(r.kgTotal, 0)` → `_wFmtKg(r.kgTotal)` に変更する。

合計行（sumKg）も同様に `_wFmt(sumKg, 0)` → `_wFmtKg(sumKg)` に変更。

`wPrint()` 内の重量表示も同様に変更する。

`wPreview()` 内の重量表示も同様に変更する。

---

### STEP 4: `wAddRow()` で保存値にも丸めを適用

**対象ファイル: `weight.js`**

`wAddRow()` 内の計算部分（325行付近）：

```js
// 変更前
var kg1  = kgm * len / 1000;
var kg   = kg1 * qty;

// 変更後
var kg1  = jisRoundKg(kgm * len / 1000);
var kg   = jisRoundKg(kg1 * qty);
```

---

### STEP 5: `main.js` の重量表示を JIS丸めに統一

**対象ファイル: `main.js`**

以下の `Math.round(kg)` 呼び出しをすべて `jisRoundKg(kg)` に変更する。

検索パターン: `Math.round(.*[Kk]g` または `Math.round(tot`

主な対象箇所（行番号は目安）：
- `Math.round(kg) + 'kg'`（updKg関数付近、838行）
- `Math.round(tot) + ' kg'`（totkg表示、844行）
- `Math.round(yb.barKg)`（1872行）
- `Math.round(yb.lossKg)`（1873行）
- `Math.round(m.barKg||0)`（2042行）
- `Math.round(m.lossKg||0)`（2043行）

変更例：
```js
// 変更前
el.textContent = Math.round(kg) + 'kg';
// 変更後
el.textContent = jisRoundKg(kg) + 'kg';
```

**注意**: `jisRoundKg` は `weight.js` で定義するので、`main.js` から呼べるようにグローバル関数として定義する（`weight.js` は `main.js` の後に読み込まれるため）。

**対応策**: `main.js` にも同じ `jisRoundKg` をコピーして定義するか、または `jisRoundKg` を `storage.js`（最初に読み込まれるファイル）に定義して両方から使えるようにする。

---

### STEP 6: `data.js` の単位重量計算を JIS対応に

**対象ファイル: `data.js`**

```js
// 変更前
function calcUnitWeightFromArea(Ac){
  return +(Ac * 0.785).toFixed(2);
}

// 変更後
function calcUnitWeightFromArea(Ac){
  return jisRound(Ac * 0.785, 2);
}
```

---

## 動作確認ポイント

| ケース | 期待値 |
|---|---|
| kgm=0.885, len=2333, qty=33 | 1本=2.063kg → 33本=68.1kg |
| 合計重量 1050.6kg | **1051 kg** |
| 合計重量 12.3456kg | **12.3 kg** |
| 合計重量 1.23456kg | **1.23 kg** |
| 3.25を小数1位に丸め | **3.2**（偶数丸め確認） |

---

## ファイル修正サマリー

| ファイル | 変更内容 |
|---|---|
| `weight.js` | `jisRound` / `jisRoundKg` / `_wFmtKg` 追加、`_wFmt` 修正、`wAddRow` 修正、表示箇所を `_wFmtKg` に切替 |
| `main.js` または `storage.js` | `jisRoundKg` 定義追加（グローバル）、`Math.round(kg)` を `jisRoundKg(kg)` に置換 |
| `data.js` | `calcUnitWeightFromArea` を `jisRound` 使用に修正 |
