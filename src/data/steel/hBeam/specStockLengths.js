(function(global){ 'use strict';
  var steel = global.Toriai.data.steel;

  // H形鋼の規格別定尺です。
  // 必要な規格だけ、このオブジェクトに追加してください。
  // 鋼種共通定尺を土台にして追従させたいので、
  // ここでは「include / exclude」の差分だけ持たせます。
  // 例:
  // 'H-100×50×5×7': { exclude:[11000] }
  steel.registerKind({
    type:'H蠖｢驪ｼ',
    specStockLengths:{
      'H-100×50×5×7':{ exclude:[11000] },
      'H-125×60×6×8':{ exclude:[11000] }
    }
  });
})(window);
