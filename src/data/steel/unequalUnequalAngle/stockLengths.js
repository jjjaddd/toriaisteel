(function(global){
  'use strict';

  var steel = global.Toriai.data.steel;

  // 不等辺不等厚山形鋼の共通定尺です。
  steel.registerKind({
    type: '不等辺不等厚山形鋼',
    stockLengths: [5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000]
  });
})(window);
