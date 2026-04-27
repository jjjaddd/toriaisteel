(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.data = ns.data || {};
  ns.data.steel = ns.data.steel || {};

  var SMALL_SQUARE_PIPE_SPECS = [
{ name:'p-9×9×1.0', shape:'square', W:0.289, inCalc:true },
  { name:'p-11×11×1.2', shape:'square', W:0.435, inCalc:true },
  { name:'p-13×13×1.6', shape:'square', W:0.69, inCalc:true },
  { name:'p-14×14×1.2', shape:'square', W:0.53, inCalc:true },
  { name:'p-16×16×1.2', shape:'square', W:0.621, inCalc:true },
  { name:'p-16×16×1.6', shape:'square', W:0.813, inCalc:true },
  { name:'p-19×19×1.2', shape:'square', W:0.716, inCalc:true },
  { name:'p-19×19×1.6', shape:'square', W:0.939, inCalc:true },
  { name:'p-21×21×1.2', shape:'square', W:0.811, inCalc:true },
  { name:'p-21×21×1.6', shape:'square', W:1.07, inCalc:true },
  { name:'p-24×24×1.6', shape:'square', W:1.19, inCalc:true },
  { name:'p-25×25×1.2', shape:'square', W:0.971, inCalc:true },
  { name:'p-25×25×1.6', shape:'square', W:1.28, inCalc:true },
  { name:'Rp-26×26×1.6', shape:'square', W:1.19, inCalc:true },
  { name:'p-28×28×1.6', shape:'square', W:1.44, inCalc:true },
  { name:'Rp-31×31×1.2', shape:'square', W:1.09, inCalc:true },
  { name:'Rp-31×31×1.6', shape:'square', W:1.44, inCalc:true },
  { name:'p-32×32×1.2', shape:'square', W:1.23, inCalc:true },
  { name:'p-32×32×1.6', shape:'square', W:1.62, inCalc:true },
  { name:'p-38×38×1.6', shape:'square', W:1.94, inCalc:true },
  { name:'Rp-40×40×1.6', shape:'square', W:1.94, inCalc:true },
  { name:'Rp-40×40×2.0', shape:'square', W:2.41, inCalc:true },
  { name:'p-45×45×1.6', shape:'square', W:2.32, inCalc:true },
  { name:'p-20×20×2.3', shape:'square', W:1.31, inCalc:true },
  { name:'p-25×25×2.3', shape:'square', W:1.67, inCalc:true },
  { name:'p-25×25×3.2', shape:'square', W:2.26, inCalc:true },
  { name:'p-30×30×2.3', shape:'square', W:2.03, inCalc:true },
  { name:'p-30×30×3.2', shape:'square', W:2.75, inCalc:true },
  { name:'p-35×35×3.2', shape:'square', W:3.3, inCalc:true },
  { name:'p-40×40×2.3', shape:'square', W:2.62, inCalc:true },
  { name:'p-40×40×3.2', shape:'square', W:3.58, inCalc:true },
  { name:'p-40×40×4.5', shape:'square', W:4.61, inCalc:true },
  { name:'p-45×45×2.3', shape:'square', W:3.1, inCalc:true },
  { name:'p-45×45×3.2', shape:'square', W:4.25, inCalc:true }
  ];

  var SMALL_RECT_PIPE_SPECS = [
{ name:'p-22×10×1.2', shape:'rect', W:0.621, inCalc:true },
  { name:'p-22×10×1.6', shape:'rect', W:0.813, inCalc:true },
  { name:'p-25×12×1.2', shape:'rect', W:0.716, inCalc:true },
  { name:'p-25×12×1.6', shape:'rect', W:0.939, inCalc:true },
  { name:'p-28×18×1.2', shape:'rect', W:0.906, inCalc:true },
  { name:'p-28×18×1.6', shape:'rect', W:1.19, inCalc:true },
  { name:'Rp-30×20×1.2', shape:'rect', W:0.906, inCalc:true },
  { name:'Rp-30×20×1.6', shape:'rect', W:1.19, inCalc:true },
  { name:'p-32×14×1.2', shape:'rect', W:0.906, inCalc:true },
  { name:'p-32×14×1.6', shape:'rect', W:1.19, inCalc:true },
  { name:'p-40×16×1.2', shape:'rect', W:1.09, inCalc:true },
  { name:'p-40×16×1.6', shape:'rect', W:1.44, inCalc:true },
  { name:'Rp-40×20×1.2', shape:'rect', W:1.09, inCalc:true },
  { name:'Rp-40×20×1.6', shape:'rect', W:1.44, inCalc:true },
  { name:'p-40×25×1.2', shape:'rect', W:1.23, inCalc:true },
  { name:'p-40×25×1.6', shape:'rect', W:1.62, inCalc:true },
  { name:'p-50×18×1.6', shape:'rect', W:1.71, inCalc:true },
  { name:'p-50×26×1.6', shape:'rect', W:1.94, inCalc:true },
  { name:'Rp-50×30×1.6', shape:'rect', W:1.94, inCalc:true },
  { name:'p-60×30×1.6', shape:'rect', W:2.32, inCalc:true },
  { name:'p-60×35×1.6', shape:'rect', W:2.44, inCalc:true },
  { name:'p-70×25×1.6', shape:'rect', W:2.44, inCalc:true },
  { name:'Rp-75×25×1.6', shape:'rect', W:2.44, inCalc:true },
  { name:'Rp-70×30×1.6', shape:'rect', W:2.44, inCalc:true },
  { name:'Rp-80×40×1.6', shape:'rect', W:2.95, inCalc:true },
  { name:'p-84×32×2.0', shape:'rect', W:3.66, inCalc:true },
  { name:'Rp-90×30×1.6', shape:'rect', W:2.95, inCalc:true },
  { name:'p-30×20×2.3', shape:'rect', W:1.67, inCalc:true },
  { name:'p-40×20×2.3', shape:'rect', W:2.03, inCalc:true },
  { name:'p-40×20×3.2', shape:'rect', W:2.75, inCalc:true },
  { name:'p-50×30×2.3', shape:'rect', W:2.62, inCalc:true },
  { name:'p-50×30×3.2', shape:'rect', W:3.58, inCalc:true },
  { name:'p-60×40×2.3', shape:'rect', W:3.34, inCalc:true },
  { name:'p-60×40×3.2', shape:'rect', W:4.76, inCalc:true },
  { name:'p-70×30×2.3', shape:'rect', W:3.47, inCalc:true },
  { name:'p-75×20×1.6', shape:'rect', W:2.32, inCalc:true },
  { name:'p-75×20×2.3', shape:'rect', W:3.3, inCalc:true },
  { name:'p-80×40×2.3', shape:'rect', W:4.2, inCalc:true },
  { name:'p-80×40×3.2', shape:'rect', W:5.77, inCalc:true },
  { name:'p-90×30×2.3', shape:'rect', W:4.2, inCalc:true },
  { name:'p-90×30×3.2', shape:'rect', W:5.77, inCalc:true },
  { name:'p-90×45×2.3', shape:'rect', W:4.86, inCalc:true },
  { name:'p-90×45×3.2', shape:'rect', W:6.68, inCalc:true }
  ];

  var SMALL_SQUARE_PIPE_ALL_SPECS = SMALL_SQUARE_PIPE_SPECS.concat(SMALL_RECT_PIPE_SPECS);

  ns.data.steel.smallSquarePipe = {
    specs: SMALL_SQUARE_PIPE_ALL_SPECS,
    getAllSpecs: function() { return SMALL_SQUARE_PIPE_ALL_SPECS.slice(); }
  };

  global.SMALL_SQUARE_PIPE_SPECS = SMALL_SQUARE_PIPE_ALL_SPECS.slice();
})(window);
