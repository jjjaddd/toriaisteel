(function(global){
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.data = ns.data || {};
  ns.data.steel = ns.data.steel || {};

  var UNEQUAL_UNEQUAL_ANGLE_SPECS = [
    { name:'L-200×90×9×14',   A:200, B:90,  t1:9,  t2:14, r1:14, r2:7,   Ac:29.66, W:23.3, Cx:6.36, Cy:2.15, Ix:1210,  Iy:200,  Iu:1290,  Iv:125, ix:6.39, iy:2.60, iu:6.58, iv:2.05, tanA:0.263,  Zx:88.7, Zy:29.2 },
    { name:'L-250×90×10×15',  A:250, B:90,  t1:10, t2:15, r1:17, r2:8.5, Ac:37.47, W:29.4, Cx:8.61, Cy:1.92, Ix:2440,  Iy:223,  Iu:2520,  Iv:147, ix:8.08, iy:2.44, iu:8.20, iv:1.98, tanA:0.182,  Zx:149,  Zy:31.5 },
    { name:'L-250×90×12×16',  A:250, B:90,  t1:12, t2:16, r1:17, r2:8.5, Ac:42.95, W:33.7, Cx:8.99, Cy:1.89, Ix:2790,  Iy:238,  Iu:2870,  Iv:160, ix:8.07, iy:2.35, iu:8.18, iv:1.63, tanA:0.173,  Zx:174,  Zy:33.5 },
    { name:'L-300×90×11×16',  A:300, B:90,  t1:11, t2:16, r1:19, r2:9.5, Ac:46.22, W:36.3, Cx:11.0, Cy:1.76, Ix:4370,  Iy:245,  Iu:4440,  Iv:168, ix:9.72, iy:2.30, iu:9.80, iv:1.90, tanA:0.136,  Zx:229,  Zy:33.8 },
    { name:'L-300×100×13×17', A:300, B:100, t1:13, t2:17, r1:19, r2:9.5, Ac:52.67, W:41.3, Cx:11.3, Cy:1.75, Ix:4940,  Iy:259,  Iu:5020,  Iv:181, ix:9.68, iy:2.22, iu:9.76, iv:1.85, tanA:0.126,  Zx:235,  Zy:35.8 },
    { name:'L-350×100×12×17', A:350, B:100, t1:12, t2:17, r1:22, r2:11,  Ac:57.74, W:45.3, Cx:13.0, Cy:1.87, Ix:7440,  Iy:362,  Iu:7550,  Iv:251, ix:11.3, iy:2.50, iu:11.4, iv:2.08, tanA:0.124,  Zx:338,  Zy:44.5 },
    { name:'L-400×100×13×18', A:400, B:100, t1:13, t2:18, r1:24, r2:12,  Ac:68.59, W:53.8, Cx:15.4, Cy:1.77, Ix:11500, Iy:388,  Iu:11600, Iv:277, ix:12.9, iy:2.38, iu:13.0, iv:2.01, tanA:0.0996, Zx:467,  Zy:47.1 }
  ];

  ns.data.steel.unequalUnequalAngle = {
    specs: UNEQUAL_UNEQUAL_ANGLE_SPECS,
    getAllSpecs: function(){
      return UNEQUAL_UNEQUAL_ANGLE_SPECS.slice();
    }
  };

  global.UNEQUAL_UNEQUAL_ANGLE_SPECS = UNEQUAL_UNEQUAL_ANGLE_SPECS.slice();
})(window);
