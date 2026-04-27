// 塗装面積（m / m）計算 — 鋼種ごとの周長から算出
// データ層と独立した純関数。`spec` はサイズ定義オブジェクト。

function calcUnitWeightFromArea(Ac) {
  return typeof jisRound === 'function'
    ? jisRound(Ac * 0.785, 2)
    : +(Ac * 0.785).toFixed(2);
}

function calcHPaintAreaPerMeter(s) {
  const r = Number(s.r != null ? s.r : (s.r1 || 0));
  const P = 4 * s.B + 2 * s.H - 2 * s.t1 + (2 * Math.PI * r) - (8 * r);
  return +(P / 1000).toFixed(3);
}

function calcChannelPaintAreaPerMeter(s) {
  return +(((2 * s.B) + s.H - s.t2) / 1000).toFixed(3);
}

function calcLAnglePaintAreaPerMeter(spec) {
  var A  = Number(spec.A || 0);
  var B  = Number(spec.B || 0);
  var t1 = Number(spec.t1 || spec.t || 0);
  var t2 = Number(spec.t2 || spec.t || 0);
  var P = (A - t2) + (B - t1) + t1 + t2;
  return +(P / 1000).toFixed(3);
}

function calcRoundBarPaintAreaPerMeter(spec) {
  return +((Math.PI * Number(spec.D || 0)) / 1000).toFixed(3);
}

function calcSquareBarPaintAreaPerMeter(spec) {
  return +(((4 * Number(spec.a || 0)) / 1000)).toFixed(3);
}

function calcLightCChannelPaintAreaPerMeter(spec) {
  return +(((Number(spec.H || 0) + 2 * Number(spec.A || 0) + 2 * Number(spec.B || 0)) / 1000)).toFixed(3);
}

function calcSquarePipePaintAreaPerMeter(spec) {
  return +(((2 * (Number(spec.A || 0) + Number(spec.B || 0))) / 1000)).toFixed(3);
}

function calcPipePaintAreaPerMeter(spec) {
  return +(Number(spec.S || 0)).toFixed(3);
}

function approxAreaFromWeight(weight) {
  return +(Number(weight || 0) / 0.785).toFixed(3);
}
