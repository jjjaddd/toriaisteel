(function(global){
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.data = ns.data || {};
  ns.data.steel = ns.data.steel || {};

  var UNEQUAL_ANGLE_SPECS = [
    { name:'L-90×75×9',    A:90,  B:75,  t:9,  r1:8.5, r2:6,   Ac:14.04, W:11.0, Cx:2.75, Cy:2.00, Ix:109,  Iy:68.1, Iu:143,  Iv:34.1, ix:2.78, iy:2.20, iu:3.19, iv:1.56, tanA:0.676, Zx:17.4, Zy:12.4 },
    { name:'L-100×75×7',   A:100, B:75,  t:7,  r1:10,  r2:5,   Ac:11.87, W:9.32, Cx:3.06, Cy:1.83, Ix:118,  Iy:56.9, Iu:144,  Iv:30.8, ix:3.15, iy:2.19, iu:3.49, iv:1.61, tanA:0.548, Zx:17.0, Zy:10.0 },
    { name:'L-125×75×7',   A:125, B:75,  t:7,  r1:10,  r2:5,   Ac:13.62, W:10.7, Cx:4.10, Cy:1.64, Ix:219,  Iy:60.4, Iu:243,  Iv:36.4, ix:4.01, iy:2.11, iu:4.23, iv:1.65, tanA:0.362, Zx:26.1, Zy:10.3 },
    { name:'L-125×75×10',  A:125, B:75,  t:10, r1:10,  r2:7,   Ac:19.00, W:14.9, Cx:4.22, Cy:1.75, Ix:299,  Iy:80.8, Iu:330,  Iv:49.0, ix:3.96, iy:2.06, iu:4.17, iv:1.61, tanA:0.357, Zx:36.1, Zy:14.1 },
    { name:'L-125×75×13',  A:125, B:75,  t:13, r1:10,  r2:7,   Ac:24.31, W:19.1, Cx:4.35, Cy:1.87, Ix:376,  Iy:101,  Iu:415,  Iv:61.9, ix:3.93, iy:2.04, iu:4.13, iv:1.60, tanA:0.352, Zx:46.1, Zy:17.9 },
    { name:'L-125×90×10',  A:125, B:90,  t:10, r1:10,  r2:7,   Ac:20.50, W:16.1, Cx:3.95, Cy:2.22, Ix:318,  Iy:138,  Iu:380,  Iv:76.2, ix:3.94, iy:2.59, iu:4.30, iv:1.63, tanA:0.505, Zx:37.2, Zy:20.3 },
    { name:'L-125×90×13',  A:125, B:90,  t:13, r1:10,  r2:7,   Ac:26.26, W:20.6, Cx:4.07, Cy:2.34, Ix:401,  Iy:173,  Iu:477,  Iv:96.3, ix:3.91, iy:2.57, iu:4.26, iv:1.91, tanA:0.501, Zx:47.5, Zy:25.9 },
    { name:'L-150×90×9',   A:150, B:90,  t:9,  r1:12,  r2:6,   Ac:20.94, W:16.4, Cx:4.95, Cy:1.99, Ix:485,  Iy:133,  Iu:537,  Iv:80.4, ix:4.81, iy:2.52, iu:5.06, iv:1.96, tanA:0.361, Zx:48.2, Zy:19.0 },
    { name:'L-150×90×12',  A:150, B:90,  t:12, r1:12,  r2:8.5, Ac:27.36, W:21.5, Cx:5.07, Cy:2.10, Ix:619,  Iy:167,  Iu:685,  Iv:102,  ix:4.76, iy:2.47, iu:5.00, iv:1.93, tanA:0.357, Zx:62.3, Zy:24.3 },
    { name:'L-150×100×9',  A:150, B:100, t:9,  r1:12,  r2:6,   Ac:21.84, W:17.1, Cx:4.76, Cy:2.30, Ix:502,  Iy:181,  Iu:579,  Iv:104,  ix:4.79, iy:2.88, iu:5.15, iv:2.18, tanA:0.439, Zx:49.1, Zy:23.5 },
    { name:'L-150×100×12', A:150, B:100, t:12, r1:12,  r2:8.5, Ac:28.56, W:22.4, Cx:4.88, Cy:2.41, Ix:642,  Iy:228,  Iu:738,  Iv:132,  ix:4.74, iy:2.83, iu:5.09, iv:2.15, tanA:0.435, Zx:63.4, Zy:30.1 }
  ];

  ns.data.steel.unequalAngle = {
    specs: UNEQUAL_ANGLE_SPECS,
    getAllSpecs: function(){
      return UNEQUAL_ANGLE_SPECS.slice();
    }
  };

  global.UNEQUAL_ANGLE_SPECS = UNEQUAL_ANGLE_SPECS.slice();
})(window);
