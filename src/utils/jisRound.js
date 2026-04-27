// JIS 丸め（JIS Z 8401:2019 規則A 準拠）
// 端数がちょうど 0.5 のとき偶数丸め（規則A）。それ以外は最近接整数倍。
// 浮動小数点誤差対策に 1e-10 の tolerance を使用。
function jisRound(value, decimals) {
  var factor = Math.pow(10, decimals);
  var shifted = value * factor;
  var floor = Math.floor(shifted);
  var diff = shifted - floor;
  if (Math.abs(diff - 0.5) < 1e-10) {
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }
  return Math.round(shifted) / factor;
}

function jisRoundKg(kg) {
  if (kg <= 0) return 0;
  return jisRound(kg, 0);
}
