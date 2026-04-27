(function(global){
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.data = ns.data || {};
  ns.data.steel = ns.data.steel || {};

  var LIGHT_CHANNEL_SPECS = [
    { name:'[-40×20×1.6', W:0.939 },
    { name:'[-40×20×2.3', W:1.31 },
    { name:'[-40×40×3.2', W:2.75 },
    { name:'[-60×30×1.6', W:1.44 },
    { name:'[-60×30×2.3', W:2.03 },
    { name:'[-80×40×2.3', W:2.75 },
    { name:'[-100×40×2.3', W:3.11 },
    { name:'[-100×40×3.2', W:4.26 },
    { name:'[-100×50×2.3', W:3.47 },
    { name:'[-100×50×3.2', W:4.76 },
    { name:'[-120×40×3.2', W:4.76 },
    { name:'[-150×50×3.2', W:6.02 },
    { name:'[-150×50×4.5', W:8.31 },
    { name:'[-150×75×4.5', W:10.1 },
    { name:'[-150×75×6.0', W:13.2 },
    { name:'[-200×50×3.2', W:7.27 },
    { name:'[-200×50×4.0', W:9.0 },
    { name:'[-200×50×4.5', W:10.1 },
    { name:'[-200×50×6.0', W:13.2 },
    { name:'[-200×75×4.5', W:11.8 },
    { name:'[-200×75×6.0', W:15.6 },
    { name:'[-250×50×4.0', W:10.6 },
    { name:'[-250×50×4.5', W:11.8 },
    { name:'[-250×75×4.5', W:13.6 },
    { name:'[-250×75×6.0', W:17.9 },
    { name:'[-300×50×4.0', W:12.1 },
    { name:'[-300×50×4.5', W:13.6 },
    { name:'[-350×50×4.5', W:15.4 },
    { name:'[-400×75×4.5', W:18.9 },
    { name:'[-400×75×6.0', W:25.0 },
    { name:'[-450×75×4.5', W:20.7 },
    { name:'[-450×75×6.0', W:27.3 }
  ];

  ns.data.steel.lightChannel = { specs: LIGHT_CHANNEL_SPECS, getAllSpecs: function(){ return LIGHT_CHANNEL_SPECS.slice(); } };
  global.LIGHT_CHANNEL_SPECS = LIGHT_CHANNEL_SPECS.slice();
})(window);
