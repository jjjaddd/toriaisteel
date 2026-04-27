(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.data = ns.data || {};
  ns.data.steel = ns.data.steel || {};

  var SQUARE_PIPE_BASE_SPECS = [
{ name:'□40x40x1.6', A:40, B:40, t:1.6, W:1.88, Asec:2.392, Ix:5.79, Zx:2.90, ix:1.56 },
  { name:'□40x40x2.3', A:40, B:40, t:2.3, W:2.62, Asec:3.332, Ix:7.73, Zx:3.86, ix:1.52 },
  { name:'□50x50x1.6', A:50, B:50, t:1.6, W:2.38, Asec:3.032, Ix:11.7, Zx:4.68, ix:1.96 },
  { name:'□50x50x2.3', A:50, B:50, t:2.3, W:3.34, Asec:4.252, Ix:15.9, Zx:6.34, ix:1.93 },
  { name:'□50x50x3.2', A:50, B:50, t:3.2, W:4.50, Asec:5.727, Ix:20.4, Zx:8.16, ix:1.89 },
  { name:'□60x60x1.6', A:60, B:60, t:1.6, W:2.88, Asec:3.672, Ix:20.7, Zx:6.89, ix:2.37 },
  { name:'□60x60x2.3', A:60, B:60, t:2.3, W:4.06, Asec:5.172, Ix:28.3, Zx:9.44, ix:2.34 },
  { name:'□60x60x3.2', A:60, B:60, t:3.2, W:5.50, Asec:7.007, Ix:36.9, Zx:12.3, ix:2.30 },
  { name:'□75x75x1.6', A:75, B:75, t:1.6, W:3.64, Asec:4.632, Ix:41.3, Zx:11.0, ix:2.99 },
  { name:'□75x75x2.3', A:75, B:75, t:2.3, W:5.14, Asec:6.552, Ix:57.1, Zx:15.2, ix:2.95 },
  { name:'□75x75x3.2', A:75, B:75, t:3.2, W:7.01, Asec:8.927, Ix:75.5, Zx:20.1, ix:2.91 },
  { name:'□75x75x4.5', A:75, B:75, t:4.5, W:9.55, Asec:12.17, Ix:98.6, Zx:26.3, ix:2.85 },
  { name:'□80x80x2.3', A:80, B:80, t:2.3, W:5.50, Asec:7.012, Ix:69.9, Zx:17.5, ix:3.16 },
  { name:'□80x80x3.2', A:80, B:80, t:3.2, W:7.51, Asec:9.567, Ix:92.7, Zx:23.2, ix:3.11 },
  { name:'□80x80x4.5', A:80, B:80, t:4.5, W:10.3, Asec:13.07, Ix:122, Zx:30.4, ix:3.05 },
  { name:'□90x90x2.3', A:90, B:90, t:2.3, W:6.23, Asec:7.932, Ix:101, Zx:22.4, ix:3.56 },
  { name:'□90x90x3.2', A:90, B:90, t:3.2, W:8.51, Asec:10.85, Ix:135, Zx:29.9, ix:3.52 },
  { name:'□100x100x2.3', A:100, B:100, t:2.3, W:6.95, Asec:8.852, Ix:140, Zx:27.9, ix:3.97 },
  { name:'□100x100x3.2', A:100, B:100, t:3.2, W:9.52, Asec:12.13, Ix:187, Zx:37.5, ix:3.93 },
  { name:'□100x100x4.0', A:100, B:100, t:4.0, W:11.7, Asec:14.95, Ix:226, Zx:45.3, ix:3.89 },
  { name:'□100x100x4.5', A:100, B:100, t:4.5, W:13.1, Asec:16.67, Ix:249, Zx:49.9, ix:3.87 },
  { name:'□100x100x6.0', A:100, B:100, t:6.0, W:17.0, Asec:21.63, Ix:311, Zx:62.3, ix:3.79 },
  { name:'□100x100x9.0', A:100, B:100, t:9.0, W:24.1, Asec:30.67, Ix:408, Zx:81.6, ix:3.65 },
  { name:'□100x100x12.0', A:100, B:100, t:12.0, W:30.2, Asec:38.53, Ix:411, Zx:94.3, ix:3.50 }
  ];

  var SQUARE_PIPE_EXTRA_SPECS = [
{ name:'□125x125x3.2',  A:125, B:125, t:3.2,  W:12.0, Asec:15.33, Ix:376,   Iy:376,   Zx:60.1, Zy:60.1, ix:4.95, iy:4.95 },
  { name:'□125x125x4.5',  A:125, B:125, t:4.5,  W:16.6, Asec:21.17, Ix:506,   Iy:506,   Zx:80.9, Zy:80.9, ix:4.89, iy:4.89 },
  { name:'□125x125x5.0',  A:125, B:125, t:5.0,  W:18.3, Asec:23.36, Ix:553,   Iy:553,   Zx:88.4, Zy:88.4, ix:4.86, iy:4.86 },
  { name:'□125x125x6.0',  A:125, B:125, t:6.0,  W:21.7, Asec:27.63, Ix:641,   Iy:641,   Zx:103,  Zy:103,  ix:4.82, iy:4.82 },
  { name:'□125x125x9.0',  A:125, B:125, t:9.0,  W:31.1, Asec:39.67, Ix:865,   Iy:865,   Zx:138,  Zy:138,  ix:4.67, iy:4.67 },
  { name:'□125x125x12.0', A:125, B:125, t:12.0, W:39.7, Asec:50.53, Ix:1030,  Iy:1030,  Zx:165,  Zy:165,  ix:4.52, iy:4.52 },
  { name:'□150x150x4.5',  A:150, B:150, t:4.5,  W:20.1, Asec:25.67, Ix:896,   Iy:896,   Zx:120,  Zy:120,  ix:5.91, iy:5.91 },
  { name:'□150x150x5.0',  A:150, B:150, t:5.0,  W:22.3, Asec:28.36, Ix:982,   Iy:982,   Zx:131,  Zy:131,  ix:5.89, iy:5.89 },
  { name:'□150x150x6.0',  A:150, B:150, t:6.0,  W:26.4, Asec:33.63, Ix:1150,  Iy:1150,  Zx:153,  Zy:153,  ix:5.84, iy:5.84 },
  { name:'□150x150x9.0',  A:150, B:150, t:9.0,  W:38.2, Asec:48.67, Ix:1580,  Iy:1580,  Zx:210,  Zy:210,  ix:5.69, iy:5.69 },
  { name:'□175x175x4.5',  A:175, B:175, t:4.5,  W:23.7, Asec:30.17, Ix:1450,  Iy:1450,  Zx:166,  Zy:166,  ix:6.93, iy:6.93 },
  { name:'□175x175x5.0',  A:175, B:175, t:5.0,  W:26.2, Asec:33.36, Ix:1590,  Iy:1590,  Zx:182,  Zy:182,  ix:6.91, iy:6.91 },
  { name:'□175x175x6.0',  A:175, B:175, t:6.0,  W:31.1, Asec:39.63, Ix:1860,  Iy:1860,  Zx:213,  Zy:213,  ix:6.86, iy:6.86 },
  { name:'□200x200x4.5',  A:200, B:200, t:4.5,  W:27.2, Asec:34.67, Ix:2190,  Iy:2190,  Zx:219,  Zy:219,  ix:7.95, iy:7.95 },
  { name:'□200x200x6.0',  A:200, B:200, t:6.0,  W:35.8, Asec:45.63, Ix:2830,  Iy:2830,  Zx:283,  Zy:283,  ix:7.88, iy:7.88 },
  { name:'□200x200x8.0',  A:200, B:200, t:8.0,  W:46.9, Asec:59.79, Ix:3620,  Iy:3620,  Zx:362,  Zy:362,  ix:7.78, iy:7.78 },
  { name:'□200x200x9.0',  A:200, B:200, t:9.0,  W:52.3, Asec:66.67, Ix:3990,  Iy:3990,  Zx:399,  Zy:399,  ix:7.73, iy:7.73 },
  { name:'□200x200x12.0', A:200, B:200, t:12.0, W:67.9, Asec:86.53, Ix:4980,  Iy:4980,  Zx:498,  Zy:498,  ix:7.59, iy:7.59 },
  { name:'□250x250x5.0',  A:250, B:250, t:5.0,  W:38.0, Asec:48.36, Ix:4810,  Iy:4810,  Zx:384,  Zy:384,  ix:9.97, iy:9.97 },
  { name:'□250x250x6.0',  A:250, B:250, t:6.0,  W:45.2, Asec:57.63, Ix:5670,  Iy:5670,  Zx:454,  Zy:454,  ix:9.92, iy:9.92 },
  { name:'□250x250x8.0',  A:250, B:250, t:8.0,  W:59.5, Asec:75.79, Ix:7320,  Iy:7320,  Zx:585,  Zy:585,  ix:9.82, iy:9.82 },
  { name:'□250x250x9.0',  A:250, B:250, t:9.0,  W:66.5, Asec:84.67, Ix:8090,  Iy:8090,  Zx:647,  Zy:647,  ix:9.78, iy:9.78 },
  { name:'□250x250x12.0', A:250, B:250, t:12.0, W:86.8, Asec:110.5, Ix:10300, Iy:10300, Zx:820,  Zy:820,  ix:9.63, iy:9.63 },
  { name:'□300x300x4.5',  A:300, B:300, t:4.5,  W:41.3, Asec:52.67, Ix:7630,  Iy:7630,  Zx:508,  Zy:508,  ix:12.0, iy:12.0 },
  { name:'□300x300x6.0',  A:300, B:300, t:6.0,  W:54.7, Asec:69.63, Ix:9960,  Iy:9960,  Zx:664,  Zy:664,  ix:12.0, iy:12.0 },
  { name:'□300x300x9.0',  A:300, B:300, t:9.0,  W:80.6, Asec:102.7, Ix:14300, Iy:14300, Zx:956,  Zy:956,  ix:11.8, iy:11.8 },
  { name:'□300x300x12.0', A:300, B:300, t:12.0, W:106,  Asec:134.5, Ix:18300, Iy:18300, Zx:1220, Zy:1220, ix:11.7, iy:11.7 },
  { name:'□350x350x9.0',  A:350, B:350, t:9.0,  W:94.7, Asec:120.7, Ix:23200, Iy:23200, Zx:1320, Zy:1320, ix:13.9, iy:13.9 },
  { name:'□350x350x12.0', A:350, B:350, t:12.0, W:124,  Asec:158.5, Ix:29800, Iy:29800, Zx:1700, Zy:1700, ix:13.7, iy:13.7 }
  ];

  var RECT_PIPE_SPECS = [
{ name:'□50x20x1.6', A:50, B:20, t:1.6, W:1.63, Asec:2.072, Ix:6.08, Iy:1.42, Zx:2.43, Zy:1.42 },
  { name:'□50x20x2.3', A:50, B:20, t:2.3, W:2.25, Asec:2.872, Ix:8.00, Iy:1.83, Zx:3.20, Zy:1.83 },
  { name:'□50x30x1.6', A:50, B:30, t:1.6, W:1.88, Asec:2.392, Ix:7.96, Iy:3.60, Zx:3.18, Zy:2.40 },
  { name:'□50x30x2.3', A:50, B:30, t:2.3, W:2.62, Asec:3.332, Ix:10.6, Iy:4.76, Zx:4.25, Zy:3.17 },
  { name:'□60x30x1.6', A:60, B:30, t:1.6, W:2.13, Asec:2.712, Ix:12.5, Iy:4.25, Zx:4.16, Zy:2.83 },
  { name:'□60x30x2.3', A:60, B:30, t:2.3, W:2.98, Asec:3.792, Ix:16.8, Iy:5.65, Zx:5.61, Zy:3.76 },
  { name:'□60x30x3.2', A:60, B:30, t:3.2, W:3.99, Asec:5.087, Ix:21.4, Iy:7.08, Zx:7.15, Zy:4.72 },
  { name:'□75x45x1.6', A:75, B:45, t:1.6, W:2.88, Asec:3.672, Ix:28.4, Iy:12.9, Zx:7.56, Zy:5.75 },
  { name:'□75x45x2.3', A:75, B:45, t:2.3, W:4.06, Asec:5.172, Ix:38.9, Iy:17.6, Zx:10.4, Zy:7.82 },
  { name:'□75x45x3.2', A:75, B:45, t:3.2, W:5.50, Asec:7.007, Ix:50.8, Iy:22.8, Zx:13.5, Zy:10.1 },
  { name:'□100x50x2.3', A:100, B:50, t:2.3, W:5.10, Asec:6.552, Ix:84.8, Iy:29.0, Zx:17.0, Zy:11.6 },
  { name:'□100x50x3.2', A:100, B:50, t:3.2, W:7.00, Asec:8.927, Ix:112, Iy:38.0, Zx:22.5, Zy:15.2 },
  { name:'□100x50x4.5', A:100, B:50, t:4.5, W:9.60, Asec:12.17, Ix:147, Iy:48.9, Zx:29.3, Zy:19.5 },
  { name:'□125x75x3.2', A:125, B:75, t:3.2, W:9.50, Asec:12.13, Ix:257, Iy:117, Zx:41.1, Zy:31.1 },
  { name:'□125x75x4.5', A:125, B:75, t:4.5, W:13.1, Asec:16.67, Ix:342, Iy:155, Zx:54.8, Zy:41.2 },
  { name:'□125x75x6.0', A:125, B:75, t:6.0, W:17.0, Asec:21.63, Ix:428, Iy:192, Zx:68.5, Zy:51.1 },
  { name:'□150x75x3.2', A:150, B:75, t:3.2, W:10.8, Asec:13.73, Ix:402, Iy:137, Zx:53.6, Zy:36.6 },
  { name:'□150x75x4.5', A:150, B:75, t:4.5, W:15.2, Asec:19.37, Ix:563, Iy:211, Zx:75.0, Zy:52.9 },
  { name:'□150x100x4.5', A:150, B:100, t:4.5, W:16.6, Asec:21.17, Ix:658, Iy:352, Zx:87.7, Zy:70.4 },
  { name:'□150x100x6.0', A:150, B:100, t:6.0, W:21.7, Asec:27.63, Ix:835, Iy:444, Zx:111, Zy:88.8 },
  { name:'□150x100x9.0', A:150, B:100, t:9.0, W:31.1, Asec:39.67, Ix:1130, Iy:595, Zx:151, Zy:119 },
  { name:'□200x100x4.5', A:200, B:100, t:4.5, W:20.1, Asec:25.67, Ix:1330, Iy:455, Zx:133, Zy:90.9 },
  { name:'□200x100x6.0', A:200, B:100, t:6.0, W:26.4, Asec:33.63, Ix:1700, Iy:577, Zx:170, Zy:115 },
  { name:'□200x100x9.0', A:200, B:100, t:9.0, W:38.2, Asec:48.67, Ix:2350, Iy:782, Zx:235, Zy:156 },
  { name:'□200x150x6.0', A:200, B:150, t:6.0, W:35.8, Asec:45.63, Ix:3890, Iy:1770, Zx:311, Zy:236 },
  { name:'□200x150x9.0', A:200, B:150, t:9.0, W:52.3, Asec:66.67, Ix:5480, Iy:2470, Zx:438, Zy:330 },
  { name:'□200x150x12.0', A:200, B:150, t:12.0, W:67.9, Asec:86.53, Ix:6850, Iy:3070, Zx:548, Zy:409 },
  { name:'□300x200x6.0', A:300, B:200, t:6.0, W:45.2, Asec:57.63, Ix:7370, Iy:3960, Zx:491, Zy:396 },
  { name:'□300x200x9.0', A:300, B:200, t:9.0, W:66.5, Asec:84.67, Ix:10500, Iy:5630, Zx:702, Zy:563 },
  { name:'□300x200x12.0', A:300, B:200, t:12.0, W:86.8, Asec:110.5, Ix:13400, Iy:7110, Zx:890, Zy:711 },
  { name:'□350x150x6.0', A:350, B:150, t:6.0, W:45.2, Asec:57.63, Ix:8910, Iy:2390, Zx:509, Zy:319 },
  { name:'□350x150x9.0', A:350, B:150, t:9.0, W:66.5, Asec:84.67, Ix:12700, Iy:3370, Zx:726, Zy:449 },
  { name:'□350x150x12.0', A:350, B:150, t:12.0, W:86.8, Asec:110.5, Ix:16100, Iy:4200, Zx:921, Zy:562 },
  { name:'□400x200x6.0', A:400, B:200, t:6.0, W:54.7, Asec:69.63, Ix:14800, Iy:5090, Zx:739, Zy:509 },
  { name:'□400x200x9.0', A:400, B:200, t:9.0, W:80.6, Asec:102.7, Ix:21300, Iy:7270, Zx:1070, Zy:721 },
  { name:'□400x200x12.0', A:400, B:200, t:12.0, W:106, Asec:134.5, Ix:27300, Iy:9230, Zx:1360, Zy:923 }
  ];

  var SQUARE_PIPE_MARKET_SPECS = [
{ name:'p-50×50×1.6', shape:'square', W:2.38, inCalc:true },
  { name:'p-50×50×2.3', shape:'square', W:3.34, inCalc:true },
  { name:'p-50×50×3.2', shape:'square', W:4.5, inCalc:true },
  { name:'p-50×50×4.5', shape:'square', W:6.02, inCalc:true },
  { name:'p-50×50×6.0', shape:'square', W:7.56, inCalc:true },
  { name:'p-60×60×1.6', shape:'square', W:2.88, inCalc:true },
  { name:'p-60×60×2.3', shape:'square', W:4.06, inCalc:true },
  { name:'p-60×60×3.2', shape:'square', W:5.5, inCalc:true },
  { name:'p-60×60×4.5', shape:'square', W:7.43, inCalc:true },
  { name:'p-60×60×6.0', shape:'square', W:9.45, inCalc:true },
  { name:'p-75×75×2.3', shape:'square', W:5.14, inCalc:true },
  { name:'p-75×75×3.2', shape:'square', W:7.01, inCalc:true },
  { name:'p-75×75×4.5', shape:'square', W:9.55, inCalc:true },
  { name:'p-75×75×6.0', shape:'square', W:12.3, inCalc:true },
  { name:'p-75×75×9.0', shape:'square', W:17, inCalc:true },
  { name:'p-80×80×2.3', shape:'square', W:5.5, inCalc:true },
  { name:'p-80×80×3.2', shape:'square', W:7.51, inCalc:true },
  { name:'p-80×80×4.5', shape:'square', W:10.3, inCalc:true },
  { name:'p-80×80×6.0', shape:'square', W:13.2, inCalc:true },
  { name:'p-90×90×2.3', shape:'square', W:6.23, inCalc:true },
  { name:'p-90×90×3.2', shape:'square', W:8.51, inCalc:true },
  { name:'p-90×90×4.5', shape:'square', W:11.7, inCalc:true },
  { name:'p-90×90×6.0', shape:'square', W:15.1, inCalc:true },
  { name:'p-100×100×1.6', shape:'square', W:4.89, inCalc:true },
  { name:'p-100×100×2.3', shape:'square', W:6.95, inCalc:true },
  { name:'p-100×100×3.2', shape:'square', W:9.52, inCalc:true },
  { name:'p-100×100×4.5', shape:'square', W:13.1, inCalc:true },
  { name:'p-100×100×6.0', shape:'square', W:17, inCalc:true },
  { name:'p-100×100×9.0', shape:'square', W:24.1, inCalc:true },
  { name:'p-100×100×12.0', shape:'square', W:30.2, inCalc:true },
  { name:'p-125×125×2.3', shape:'square', W:8.75, inCalc:true },
  { name:'p-125×125×3.2', shape:'square', W:12, inCalc:true },
  { name:'p-125×125×4.5', shape:'square', W:16.6, inCalc:true },
  { name:'p-125×125×6.0', shape:'square', W:21.7, inCalc:true },
  { name:'p-125×125×9.0', shape:'square', W:31.1, inCalc:true },
  { name:'p-125×125×12.0', shape:'square', W:39.7, inCalc:true },
  { name:'p-150×150×3.2', shape:'square', W:14.5, inCalc:true },
  { name:'p-150×150×4.5', shape:'square', W:20.1, inCalc:true },
  { name:'p-150×150×5.0', shape:'square', W:22.3, inCalc:true },
  { name:'p-150×150×6.0', shape:'square', W:26.4, inCalc:true },
  { name:'p-150×150×9.0', shape:'square', W:38.2, inCalc:true },
  { name:'p-150×150×12.0', shape:'square', W:49.1, inCalc:true },
  { name:'p-175×175×4.5', shape:'square', W:23.7, inCalc:true },
  { name:'p-175×175×6.0', shape:'square', W:31.1, inCalc:true },
  { name:'p-175×175×9.0', shape:'square', W:45.3, inCalc:true },
  { name:'p-175×175×12.0', shape:'square', W:58.5, inCalc:true },
  { name:'p-200×200×4.5', shape:'square', W:27.2, inCalc:true }
  ];

  var RECT_PIPE_MARKET_SPECS = [
{ name:'p-60×30×1.6', shape:'rect', W:2.13, inCalc:true },
  { name:'p-60×30×2.3', shape:'rect', W:2.98, inCalc:true },
  { name:'p-60×30×3.2', shape:'rect', W:3.99, inCalc:true },
  { name:'p-60×30×4.5', shape:'rect', W:5.31, inCalc:true },
  { name:'p-75×45×2.3', shape:'rect', W:4.06, inCalc:true },
  { name:'p-75×45×3.2', shape:'rect', W:5.5, inCalc:true },
  { name:'p-75×45×4.5', shape:'rect', W:7.43, inCalc:true },
  { name:'p-75×50×4.5', shape:'rect', W:7.79, inCalc:true },
  { name:'p-75×50×6.0', shape:'rect', W:9.92, inCalc:true },
  { name:'p-100×50×2.3', shape:'rect', W:5.14, inCalc:true },
  { name:'p-100×50×3.2', shape:'rect', W:7.01, inCalc:true },
  { name:'p-100×50×4.5', shape:'rect', W:9.55, inCalc:true },
  { name:'p-100×50×6.0', shape:'rect', W:12.3, inCalc:true },
  { name:'p-125×75×1.6', shape:'rect', W:4.89, inCalc:true },
  { name:'p-125×75×2.3', shape:'rect', W:6.95, inCalc:true },
  { name:'p-125×75×3.2', shape:'rect', W:9.52, inCalc:true },
  { name:'p-125×75×4.5', shape:'rect', W:13.1, inCalc:true },
  { name:'p-125×75×6.0', shape:'rect', W:17, inCalc:true },
  { name:'p-125×75×9.0', shape:'rect', W:24.1, inCalc:true },
  { name:'p-150×75×3.2', shape:'rect', W:10.8, inCalc:true },
  { name:'p-150×75×4.5', shape:'rect', W:14.9, inCalc:true },
  { name:'p-150×75×6.0', shape:'rect', W:19.3, inCalc:true },
  { name:'p-150×80×4.5', shape:'rect', W:15.2, inCalc:true },
  { name:'p-150×80×6.0', shape:'rect', W:19.8, inCalc:true },
  { name:'p-150×100×2.3', shape:'rect', W:8.75, inCalc:true },
  { name:'p-150×100×3.2', shape:'rect', W:12, inCalc:true },
  { name:'p-150×100×4.5', shape:'rect', W:16.6, inCalc:true },
  { name:'p-150×100×6.0', shape:'rect', W:21.7, inCalc:true },
  { name:'p-150×100×9.0', shape:'rect', W:31.1, inCalc:true },
  { name:'p-150×100×12.0', shape:'rect', W:39.7, inCalc:true },
  { name:'p-200×100×3.2', shape:'rect', W:14.5, inCalc:true },
  { name:'p-200×100×4.5', shape:'rect', W:20.1, inCalc:true },
  { name:'p-200×100×6.0', shape:'rect', W:26.4, inCalc:true },
  { name:'p-200×100×9.0', shape:'rect', W:38.2, inCalc:true },
  { name:'p-200×100×12.0', shape:'rect', W:49.1, inCalc:true }
  ];

  var ECONOMY_PIPE_SPECS = [
{ name:'p-75×75×1.6', shape:'square', W:3.64, inCalc:true },
  { name:'p-50×20×1.6', shape:'rect', W:1.63, inCalc:true },
  { name:'p-50×20×2.3', shape:'rect', W:2.25, inCalc:true },
  { name:'p-50×20×3.2', shape:'rect', W:3.12, inCalc:true },
  { name:'p-75×45×1.6', shape:'rect', W:2.88, inCalc:true },
  { name:'p-100×20×1.6', shape:'rect', W:2.95, inCalc:true },
  { name:'p-100×20×2.3', shape:'rect', W:4.2, inCalc:true },
  { name:'p-100×40×1.6', shape:'rect', W:3.38, inCalc:true },
  { name:'p-100×40×2.3', shape:'rect', W:4.78, inCalc:true },
  { name:'p-100×40×3.2', shape:'rect', W:6.51, inCalc:true },
  { name:'p-100×50×1.6', shape:'rect', W:3.64, inCalc:true },
  { name:'p-125×40×1.6', shape:'rect', W:4.01, inCalc:true },
  { name:'p-125×40×2.3', shape:'rect', W:5.69, inCalc:true },
  { name:'p-125×40×3.2', shape:'rect', W:7.76, inCalc:true },
  { name:'p-150×50×2.3', shape:'rect', W:6.95, inCalc:true },
  { name:'p-150×50×3.2', shape:'rect', W:9.52, inCalc:true }
  ];

  var SQUARE_PIPE_SPECS = []
    .concat(SQUARE_PIPE_BASE_SPECS.map(function(spec) { return Object.assign({ shape: 'square', inCalc: false }, spec); }))
    .concat(SQUARE_PIPE_EXTRA_SPECS.map(function(spec) { return Object.assign({ shape: 'square', inCalc: false }, spec); }))
    .concat(RECT_PIPE_SPECS.map(function(spec) { return Object.assign({ shape: 'rect', inCalc: false }, spec); }))
    .concat(SQUARE_PIPE_MARKET_SPECS)
    .concat(RECT_PIPE_MARKET_SPECS)
    .concat(ECONOMY_PIPE_SPECS);

  ns.data.steel.squarePipe = {
    specs: SQUARE_PIPE_SPECS,
    getAllSpecs: function() { return SQUARE_PIPE_SPECS.slice(); }
  };

  global.SQUARE_PIPE_SPECS = SQUARE_PIPE_SPECS.slice();
})(window);
