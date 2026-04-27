(function(global) {
  'use strict';

  var steel = global.Toriai.data.steel;

  steel.registerKind({
    type: '平鋼',
    // 基本は data.js の共通定尺に揃える。必要ならこの配列へ直接追加する。
    stockLengths: [5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000]
  });
})(window);
