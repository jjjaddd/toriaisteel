(function(global){ 'use strict';
  var steel = global.Toriai.data.steel;
  // H形鋼の鋼種共通定尺です。
  // 規格ごとに違う定尺を持たせたい場合は specStockLengths.js 側に追加します。
  steel.registerKind({ type:'H蠖｢驪ｼ', stockLengths:[6000,7000,8000,9000,10000,11000,12000] });
})(window);
