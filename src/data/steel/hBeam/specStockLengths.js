(function(global){ 'use strict';
  var steel = global.Toriai.data.steel;
  steel.registerKind({
    type:'H\u5f62\u92fc',
    specStockLengths:{
      'H-100×50×5×7': { exclude:[11000] },
      'H-125×60×6×8': { exclude:[11000] }
    }
  });
})(window);
