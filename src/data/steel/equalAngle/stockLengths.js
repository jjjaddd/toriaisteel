(function(global){
  'use strict';

  var steel = global.Toriai.data.steel;

  // 等辺山形鋼の共通定尺です。
  // 規格ごとの例外が必要になったら specStockLengths.js 側で差分管理します。
  steel.registerKind({
    type: '等辺山形鋼',
    stockLengths: [5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000]
  });
})(window);
