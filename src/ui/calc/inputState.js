(function(global) {
  'use strict';

  var ns = global.Toriai;
  if (!ns) return;

  ns.ui = ns.ui || {};
  ns.ui.calc = ns.ui.calc || {};

  function readCalcSettings() {
    return {
      blade: parseInt((document.getElementById('blade') || {}).value, 10) || 3,
      endLoss: parseInt((document.getElementById('endloss') || {}).value, 10) || 75,
      kgm: parseFloat((document.getElementById('kgm') || {}).value) || 0,
      minValidLen: parseInt((document.getElementById('minRemnantLen') || {}).value, 10) || 500
    };
  }

  function readSelectedStocks(stdLengths) {
    var stocks = [];
    (stdLengths || []).forEach(function(sl, idx) {
      var checkEl = document.getElementById('sc' + idx);
      if (!checkEl || !checkEl.checked) return;
      var maxValue = parseInt((document.getElementById('sm' + idx) || {}).value, 10);
      stocks.push({
        sl: sl,
        max: isNaN(maxValue) || maxValue < 1 ? Infinity : maxValue
      });
    });
    return stocks;
  }

  function readCalcPieces(totalRows) {
    var pieces = [];
    var invalidLength = null;
    for (var i = 0; i < totalRows; i++) {
      var lengthEl = document.getElementById('pl' + i);
      var qtyEl = document.getElementById('pq' + i);
      if (!lengthEl) continue;
      var length = parseInt(lengthEl.value, 10);
      var qty = parseInt((qtyEl || {}).value, 10);
      if (length > 12000) {
        invalidLength = length;
        break;
      }
      if (length > 0 && qty > 0) {
        for (var k = 0; k < qty; k++) pieces.push(length);
      }
    }
    return {
      pieces: pieces,
      invalidLength: invalidLength
    };
  }

  function buildRemnantOnlyBars(remnants) {
    return (remnants || []).slice().sort(function(a, b) {
      return b - a;
    }).map(function(remnantLength) {
      return { pat: [], loss: remnantLength, sl: remnantLength };
    });
  }

  function updateStocksBadge(stocks) {
    var badge = document.getElementById('stocksBadge');
    if (!badge) return;
    badge.textContent = '使用定尺: ' + (stocks || []).map(function(stock) {
      return stock.sl.toLocaleString() + 'mm';
    }).join(' / ');
  }

  function assignPieceColors(pieces, palette, targetMap) {
    var map = targetMap || {};
    Object.keys(map).forEach(function(key) {
      delete map[key];
    });
    var uniqueLengths = [];
    (pieces || []).forEach(function(piece) {
      if (uniqueLengths.indexOf(piece) < 0) uniqueLengths.push(piece);
    });
    uniqueLengths.sort(function(a, b) {
      return b - a;
    });
    uniqueLengths.forEach(function(length, colorIndex) {
      map[length] = palette[colorIndex % palette.length];
    });
    return map;
  }

  function collectCalcExecutionState(options) {
    options = options || {};
    var settings = readCalcSettings();
    var stocks = readSelectedStocks(options.stdLengths || []);
    var pieceState = readCalcPieces(options.totalRows || 0);
    var remnants = typeof options.getRemnants === 'function' ? options.getRemnants() : [];

    return {
      blade: settings.blade,
      endLoss: settings.endLoss,
      kgm: settings.kgm,
      minValidLen: settings.minValidLen,
      stocks: stocks,
      pieces: pieceState.pieces,
      remnants: remnants,
      invalidLength: pieceState.invalidLength,
      remnantOnlyBars: buildRemnantOnlyBars(remnants)
    };
  }

  ns.ui.calc.readCalcSettings = readCalcSettings;
  ns.ui.calc.readSelectedStocks = readSelectedStocks;
  ns.ui.calc.readCalcPieces = readCalcPieces;
  ns.ui.calc.buildRemnantOnlyBars = buildRemnantOnlyBars;
  ns.ui.calc.updateStocksBadge = updateStocksBadge;
  ns.ui.calc.assignPieceColors = assignPieceColors;
  ns.ui.calc.collectCalcExecutionState = collectCalcExecutionState;
})(window);
