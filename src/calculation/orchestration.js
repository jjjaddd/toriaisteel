/**
 * calc.js  窶・ 蛻・妙譛驕ｩ蛹冶ｨ育ｮ励Ο繧ｸ繝・け
 *
 * 鋼材データ本体は data.js / src/data/steel/* 側で管理する。
 * Web Worker (worker.js) 繧貞虚逧・↓逕滓・縺励※荳ｦ蛻苓ｨ育ｮ励ｒ陦後≧縲・
 * Worker 菴ｿ逕ｨ荳榊庄縺ｮ蝣ｴ蜷医・ doCalc() 縺ｧ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ縲・
 */

var steelDataNs = window.Toriai && window.Toriai.data && window.Toriai.data.steel;
var STD = steelDataNs && Array.isArray(steelDataNs.BASE_STOCK_LENGTHS)
  ? steelDataNs.BASE_STOCK_LENGTHS.slice()
  : [5500,6000,7000,8000,9000,10000,11000,12000];
function getAvailableSTD(kind) {
  var specName = (document.getElementById('spec') || {}).value || '';
  if (steelDataNs && typeof steelDataNs.getAvailableSTD === 'function') {
    return steelDataNs.getAvailableSTD(kind, specName);
  }
  if (typeof getDefaultStockLengths === 'function') {
    return getDefaultStockLengths(kind, specName);
  }
  return STD.slice();
}

function getDynamicStdLengths(kind, spec) {
  if (steelDataNs && typeof steelDataNs.getDynamicStdLengths === 'function') {
    return steelDataNs.getDynamicStdLengths(kind, spec);
  }
  if (typeof getKindSTD === 'function') return getKindSTD(kind, spec);
  return getAvailableSTD(kind);
}

function buildUnlimitedStockPool(kind, spec) {
  if (steelDataNs && typeof steelDataNs.buildUnlimitedStockPool === 'function') {
    return steelDataNs.buildUnlimitedStockPool(kind, spec);
  }
  return getDynamicStdLengths(kind, spec).map(function(sl) {
    return { sl: sl, max: Infinity };
  });
}
var calcYieldNs = window.Toriai && window.Toriai.calculation && window.Toriai.calculation.yield;
var calcUiNs = window.Toriai && window.Toriai.ui && window.Toriai.ui.calc;
var calcInputNs = calcUiNs;
var calcFlowNs = calcUiNs;
var groupBars = calcYieldNs && calcYieldNs.groupBars;
var calcMetrics = calcYieldNs && calcYieldNs.calcMetrics;
var yieldWorkerFactory = calcYieldNs && calcYieldNs.createCalcWorker;
var yieldWorkerRunner = calcYieldNs && calcYieldNs.runWorkerMode;
var resetYieldDpCache = calcYieldNs && calcYieldNs.resetDpCache;
var ROWS = 15; // 蛻晄悄陦梧焚・亥虚逧・ｿｽ蜉蜿ｯ閭ｽ・・

var PIECE_COLORS = ['p0','p1','p2','p3','p4','p5','p6','p7','p8','p9'];

var WORKER_B64 = 'dmFyIFNURD1bNTUwMCw2MDAwLDcwMDAsODAwMCw5MDAwLDEwMDAwLDExMDAwLDEyMDAwXTsKCmZ1bmN0aW9uIHBhY2socGllY2VzLGVmZixibGFkZSl7CiAgdmFyIHJlbWFpbmluZz1waWVjZXMuc2xpY2UoKS5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGItYTt9KTsKICB2YXIgYmFycz1bXTsKICB3aGlsZShyZW1haW5pbmcubGVuZ3RoPjApewogICAgdmFyIGNudDI9e307cmVtYWluaW5nLmZvckVhY2goZnVuY3Rpb24ocCl7Y250MltwXT0oY250MltwXXx8MCkrMTt9KTsKICAgIHZhciBraW5kcz1PYmplY3Qua2V5cyhjbnQyKS5sZW5ndGg7CiAgICB2YXIgYmVzdDsKICAgIGlmKGtpbmRzPD04KXtiZXN0PWRwQmVzdFBhdChyZW1haW5pbmcsZWZmLGJsYWRlKTt9CiAgICBlbHNlewogICAgICB2YXIgc3BhY2U9ZWZmLHBhdD1bXSx1bnVzZWQ9W107CiAgICAgIHJlbWFpbmluZy5mb3JFYWNoKGZ1bmN0aW9uKHApe3ZhciBhZGQ9cCsocGF0Lmxlbmd0aD4wP2JsYWRlOjApO2lmKHNwYWNlLWFkZD49MCl7c3BhY2UtPWFkZDtwYXQucHVzaChwKTt9ZWxzZSB1bnVzZWQucHVzaChwKTt9KTsKICAgICAgYmVzdD17cGF0OnBhdCx1c2VkOnBhdC5yZWR1Y2UoZnVuY3Rpb24ocyxwKXtyZXR1cm4gcytwO30sMCksbG9zczpzcGFjZX07CiAgICB9CiAgICBpZighYmVzdC5wYXQubGVuZ3RoKWJyZWFrOwogICAgYmFycy5wdXNoKHtwYXQ6YmVzdC5wYXQsbG9zczpiZXN0Lmxvc3N9KTsKICAgIHZhciByZW0yPXJlbWFpbmluZy5zbGljZSgpOwogICAgYmVzdC5wYXQuZm9yRWFjaChmdW5jdGlvbihwKXt2YXIgaXg9cmVtMi5pbmRleE9mKHApO2lmKGl4Pj0wKXJlbTIuc3BsaWNlKGl4LDEpO30pOwogICAgcmVtYWluaW5nPXJlbTI7CiAgfQogIHJldHVybiBiYXJzOwp9CgpmdW5jdGlvbiBwYWNrV2l0aFJlbW5hbnRzKHBpZWNlcyxyZW1uYW50cyxzdGRTdG9ja3MsYmxhZGUsZW5kTG9zcyl7CiAgdmFyIHNvcnRlZFJlbW5hbnRzPXJlbW5hbnRzLnNsaWNlKCkuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiBiLWE7fSk7CiAgdmFyIHJlbWFpbmluZz1waWVjZXMuc2xpY2UoKS5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGItYTt9KTsKICB2YXIgYWxsQmFycz1bXTsKICBzb3J0ZWRSZW1uYW50cy5mb3JFYWNoKGZ1bmN0aW9uKHJlbUxlbil7CiAgICBpZighcmVtYWluaW5nLmxlbmd0aClyZXR1cm47CiAgICB2YXIgZWZmPXJlbUxlbi1lbmRMb3NzO2lmKGVmZjw9MClyZXR1cm47CiAgICB2YXIgc3BhY2U9ZWZmLHBhdD1bXSx1bnVzZWQ9W107CiAgICByZW1haW5pbmcuZm9yRWFjaChmdW5jdGlvbihwKXt2YXIgYWRkPXArKHBhdC5sZW5ndGg+MD9ibGFkZTowKTtpZihzcGFjZS1hZGQ+PTApe3NwYWNlLT1hZGQ7cGF0LnB1c2gocCk7fWVsc2UgdW51c2VkLnB1c2gocCk7fSk7CiAgICBpZighcGF0Lmxlbmd0aClyZXR1cm47CiAgICByZW1haW5pbmc9dW51c2VkOwogICAgYWxsQmFycy5wdXNoKHtwYXQ6cGF0LGxvc3M6c3BhY2Usc2w6cmVtTGVufSk7CiAgfSk7CiAgcmV0dXJue3JlbWFpbmluZzpyZW1haW5pbmcscmVtbmFudEJhcnM6YWxsQmFyc307Cn0KCmZ1bmN0aW9uIGdyb3VwQmFycyhiYXJzKXsKICB2YXIgZz1bXTsKICBiYXJzLmZvckVhY2goZnVuY3Rpb24oYil7CiAgICB2YXIga2V5PWIucGF0LmpvaW4oJywnKSsnOicrYi5sb3NzOwogICAgdmFyIGY9Zy5maW5kKGZ1bmN0aW9uKHgpe3JldHVybiB4LmtleT09PWtleTt9KTsKICAgIGlmKGYpZi5jbnQrKztlbHNlIGcucHVzaCh7a2V5OmtleSxwYXQ6Yi5wYXQsbG9zczpiLmxvc3MsY250OjF9KTsKICB9KTsKICByZXR1cm4gZzsKfQoKZnVuY3Rpb24gY2FsY01ldHJpY3MoYmFycyxzbCxlbmRMb3NzLGtnbSxtaW5WYWxpZExlbil7CiAgbWluVmFsaWRMZW49bWluVmFsaWRMZW58fDUwMDsKICB2YXIgc3dpdGNoQ291bnQ9MCx2YWxpZFJlbW5hbnRzPTAsaW52YWxpZFJlbW5hbnRzPTA7CiAgdmFyIHBhdHRlcm5NYXA9e307CiAgdmFyIHByZXZMZW49bnVsbDsKICB2YXIgdG90YWxMb3NzPTAsdG90YWxVc2FibGU9MDsKICBiYXJzLmZvckVhY2goZnVuY3Rpb24oYil7CiAgICB0b3RhbFVzYWJsZSs9KGIuc2x8fHNsKTsKICAgIHRvdGFsTG9zcys9Yi5sb3NzOwogICAgYi5wYXQuZm9yRWFjaChmdW5jdGlvbihsZW4pewogICAgICBpZihwcmV2TGVuIT09bnVsbCYmbGVuIT09cHJldkxlbilzd2l0Y2hDb3VudCsrOwogICAgICBwcmV2TGVuPWxlbjsKICAgIH0pOwogICAgaWYoYi5sb3NzPj1taW5WYWxpZExlbil2YWxpZFJlbW5hbnRzKys7CiAgICBlbHNlIGlmKGIubG9zcz4wKWludmFsaWRSZW1uYW50cysrOwogICAgdmFyIGtleT1iLnBhdC5zbGljZSgpLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYi1hO30pLmpvaW4oJywnKTsKICAgIHBhdHRlcm5NYXBba2V5XT0ocGF0dGVybk1hcFtrZXldfHwwKSsxOwogIH0pOwogIHZhciB0b3RhbEN1dHM9T2JqZWN0LmtleXMocGF0dGVybk1hcCkucmVkdWNlKGZ1bmN0aW9uKGFjYyxrZXkpewogICAgdmFyIHBhdExlbj1rZXk/a2V5LnNwbGl0KCcsJykubGVuZ3RoOjA7cmV0dXJuIGFjYysxK3BhdExlbjsKICB9LDApOwogIHZhciBzYW1lUGF0dGVybkNvdW50PU9iamVjdC5rZXlzKHBhdHRlcm5NYXApLnJlZHVjZShmdW5jdGlvbihteCxrKXtyZXR1cm4gTWF0aC5tYXgobXgscGF0dGVybk1hcFtrXSk7fSwwKTsKICB2YXIgdG90YWxQaWVjZUxlbj0wOwogIGJhcnMuZm9yRWFjaChmdW5jdGlvbihiKXtiLnBhdC5mb3JFYWNoKGZ1bmN0aW9uKHApe3RvdGFsUGllY2VMZW4rPXA7fSk7fSk7CiAgdmFyIHlpZWxkUGN0PXRvdGFsVXNhYmxlPjA/KHRvdGFsUGllY2VMZW4vdG90YWxVc2FibGUpKjEwMDowOwogIHZhciBsb3NzS2c9KHRvdGFsTG9zcy8xMDAwKSprZ207CiAgdmFyIGJhcktnPShzbC8xMDAwKSprZ20qYmFycy5sZW5ndGg7CiAgdmFyIGxvc3NSYXRlPTEwMC15aWVsZFBjdDsKICB2YXIgYmFsYW5jZVNjb3JlPXlpZWxkUGN0KjAuNS10b3RhbEN1dHMqMC4yLWludmFsaWRSZW1uYW50cyowLjItc3dpdGNoQ291bnQqMC4xOwogIHJldHVybnt0b3RhbEN1dHM6dG90YWxDdXRzLHN3aXRjaENvdW50OnN3aXRjaENvdW50LHZhbGlkUmVtbmFudHM6dmFsaWRSZW1uYW50cywKICAgIGludmFsaWRSZW1uYW50czppbnZhbGlkUmVtbmFudHMsc2FtZVBhdHRlcm5Db3VudDpzYW1lUGF0dGVybkNvdW50LAogICAgeWllbGRQY3Q6eWllbGRQY3QsbG9zc1JhdGU6bG9zc1JhdGUsbG9zc0tnOmxvc3NLZyxiYXJLZzpiYXJLZywKICAgIHRvdGFsTG9zczp0b3RhbExvc3MsYmFsYW5jZVNjb3JlOmJhbGFuY2VTY29yZSxiYXJDb3VudDpiYXJzLmxlbmd0aCxwYXR0ZXJuTWFwOnBhdHRlcm5NYXB9Owp9CgpmdW5jdGlvbiBiZXN0U3RvY2tGb3JQYXQocGF0LHN0b2NrcyxibGFkZSxlbmRMb3NzKXsKICB2YXIgbmVlZGVkPXBhdC5yZWR1Y2UoZnVuY3Rpb24ocyxwLGkpe3JldHVybiBzK3ArKGk+MD9ibGFkZTowKTt9LDApOwogIHZhciBzb3J0ZWQ9c3RvY2tzLnNsaWNlKCkuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiBhLnNsLWIuc2w7fSk7CiAgZm9yKHZhciBpPTA7aTxzb3J0ZWQubGVuZ3RoO2krKyl7aWYoc29ydGVkW2ldLnNsLWVuZExvc3M+PW5lZWRlZClyZXR1cm4gc29ydGVkW2ldO30KICByZXR1cm4gbnVsbDsKfQoKLy8gLS0tLSBDU1AgRW5naW5lIC0tLS0KCmZ1bmN0aW9uIGVudW1BbGxQYXR0ZXJucyhzdG9ja3MsaXRlbXMsZGVtQXJyLGJsYWRlLGVuZExvc3MpewogIHZhciBhbGxQYXRzPVtdOwogIHN0b2Nrcy5mb3JFYWNoKGZ1bmN0aW9uKHMpewogICAgdmFyIGVmZj1zLnNsLWVuZExvc3M7aWYoZWZmPD0wKXJldHVybjsKICAgIGZ1bmN0aW9uIGJ0KGlkeCxyZW0sY3VyKXsKICAgICAgaWYoY3VyLmxlbmd0aD4wKXsKICAgICAgICB2YXIgcGllY2U9Y3VyLnJlZHVjZShmdW5jdGlvbihhLHApe3JldHVybiBhK3A7fSwwKTsKICAgICAgICBhbGxQYXRzLnB1c2goe3BhdDpjdXIuc2xpY2UoKSxzbDpzLnNsLGVmZjplZmYsbG9zczpyZW0scGllY2U6cGllY2UseWxkOnBpZWNlL2VmZn0pOwogICAgICB9CiAgICAgIGZvcih2YXIgaT1pZHg7aTxpdGVtcy5sZW5ndGg7aSsrKXsKICAgICAgICB2YXIgdz1pdGVtc1tpXSsoY3VyLmxlbmd0aD4wP2JsYWRlOjApOwogICAgICAgIGlmKHJlbTx3KWNvbnRpbnVlOwogICAgICAgIHZhciB1c2VkPTA7Zm9yKHZhciBrPTA7azxjdXIubGVuZ3RoO2srKylpZihjdXJba109PT1pdGVtc1tpXSl1c2VkKys7CiAgICAgICAgaWYodXNlZD49ZGVtQXJyW2ldKWNvbnRpbnVlOwogICAgICAgIGN1ci5wdXNoKGl0ZW1zW2ldKTtidChpLHJlbS13LGN1cik7Y3VyLnBvcCgpOwogICAgICB9CiAgICB9CiAgICBidCgwLGVmZixbXSk7CiAgfSk7CiAgYWxsUGF0cy5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGIueWxkLWEueWxkO30pOwogIHJldHVybiBhbGxQYXRzOwp9CgpmdW5jdGlvbiBibmJTb2x2ZShkZW1BcnIsaXRlbXMsYWxsUGF0cyx0aW1lTGltaXQpewogIHZhciBiZXN0PXtzb2w6bnVsbCxiYXJzOkluZmluaXR5LHBpZWNlOjB9OwogIHZhciBkZWFkbGluZT1EYXRlLm5vdygpKyh0aW1lTGltaXR8fDIwMDApOwogIGZ1bmN0aW9uIGJuYihyZW0sY2hvc2VuLGJhcnMpewogICAgaWYoRGF0ZS5ub3coKT5kZWFkbGluZSlyZXR1cm47CiAgICBpZighcmVtLnNvbWUoZnVuY3Rpb24ocil7cmV0dXJuIHI+MDt9KSl7CiAgICAgIHZhciBwaWVjZT1jaG9zZW4ucmVkdWNlKGZ1bmN0aW9uKHMsYyl7cmV0dXJuIHMrYy5waWVjZTt9LDApOwogICAgICBpZihiYXJzPGJlc3QuYmFyc3x8KGJhcnM9PT1iZXN0LmJhcnMmJnBpZWNlPmJlc3QucGllY2UpKXsKICAgICAgICBiZXN0LmJhcnM9YmFycztiZXN0LnBpZWNlPXBpZWNlO2Jlc3Quc29sPWNob3Nlbi5zbGljZSgpOwogICAgICB9CiAgICAgIHJldHVybjsKICAgIH0KICAgIGlmKGJhcnM+PWJlc3QuYmFycylyZXR1cm47CiAgICB2YXIgdG90YWxSZW09cmVtLnJlZHVjZShmdW5jdGlvbihzLHIsaSl7cmV0dXJuIHMrcippdGVtc1tpXTt9LDApOwogICAgdmFyIG1heEVmZj1hbGxQYXRzLmxlbmd0aD9hbGxQYXRzW2FsbFBhdHMubGVuZ3RoLTFdLmVmZjoxOwogICAgaWYoYmFycytNYXRoLmNlaWwodG90YWxSZW0vTWF0aC5tYXgobWF4RWZmLDEpKT49YmVzdC5iYXJzKXJldHVybjsKICAgIHZhciB0cmllZD0wOwogICAgZm9yKHZhciBwaT0wO3BpPGFsbFBhdHMubGVuZ3RoJiZ0cmllZDwxMjA7cGkrKyl7CiAgICAgIHZhciBwPWFsbFBhdHNbcGldO3ZhciBvaz10cnVlOwogICAgICBmb3IodmFyIGk9MDtpPGl0ZW1zLmxlbmd0aDtpKyspewogICAgICAgIHZhciBuPTA7Zm9yKHZhciBrPTA7azxwLnBhdC5sZW5ndGg7aysrKWlmKHAucGF0W2tdPT09aXRlbXNbaV0pbisrOwogICAgICAgIGlmKG4+cmVtW2ldKXtvaz1mYWxzZTticmVhazt9CiAgICAgIH0KICAgICAgaWYoIW9rKWNvbnRpbnVlO3RyaWVkKys7CiAgICAgIHZhciBucj1yZW0uc2xpY2UoKTsKICAgICAgZm9yKHZhciBpPTA7aTxpdGVtcy5sZW5ndGg7aSsrKXsKICAgICAgICB2YXIgbj0wO2Zvcih2YXIgaz0wO2s8cC5wYXQubGVuZ3RoO2srKylpZihwLnBhdFtrXT09PWl0ZW1zW2ldKW4rKzsKICAgICAgICBucltpXS09bjsKICAgICAgfQogICAgICBjaG9zZW4ucHVzaChwKTtibmIobnIsY2hvc2VuLGJhcnMrMSk7Y2hvc2VuLnBvcCgpOwogICAgfQogIH0KICBibmIoZGVtQXJyLFtdLDApOwogIHJldHVybiBiZXN0Owp9CgpmdW5jdGlvbiBmaW5kUmVwZWF0UGxhbnMocGllY2VzLHN0b2NrcyxibGFkZSxlbmRMb3NzLGtnbSx5aWVsZFRocmVzaG9sZCl7CiAgdmFyIGNudD17fTsKICBwaWVjZXMuZm9yRWFjaChmdW5jdGlvbihwKXtjbnRbcF09KGNudFtwXXx8MCkrMTt9KTsKICB2YXIgaXRlbXM9T2JqZWN0LmtleXMoY250KS5tYXAoTnVtYmVyKS5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGItYTt9KTsKICB2YXIgZGVtQXJyPWl0ZW1zLm1hcChmdW5jdGlvbihsKXtyZXR1cm4gY250W2xdO30pOwogIGlmKCFpdGVtcy5sZW5ndGgpcmV0dXJuW107CiAgdmFyIGFsbFBhdHM9ZW51bUFsbFBhdHRlcm5zKHN0b2NrcyxpdGVtcyxkZW1BcnIsYmxhZGUsZW5kTG9zcyk7CiAgaWYoIWFsbFBhdHMubGVuZ3RoKXJldHVybltdOwogIGZ1bmN0aW9uIG1heFJlcChwKXsKICAgIHZhciBtcj1JbmZpbml0eTsKICAgIGl0ZW1zLmZvckVhY2goZnVuY3Rpb24obCxpKXsKICAgICAgdmFyIG49MDtmb3IodmFyIGs9MDtrPHAucGF0Lmxlbmd0aDtrKyspaWYocC5wYXRba109PT1sKW4rKzsKICAgICAgaWYobj4wKW1yPU1hdGgubWluKG1yLE1hdGguZmxvb3IoZGVtQXJyW2ldL24pKTsKICAgIH0pOwogICAgcmV0dXJuIGlzRmluaXRlKG1yKT9tcjowOwogIH0KICB2YXIgY2FuZGlkYXRlcz1hbGxQYXRzLm1hcChmdW5jdGlvbihwKXsKICAgIHZhciBtcj1tYXhSZXAocCk7CiAgICByZXR1cm57cGF0OnAsbWF4UmVwOm1yLHNjb3JlOnAueWxkKm1yfTsKICB9KS5maWx0ZXIoZnVuY3Rpb24oYyl7CiAgICByZXR1cm4gYy5tYXhSZXA+PTImJmMucGF0LnlsZD49eWllbGRUaHJlc2hvbGQvMTAwOwogIH0pLnNvcnQoZnVuY3Rpb24oYSxiKXsKICAgIHJldHVybiBiLnNjb3JlLWEuc2NvcmV8fGIubWF4UmVwLWEubWF4UmVwfHxiLnBhdC55bGQtYS5wYXQueWxkOwogIH0pOwogIHZhciByZXN1bHRzPVtdLHNlZW5QYXQ9e30sZGVhZGxpbmU9RGF0ZS5ub3coKSsxNTAwOwogIGNhbmRpZGF0ZXMuc2xpY2UoMCwzMCkuZm9yRWFjaChmdW5jdGlvbihjYW5kKXsKICAgIGlmKERhdGUubm93KCk+ZGVhZGxpbmUpcmV0dXJuOwogICAgdmFyIHA9Y2FuZC5wYXQ7CiAgICB2YXIga2V5PXAuc2wrJ3wnK3AucGF0LmpvaW4oJywnKTsKICAgIGlmKHNlZW5QYXRba2V5XSlyZXR1cm47c2VlblBhdFtrZXldPXRydWU7CiAgICB2YXIgbnI9ZGVtQXJyLnNsaWNlKCksb2s9dHJ1ZTsKICAgIGl0ZW1zLmZvckVhY2goZnVuY3Rpb24obCxpKXsKICAgICAgdmFyIG49MDtmb3IodmFyIGs9MDtrPHAucGF0Lmxlbmd0aDtrKyspaWYocC5wYXRba109PT1sKW4rKzsKICAgICAgbnJbaV0tPW4qY2FuZC5tYXhSZXA7aWYobnJbaV08MClvaz1mYWxzZTsKICAgIH0pOwogICAgaWYoIW9rKXJldHVybjsKICAgIHZhciByZW1CZXN0OwogICAgaWYobnIuc29tZShmdW5jdGlvbihyKXtyZXR1cm4gcj4wO30pKXsKICAgICAgdmFyIHJlbURlbT1pdGVtcy5tYXAoZnVuY3Rpb24obCxpKXtyZXR1cm4gbnJbaV07fSk7CiAgICAgIHZhciByZW1QYXRzPWVudW1BbGxQYXR0ZXJucyhzdG9ja3MsaXRlbXMscmVtRGVtLGJsYWRlLGVuZExvc3MpOwogICAgICByZW1CZXN0PWJuYlNvbHZlKG5yLGl0ZW1zLHJlbVBhdHMsODAwKTsKICAgIH1lbHNle3JlbUJlc3Q9e3NvbDpbXSxiYXJzOjAscGllY2U6MH07fQogICAgaWYoIXJlbUJlc3Quc29sKXJldHVybjsKICAgIHZhciByZXBCYXJzPVtdOwogICAgZm9yKHZhciBpPTA7aTxjYW5kLm1heFJlcDtpKyspcmVwQmFycy5wdXNoKHtwYXQ6cC5wYXQuc2xpY2UoKSxsb3NzOnAubG9zcyxzbDpwLnNsfSk7CiAgICB2YXIgYWxsQmFycz1yZXBCYXJzLmNvbmNhdChyZW1CZXN0LnNvbC5tYXAoZnVuY3Rpb24oYyl7cmV0dXJue3BhdDpjLnBhdC5zbGljZSgpLGxvc3M6Yy5sb3NzLHNsOmMuc2x9O30pKTsKICAgIHZhciB0b3RhbFVzYWJsZT1hbGxCYXJzLnJlZHVjZShmdW5jdGlvbihzLGIpe3JldHVybiBzK2Iuc2w7fSwwKTsKICAgIHZhciB0b3RhbFBpZWNlPWFsbEJhcnMucmVkdWNlKGZ1bmN0aW9uKHMsYil7cmV0dXJuIHMrYi5wYXQucmVkdWNlKGZ1bmN0aW9uKGEseCl7cmV0dXJuIGEreDt9LDApO30sMCk7CiAgICB2YXIgeWxkPXRvdGFsVXNhYmxlPjA/dG90YWxQaWVjZS90b3RhbFVzYWJsZSoxMDA6MDsKICAgIHZhciBtbT1jYWxjTWV0cmljcyhhbGxCYXJzLHAuc2wsZW5kTG9zcyxrZ20pOwogICAgbW0ueWllbGRQY3Q9eWxkO21tLnBhdFlpZWxkUGN0PXAueWxkKjEwMDttbS5sb3NzUmF0ZT0xMDAteWxkOwogICAgbW0uYmFyS2c9YWxsQmFycy5yZWR1Y2UoZnVuY3Rpb24ocyxiKXtyZXR1cm4gcytiLnNsLzEwMDAqa2dtO30sMCk7CiAgICBtbS5sb3NzS2c9YWxsQmFycy5yZWR1Y2UoZnVuY3Rpb24ocyxiKXtyZXR1cm4gcytiLmxvc3M7fSwwKS8xMDAwKmtnbTsKICAgIG1tLmJhckNvdW50PWFsbEJhcnMubGVuZ3RoO21tLnJlcGVhdENvdW50PWNhbmQubWF4UmVwOwogICAgcmVzdWx0cy5wdXNoKHtzbDpwLnNsLGJhcnM6YWxsQmFycyxyZXBlYXQ6Y2FuZC5tYXhSZXAseWxkOnlsZCxwYXRZbGQ6cC55bGQqMTAwLG1ldHJpY3M6bW0scGF0OnAucGF0fSk7CiAgfSk7CiAgcmVzdWx0cy5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGIucmVwZWF0LWEucmVwZWF0fHxiLnBhdFlsZC1hLnBhdFlsZDt9KTsKICB2YXIgc2VlbjI9e307CiAgcmV0dXJuIHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uKHIpewogICAgdmFyIGs9ci5zbCsnfCcrci5wYXQuam9pbignLCcpOwogICAgaWYoc2VlbjJba10pcmV0dXJuIGZhbHNlO3NlZW4yW2tdPXRydWU7cmV0dXJuIHRydWU7CiAgfSk7Cn0KCmZ1bmN0aW9uIGNhbGNQYXR0ZXJuQShwaWVjZXMsc3RvY2tzLGJsYWRlLGVuZExvc3Msa2dtKXsKICB2YXIgcmVzdWx0cz1maW5kUmVwZWF0UGxhbnMocGllY2VzLHN0b2NrcyxibGFkZSxlbmRMb3NzLGtnbSw5MCk7CiAgaWYoIXJlc3VsdHMubGVuZ3RoKXJldHVybiBudWxsOwogIHZhciBiZXN0PXJlc3VsdHNbMF07CiAgcmV0dXJue2xhYmVsOidBJyxuYW1lOidQYXR0ZXJuIEEnLGJhcnM6YmVzdC5iYXJzLHNsOmJlc3Quc2wsbWV0cmljczpiZXN0Lm1ldHJpY3N9Owp9CgpmdW5jdGlvbiBjYWxjUGF0dGVybkIocGllY2VzLHN0b2NrcyxibGFkZSxlbmRMb3NzLGtnbSl7CiAgdmFyIHJlczkwPWZpbmRSZXBlYXRQbGFucyhwaWVjZXMsc3RvY2tzLGJsYWRlLGVuZExvc3Msa2dtLDkwKTsKICB2YXIgcmVwZWF0QT1yZXM5MC5sZW5ndGg/cmVzOTBbMF0ucmVwZWF0OjA7CiAgdmFyIHJlczgwPWZpbmRSZXBlYXRQbGFucyhwaWVjZXMsc3RvY2tzLGJsYWRlLGVuZExvc3Msa2dtLDgwKTsKICBpZighcmVzODAubGVuZ3RoKXJldHVybiBudWxsOwogIHZhciBiZXR0ZXI9cmVzODAuZmlsdGVyKGZ1bmN0aW9uKHIpe3JldHVybiByLnJlcGVhdD5yZXBlYXRBO30pOwogIGlmKCFiZXR0ZXIubGVuZ3RoKXJldHVybiBudWxsOwogIHZhciBwbGFuODA9YmV0dGVyWzBdOwogIHJldHVybntsYWJlbDonQicsbmFtZTonUGF0dGVybiBCJyxwbGFuOTA6bnVsbCwKICAgIHBsYW44MDp7YmFyczpwbGFuODAuYmFycyxzbDpwbGFuODAuc2wsbWV0cmljczpwbGFuODAubWV0cmljc319Owp9CgpmdW5jdGlvbiBjYWxjUGF0dGVybkMocGllY2VzLHN0b2NrcyxibGFkZSxlbmRMb3NzLGtnbSl7cmV0dXJuIG51bGw7fQoKdmFyIF9kcENhY2hlPXt9OwpmdW5jdGlvbiBkcEJlc3RQYXQocGllY2VzLGNhcGFjaXR5LGJsYWRlKXsKICB2YXIgY250PXt9O3BpZWNlcy5mb3JFYWNoKGZ1bmN0aW9uKHApe2NudFtwXT0oY250W3BdfHwwKSsxO30pOwogIHZhciBsZW5zPU9iamVjdC5rZXlzKGNudCkubWFwKE51bWJlcikuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiBiLWE7fSk7CiAgaWYoIWxlbnMubGVuZ3RoKXJldHVybntwYXQ6W10sdXNlZDowLGxvc3M6Y2FwYWNpdHl9OwogIHZhciBrZXk9Y2FwYWNpdHkrJ3wnK2xlbnMubWFwKGZ1bmN0aW9uKGwpe3JldHVybiBsKyc6JytjbnRbbF07fSkuam9pbignLCcpOwogIGlmKF9kcENhY2hlW2tleV0pcmV0dXJuIF9kcENhY2hlW2tleV07CiAgdmFyIGNhcD1jYXBhY2l0eStibGFkZSxkcD1uZXcgQXJyYXkoY2FwKzEpLmZpbGwobnVsbCk7CiAgZHBbMF09e3VzZWQ6MCxwcmV2Oi0xLGl0ZW06MH07CiAgbGVucy5mb3JFYWNoKGZ1bmN0aW9uKGxlbil7CiAgICB2YXIgbWF4VGFrZT1jbnRbbGVuXSx3PWxlbitibGFkZTsKICAgIGZvcih2YXIgaz0wO2s8bWF4VGFrZTtrKyspCiAgICAgIGZvcih2YXIgYz1jYXA7Yz49dztjLS0pe3ZhciBwdj1kcFtjLXddO2lmKCFwdiljb250aW51ZTt2YXIgbnU9cHYudXNlZCtsZW47aWYoIWRwW2NdfHxudT5kcFtjXS51c2VkKWRwW2NdPXt1c2VkOm51LHByZXY6Yy13LGl0ZW06bGVufTt9CiAgfSk7CiAgdmFyIGJlc3Q9e3BhdDpbXSx1c2VkOjAsbG9zczpjYXBhY2l0eX07CiAgZm9yKHZhciBjMj1jYXA7YzI+PTA7YzItLSl7CiAgICBpZighZHBbYzJdfHxkcFtjMl0udXNlZD09PTApY29udGludWU7CiAgICB2YXIgaXRlbXMyPVtdLGN1cj1jMjsKICAgIHdoaWxlKGN1cj4wJiZkcFtjdXJdJiZkcFtjdXJdLnByZXY+PTApe2l0ZW1zMi5wdXNoKGRwW2N1cl0uaXRlbSk7Y3VyPWRwW2N1cl0ucHJldjt9CiAgICBpZighaXRlbXMyLmxlbmd0aCljb250aW51ZTsKICAgIHZhciBhdT1pdGVtczIucmVkdWNlKGZ1bmN0aW9uKHMscCl7cmV0dXJuIHMrcDt9LDApLGFzMj1hdSsoaXRlbXMyLmxlbmd0aC0xKSpibGFkZTsKICAgIGlmKGFzMjw9Y2FwYWNpdHkmJmF1PmJlc3QudXNlZCl7YmVzdD17cGF0Oml0ZW1zMi5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGItYTt9KSx1c2VkOmF1LGxvc3M6Y2FwYWNpdHktYXMyfTticmVhazt9CiAgfQogIF9kcENhY2hlW2tleV09YmVzdDtyZXR1cm4gYmVzdDsKfQoKZnVuY3Rpb24gcGFja0RQKHBpZWNlc0luLGVmZixibGFkZSl7CiAgdmFyIHJlbWFpbmluZz1waWVjZXNJbi5zbGljZSgpLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYi1hO30pOwogIHZhciBiYXJzPVtdOwogIHdoaWxlKHJlbWFpbmluZy5sZW5ndGg+MCl7CiAgICB2YXIgY250Mj17fTtyZW1haW5pbmcuZm9yRWFjaChmdW5jdGlvbihwKXtjbnQyW3BdPShjbnQyW3BdfHwwKSsxO30pOwogICAgdmFyIGJlc3Q7CiAgICBpZihPYmplY3Qua2V5cyhjbnQyKS5sZW5ndGg8PTgpe2Jlc3Q9ZHBCZXN0UGF0KHJlbWFpbmluZyxlZmYsYmxhZGUpO30KICAgIGVsc2V7CiAgICAgIHZhciBzcGFjZT1lZmYscGF0PVtdLHVudXNlZD1bXTsKICAgICAgcmVtYWluaW5nLmZvckVhY2goZnVuY3Rpb24ocCl7dmFyIGFkZD1wKyhwYXQubGVuZ3RoPjA/YmxhZGU6MCk7aWYoc3BhY2UtYWRkPj0wKXtzcGFjZS09YWRkO3BhdC5wdXNoKHApO31lbHNlIHVudXNlZC5wdXNoKHApO30pOwogICAgICBiZXN0PXtwYXQ6cGF0LHVzZWQ6cGF0LnJlZHVjZShmdW5jdGlvbihzLHApe3JldHVybiBzK3A7fSwwKSxsb3NzOnNwYWNlfTsKICAgIH0KICAgIGlmKCFiZXN0LnBhdC5sZW5ndGgpYnJlYWs7CiAgICBiYXJzLnB1c2goe3BhdDpiZXN0LnBhdCxsb3NzOmJlc3QubG9zc30pOwogICAgdmFyIHJlbTI9cmVtYWluaW5nLnNsaWNlKCk7CiAgICBiZXN0LnBhdC5mb3JFYWNoKGZ1bmN0aW9uKHApe3ZhciBpeD1yZW0yLmluZGV4T2YocCk7aWYoaXg+PTApcmVtMi5zcGxpY2UoaXgsMSk7fSk7CiAgICByZW1haW5pbmc9cmVtMjsKICB9CiAgcmV0dXJuIGJhcnM7Cn0KCmZ1bmN0aW9uIGNhbGNCdW5kbGVQbGFuKHBpZWNlcyxzdG9ja3MsYmxhZGUsZW5kTG9zcyxrZ20pewogIHZhciBzb3J0ZWQ9cGllY2VzLnNsaWNlKCkuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiBiLWE7fSk7CiAgdmFyIG5lZWRlZD1zb3J0ZWQucmVkdWNlKGZ1bmN0aW9uKHMscCxpKXtyZXR1cm4gcytwKyhpPjA/YmxhZGU6MCk7fSwwKTsKICB2YXIgYmVzdD1udWxsOwogIHN0b2Nrcy5mb3JFYWNoKGZ1bmN0aW9uKHMpewogICAgdmFyIGVmZj1zLnNsLWVuZExvc3M7aWYoZWZmPG5lZWRlZClyZXR1cm47CiAgICB2YXIgbG9zcz1lZmYtbmVlZGVkOwogICAgaWYoIWJlc3R8fHMuc2w8YmVzdC5zbCliZXN0PXtzbDpzLnNsLHBhdDpzb3J0ZWQuc2xpY2UoKSxsb3NzOmxvc3MsbG9zc1BlckJhcjpsb3NzLAogICAgICBjdXRDb3VudDoxK3NvcnRlZC5sZW5ndGgsbG9zc1JhdGU6cy5zbD4wPyhsb3NzL2VmZikqMTAwOjEwMCwKICAgICAgYmFyS2c6KHMuc2wvMTAwMCkqa2dtLGxvc3NLZzoobG9zcy8xMDAwKSprZ219OwogIH0pOwogIHJldHVybiBiZXN0Owp9CgpmdW5jdGlvbiBjYWxjQ2hhcmdlTWluKHBpZWNlcyxzdG9ja3MsYmxhZGUsZW5kTG9zcyxrZ20pewogIHZhciBjbnQ9e307cGllY2VzLmZvckVhY2goZnVuY3Rpb24ocCl7Y250W3BdPShjbnRbcF18fDApKzE7fSk7CiAgdmFyIHBsYW5zPVtdOwogIHN0b2Nrcy5mb3JFYWNoKGZ1bmN0aW9uKHMpewogICAgdmFyIGVmZj1zLnNsLWVuZExvc3M7aWYoZWZmPD0wKXJldHVybjsKICAgIGZvcih2YXIgTj0xO048PXBpZWNlcy5sZW5ndGg7TisrKXsKICAgICAgdmFyIHBlckJhcj17fTsKICAgICAgT2JqZWN0LmtleXMoY250KS5mb3JFYWNoKGZ1bmN0aW9uKGxlbil7cGVyQmFyW2xlbl09TWF0aC5jZWlsKGNudFtsZW5dL04pO30pOwogICAgICB2YXIgZmxhdFBhdD1bXTsKICAgICAgT2JqZWN0LmtleXMocGVyQmFyKS5tYXAoTnVtYmVyKS5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGItYTt9KS5mb3JFYWNoKGZ1bmN0aW9uKGxlbil7CiAgICAgICAgZm9yKHZhciBrPTA7azxwZXJCYXJbbGVuXTtrKyspZmxhdFBhdC5wdXNoKGxlbik7CiAgICAgIH0pOwogICAgICB2YXIgdXNlZD1mbGF0UGF0LnJlZHVjZShmdW5jdGlvbihzLHAsaSl7cmV0dXJuIHMrcCsoaT4wP2JsYWRlOjApO30sMCk7CiAgICAgIGlmKHVzZWQ+ZWZmKWNvbnRpbnVlOwogICAgICB2YXIgYWN0dWFsTj0wOwogICAgICBPYmplY3Qua2V5cyhjbnQpLmZvckVhY2goZnVuY3Rpb24obGVuKXthY3R1YWxOPU1hdGgubWF4KGFjdHVhbE4sTWF0aC5jZWlsKGNudFtsZW5dL3BlckJhcltsZW5dKSk7fSk7CiAgICAgIHZhciBsb3NzUGVyQmFyPWVmZi11c2VkLGV4dHJhTG9zcz0wOwogICAgICBPYmplY3Qua2V5cyhjbnQpLmZvckVhY2goZnVuY3Rpb24obGVuKXsKICAgICAgICB2YXIgZXhjZXNzPXBlckJhcltsZW5dKmFjdHVhbE4tY250W2xlbl07aWYoZXhjZXNzPjApZXh0cmFMb3NzKz1leGNlc3MqTnVtYmVyKGxlbik7CiAgICAgIH0pOwogICAgICB2YXIgdG90YWxMb3NzPWxvc3NQZXJCYXIqYWN0dWFsTitleHRyYUxvc3M7CiAgICAgIHZhciB0b3RhbFVzYWJsZT1zLnNsKmFjdHVhbE47CiAgICAgIHBsYW5zLnB1c2goe3NsOnMuc2wsTjphY3R1YWxOLGZsYXRQYXQ6ZmxhdFBhdCx1c2VkOnVzZWQsbG9zc1BlckJhcjpsb3NzUGVyQmFyLAogICAgICAgIHRvdGFsTG9zczp0b3RhbExvc3MsY2hhcmdlQ291bnQ6MStmbGF0UGF0Lmxlbmd0aCwKICAgICAgICBsb3NzS2c6KHRvdGFsTG9zcy8xMDAwKSprZ20sYmFyS2c6KHMuc2wvMTAwMCkqa2dtKmFjdHVhbE4sCiAgICAgICAgbG9zc1JhdGU6dG90YWxVc2FibGU+MD8odG90YWxMb3NzL3RvdGFsVXNhYmxlKSoxMDA6MH0pOwogICAgICBicmVhazsKICAgIH0KICB9KTsKICBwbGFucy5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGEuY2hhcmdlQ291bnQtYi5jaGFyZ2VDb3VudHx8YS50b3RhbExvc3MtYi50b3RhbExvc3M7fSk7CiAgdmFyIHNlZW49e30sdG9wPVtdOwogIHBsYW5zLmZvckVhY2goZnVuY3Rpb24ocCl7dmFyIGs9cC5zbCsneCcrcC5OO2lmKCFzZWVuW2tdKXtzZWVuW2tdPXRydWU7dG9wLnB1c2gocCk7fX0pOwogIHJldHVybiB0b3Auc2xpY2UoMCw0KTsKfQoKZnVuY3Rpb24gY2FsY0NvcmUoYmxhZGUsZW5kTG9zcyxrZ20sc3RvY2tzLHBpZWNlcyxyZW1uYW50cyxtaW5WYWxpZExlbil7CiAgcGllY2VzPXBpZWNlcy5zbGljZSgpLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYi1hO30pOwogIHZhciBycj17cmVtYWluaW5nOnBpZWNlcyxyZW1uYW50QmFyczpbXX07CiAgaWYocmVtbmFudHMubGVuZ3RoPjApcnI9cGFja1dpdGhSZW1uYW50cyhwaWVjZXMscmVtbmFudHMsc3RvY2tzLGJsYWRlLGVuZExvc3MpOwogIHZhciBjcD1yci5yZW1haW5pbmc7CiAgdmFyIGNzPShyZW1uYW50cy5sZW5ndGg+MCYmY3AubGVuZ3RoPjApP1NURC5tYXAoZnVuY3Rpb24oc2wpe3JldHVybntzbDpzbCxtYXg6SW5maW5pdHl9O30pOnN0b2NrczsKICBpZihjcC5sZW5ndGg9PT0wKXJldHVybntzaW5nbGU6W10sY2hnUGxhbnM6W10sYWxsRFA6W10scmVtbmFudEJhcnM6cnIucmVtbmFudEJhcnMsYnVuZGxlUGxhbjpudWxsLHBhdEE6bnVsbCxwYXRCOm51bGwscGF0QzpudWxsLHlpZWxkQ2FyZDE6bnVsbCxjYWxjUGllY2VzOltdLG9yaWdQaWVjZXM6cGllY2VzfTsKICB2YXIgc2luZ2xlPVtdOwogIGNzLmZvckVhY2goZnVuY3Rpb24ocyl7CiAgICB2YXIgZWZmPXMuc2wtZW5kTG9zcztpZihlZmY8PTApcmV0dXJuOwogICAgdmFyIGJhcnM9cGFjayhjcCxlZmYsYmxhZGUpO2lmKGJhcnMubGVuZ3RoPnMubWF4KXJldHVybjsKICAgIGJhcnMuZm9yRWFjaChmdW5jdGlvbihiKXtiLnNsPXMuc2w7fSk7CiAgICB2YXIgbG9zcz1iYXJzLnJlZHVjZShmdW5jdGlvbihhLGIpe3JldHVybiBhK2IubG9zczt9LDApOwogICAgdmFyIHVzYWJsZT1zLnNsKmJhcnMubGVuZ3RoOwogICAgdmFyIHBsPWJhcnMucmVkdWNlKGZ1bmN0aW9uKGEsYil7cmV0dXJuIGErYi5wYXQucmVkdWNlKGZ1bmN0aW9uKHMscCl7cmV0dXJuIHMrcDt9LDApO30sMCk7CiAgICB2YXIgZ209e307YmFycy5mb3JFYWNoKGZ1bmN0aW9uKGIpe3ZhciBrPWIucGF0LmpvaW4oJywnKTtpZighZ21ba10pZ21ba109Yi5wYXQ7fSk7CiAgICB2YXIgY2hnPU9iamVjdC52YWx1ZXMoZ20pLnJlZHVjZShmdW5jdGlvbihhLHApe3JldHVybiBhKzErcC5sZW5ndGg7fSwwKTsKICAgIHNpbmdsZS5wdXNoKHtzbDpzLnNsLGJhcnM6YmFycyxsb3NzOmxvc3MsbWF4OnMubWF4LHlsZDp1c2FibGU+MD8oMS1sb3NzL3VzYWJsZSkqMTAwOjAsbG9zc1JhdGU6dXNhYmxlPjA/KDEtcGwvdXNhYmxlKSoxMDA6MTAwLGJhcktnOihzLnNsLzEwMDApKmtnbSpiYXJzLmxlbmd0aCxsb3NzS2c6KGxvc3MvMTAwMCkqa2dtLGNoZzpjaGd9KTsKICB9KTsKICBzaW5nbGUuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiBhLmxvc3NSYXRlLWIubG9zc1JhdGU7fSk7CiAgdmFyIGNoZ1BsYW5zPWNhbGNDaGFyZ2VNaW4oY3AsY3MsYmxhZGUsZW5kTG9zcyxrZ20pOwogIF9kcENhY2hlPXt9OwogIHZhciBkcHM9W107CiAgY3MuZm9yRWFjaChmdW5jdGlvbihzKXsKICAgIHZhciBlZmY9cy5zbC1lbmRMb3NzO2lmKGVmZjw9MClyZXR1cm47CiAgICB2YXIgYmFycz1wYWNrRFAoY3Auc2xpY2UoKSxlZmYsYmxhZGUpO2lmKGJhcnMubGVuZ3RoPnMubWF4KXJldHVybjsKICAgIGJhcnMuZm9yRWFjaChmdW5jdGlvbihiKXtiLnNsPXMuc2w7fSk7CiAgICB2YXIgbG9zcz1iYXJzLnJlZHVjZShmdW5jdGlvbihhLGIpe3JldHVybiBhK2IubG9zczt9LDApOwogICAgdmFyIHRsPXMuc2wqYmFycy5sZW5ndGg7CiAgICB2YXIgcGw9YmFycy5yZWR1Y2UoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYStiLnBhdC5yZWR1Y2UoZnVuY3Rpb24ocyxwKXtyZXR1cm4gcytwO30sMCk7fSwwKTsKICAgIGRwcy5wdXNoKHtzbDpzLnNsLGJhcnM6YmFycyxsb3NzOmxvc3MsbG9zc1JhdGU6dGw+MD8oMS1wbC90bCkqMTAwOjEwMCxiYXJLZzoocy5zbC8xMDAwKSprZ20qYmFycy5sZW5ndGgsbG9zc0tnOihsb3NzLzEwMDApKmtnbX0pOwogIH0pOwogIGRwcy5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGEubG9zc1JhdGUtYi5sb3NzUmF0ZTt9KTsKICB2YXIgYWxsRFA9W107CiAgZHBzLmZvckVhY2goZnVuY3Rpb24ocil7CiAgICB2YXIgZ209e307ci5iYXJzLmZvckVhY2goZnVuY3Rpb24oYil7dmFyIGs9Yi5wYXQuam9pbignLCcpO2lmKCFnbVtrXSlnbVtrXT1iLnBhdDt9KTsKICAgIHZhciBjaGc9T2JqZWN0LnZhbHVlcyhnbSkucmVkdWNlKGZ1bmN0aW9uKGEscCl7cmV0dXJuIGErMStwLmxlbmd0aDt9LDApOwogICAgYWxsRFAucHVzaCh7ZGVzYzpyLnNsLnRvTG9jYWxlU3RyaW5nKCkrJ21tIHggJytyLmJhcnMubGVuZ3RoLGxvc3NSYXRlOnIubG9zc1JhdGUsbG9zc0tnOnIubG9zc0tnLGJhcktnOnIuYmFyS2csYmFyczpyLmJhcnMsc2xBOnIuc2wsc2xCOm51bGwsYkE6ci5iYXJzLGJCOltdLGNoZzpjaGcsdHlwZTonc2luZ2xlJ30pOwogIH0pOwogIGFsbERQLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYS5sb3NzUmF0ZS1iLmxvc3NSYXRlO30pOwogIHZhciBicD1jYWxjQnVuZGxlUGxhbihjcCxjcyxibGFkZSxlbmRMb3NzLGtnbSk7CiAgdmFyIGhlYXZ5PWNwLmxlbmd0aD4zMDsKICB2YXIgcGF0QT1jYWxjUGF0dGVybkEoY3AsY3MsYmxhZGUsZW5kTG9zcyxrZ20pOwogIHZhciBwYXRCPWhlYXZ5P251bGw6Y2FsY1BhdHRlcm5CKGNwLGNzLGJsYWRlLGVuZExvc3Msa2dtKTsKICB2YXIgcGF0Qz1udWxsOwogIHZhciByYj1yci5yZW1uYW50QmFyczsKICBpZihyYiYmcmIubGVuZ3RoKXsKICAgIGZ1bmN0aW9uIG1yKHBhdCl7aWYoIXBhdHx8IXBhdC5iYXJzKXJldHVybiBwYXQ7dmFyIG1nPXJiLmNvbmNhdChwYXQuYmFycyk7dmFyIHNsPXBhdC5zbHx8KG1nWzBdJiZtZ1swXS5zbCl8fGNzWzBdLnNsO3ZhciBtMj1jYWxjTWV0cmljcyhtZyxzbCxlbmRMb3NzLGtnbSxtaW5WYWxpZExlbik7cmV0dXJuIE9iamVjdC5hc3NpZ24oe30scGF0LHtiYXJzOm1nLG1ldHJpY3M6bTJ9KTt9CiAgICBpZihwYXRBKXBhdEE9bXIocGF0QSk7CiAgICBpZihwYXRCKXtpZihwYXRCLnBsYW45MClwYXRCLnBsYW45MD1tcihwYXRCLnBsYW45MCk7aWYocGF0Qi5wbGFuODApcGF0Qi5wbGFuODA9bXIocGF0Qi5wbGFuODApO30KICB9CiAgcmV0dXJue3NpbmdsZTpzaW5nbGUsY2hnUGxhbnM6Y2hnUGxhbnMsYWxsRFA6YWxsRFAscmVtbmFudEJhcnM6cnIucmVtbmFudEJhcnMsYnVuZGxlUGxhbjpicCxwYXRBOnBhdEEscGF0QjpwYXRCLHBhdEM6cGF0Qyx5aWVsZENhcmQxOmFsbERQLmxlbmd0aD9hbGxEUFswXTpudWxsLGNhbGNQaWVjZXM6Y3Asb3JpZ1BpZWNlczpwaWVjZXN9Owp9CgpmdW5jdGlvbiBjYWxjWWllbGQoYmxhZGUsZW5kTG9zcyxrZ20sc3RvY2tzLHBpZWNlcyxyZW1uYW50cyxtaW5WYWxpZExlbil7CiAgcGllY2VzPXBpZWNlcy5zbGljZSgpLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYi1hO30pOwogIHZhciBycj17cmVtYWluaW5nOnBpZWNlcyxyZW1uYW50QmFyczpbXX07CiAgaWYocmVtbmFudHMubGVuZ3RoPjApcnI9cGFja1dpdGhSZW1uYW50cyhwaWVjZXMscmVtbmFudHMsc3RvY2tzLGJsYWRlLGVuZExvc3MpOwogIHZhciBjcD1yci5yZW1haW5pbmc7CiAgdmFyIGNzPShyZW1uYW50cy5sZW5ndGg+MCYmY3AubGVuZ3RoPjApP1NURC5tYXAoZnVuY3Rpb24oc2wpe3JldHVybntzbDpzbCxtYXg6SW5maW5pdHl9O30pOnN0b2NrczsKICBpZighY3AubGVuZ3RoKXJldHVybntzaW5nbGU6W10sY2hnUGxhbnM6W10sYWxsRFA6W10scmVtbmFudEJhcnM6cnIucmVtbmFudEJhcnMsYnVuZGxlUGxhbjpudWxsLHlpZWxkQ2FyZDE6bnVsbCxjYWxjUGllY2VzOltdLG9yaWdQaWVjZXM6cGllY2VzfTsKICB2YXIgY250PXt9O2NwLmZvckVhY2goZnVuY3Rpb24ocCl7Y250W3BdPShjbnRbcF18fDApKzE7fSk7CiAgdmFyIGJuYkl0ZW1zPU9iamVjdC5rZXlzKGNudCkubWFwKE51bWJlcikuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiBiLWE7fSk7CiAgdmFyIGJuYkRlbT1ibmJJdGVtcy5tYXAoZnVuY3Rpb24obCl7cmV0dXJuIGNudFtsXTt9KTsKICB2YXIgYm5iUGF0cz1lbnVtQWxsUGF0dGVybnMoY3MsYm5iSXRlbXMsYm5iRGVtLGJsYWRlLGVuZExvc3MpOwogIHZhciBiZXN0PWJuYlNvbHZlKGJuYkRlbSxibmJJdGVtcyxibmJQYXRzLDMwMDApOwogIHZhciBhbGxEUD1bXTsKICBpZihiZXN0LnNvbCl7CiAgICB2YXIgYmFycz1iZXN0LnNvbC5tYXAoZnVuY3Rpb24oYyl7cmV0dXJue3BhdDpjLnBhdC5zbGljZSgpLGxvc3M6Yy5sb3NzLHNsOmMuc2x9O30pOwogICAgaWYocnIucmVtbmFudEJhcnMmJnJyLnJlbW5hbnRCYXJzLmxlbmd0aCliYXJzPXJyLnJlbW5hbnRCYXJzLmNvbmNhdChiYXJzKTsKICAgIHZhciBzbENudD17fTtiYXJzLmZvckVhY2goZnVuY3Rpb24oYil7c2xDbnRbYi5zbF09KHNsQ250W2Iuc2xdfHwwKSsxO30pOwogICAgdmFyIGRlc2M9T2JqZWN0LmtleXMoc2xDbnQpLm1hcChOdW1iZXIpLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYi1hO30pLm1hcChmdW5jdGlvbihzbCl7cmV0dXJuIHNsLnRvTG9jYWxlU3RyaW5nKCkrJ21tIHggJytzbENudFtzbF07fSkuam9pbignICsgJyk7CiAgICB2YXIgdHU9YmFycy5yZWR1Y2UoZnVuY3Rpb24ocyxiKXtyZXR1cm4gcytiLnNsO30sMCk7CiAgICB2YXIgdHA9YmFycy5yZWR1Y2UoZnVuY3Rpb24ocyxiKXtyZXR1cm4gcytiLnBhdC5yZWR1Y2UoZnVuY3Rpb24oYSxwKXtyZXR1cm4gYStwO30sMCk7fSwwKTsKICAgIHZhciBscj10dT4wPygxLXRwL3R1KSoxMDA6MTAwOwogICAgdmFyIHRjPWJhcnMucmVkdWNlKGZ1bmN0aW9uKHMsYil7cmV0dXJuIHMrKGIucGF0P2IucGF0Lmxlbmd0aC0xOjApO30sMCk7YWxsRFAucHVzaCh7ZGVzYzpkZXNjLGxvc3NSYXRlOmxyLGxvc3NLZzpiYXJzLnJlZHVjZShmdW5jdGlvbihzLGIpe3JldHVybiBzK2IubG9zczt9LDApLzEwMDAqa2dtLGJhcktnOnR1LzEwMDAqa2dtLGJhcnM6YmFycyxzbEE6YmFyc1swXT9iYXJzWzBdLnNsOmNzWzBdLnNsLHNsQjpudWxsLGJBOmJhcnMsYkI6W10sY2hnOnRjLHR5cGU6J2JuYid9KTsKICB9CiAgX2RwQ2FjaGU9e307CiAgY3MuZm9yRWFjaChmdW5jdGlvbihzKXsKICAgIHZhciBlZmY9cy5zbC1lbmRMb3NzO2lmKGVmZjw9MClyZXR1cm47CiAgICB2YXIgYmFycz1wYWNrRFAoY3Auc2xpY2UoKSxlZmYsYmxhZGUpO2lmKGJhcnMubGVuZ3RoPnMubWF4KXJldHVybjsKICAgIGJhcnMuZm9yRWFjaChmdW5jdGlvbihiKXtiLnNsPXMuc2w7fSk7CiAgICB2YXIgbG9zcz1iYXJzLnJlZHVjZShmdW5jdGlvbihhLGIpe3JldHVybiBhK2IubG9zczt9LDApOwogICAgdmFyIHRsPXMuc2wqYmFycy5sZW5ndGg7CiAgICB2YXIgcGw9YmFycy5yZWR1Y2UoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYStiLnBhdC5yZWR1Y2UoZnVuY3Rpb24ocyxwKXtyZXR1cm4gcytwO30sMCk7fSwwKTsKICAgIHZhciBnbT17fTtiYXJzLmZvckVhY2goZnVuY3Rpb24oYil7dmFyIGs9Yi5wYXQuam9pbignLCcpO2lmKCFnbVtrXSlnbVtrXT1iLnBhdDt9KTsKICAgIHZhciBjaGc9T2JqZWN0LnZhbHVlcyhnbSkucmVkdWNlKGZ1bmN0aW9uKGEscCl7cmV0dXJuIGErMStwLmxlbmd0aDt9LDApOwogICAgYWxsRFAucHVzaCh7ZGVzYzpzLnNsLnRvTG9jYWxlU3RyaW5nKCkrJ21tIHggJytiYXJzLmxlbmd0aCxsb3NzUmF0ZTp0bD4wPygxLXBsL3RsKSoxMDA6MTAwLGxvc3NLZzpsb3NzLzEwMDAqa2dtLGJhcktnOnRsLzEwMDAqa2dtLGJhcnM6YmFycyxzbEE6cy5zbCxzbEI6bnVsbCxiQTpiYXJzLGJCOltdLGNoZzpjaGcsdHlwZTonc2luZ2xlJ30pOwogIH0pOwogIGFsbERQLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYS5sb3NzUmF0ZS1iLmxvc3NSYXRlO30pOwogIHZhciBzaW5nbGU9W107CiAgY3MuZm9yRWFjaChmdW5jdGlvbihzKXsKICAgIHZhciBlZmY9cy5zbC1lbmRMb3NzO2lmKGVmZjw9MClyZXR1cm47CiAgICB2YXIgYmFycz1wYWNrKGNwLGVmZixibGFkZSk7aWYoYmFycy5sZW5ndGg+cy5tYXgpcmV0dXJuOwogICAgYmFycy5mb3JFYWNoKGZ1bmN0aW9uKGIpe2Iuc2w9cy5zbDt9KTsKICAgIHZhciBsb3NzPWJhcnMucmVkdWNlKGZ1bmN0aW9uKGEsYil7cmV0dXJuIGErYi5sb3NzO30sMCk7CiAgICB2YXIgdXNhYmxlPXMuc2wqYmFycy5sZW5ndGg7CiAgICB2YXIgcGw9YmFycy5yZWR1Y2UoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYStiLnBhdC5yZWR1Y2UoZnVuY3Rpb24ocyxwKXtyZXR1cm4gcytwO30sMCk7fSwwKTsKICAgIHZhciBnbT17fTtiYXJzLmZvckVhY2goZnVuY3Rpb24oYil7dmFyIGs9Yi5wYXQuam9pbignLCcpO2lmKCFnbVtrXSlnbVtrXT1iLnBhdDt9KTsKICAgIHZhciBjaGc9T2JqZWN0LnZhbHVlcyhnbSkucmVkdWNlKGZ1bmN0aW9uKGEscCl7cmV0dXJuIGErMStwLmxlbmd0aDt9LDApOwogICAgc2luZ2xlLnB1c2goe3NsOnMuc2wsYmFyczpiYXJzLGxvc3M6bG9zcyxtYXg6cy5tYXgseWxkOnVzYWJsZT4wPygxLWxvc3MvdXNhYmxlKSoxMDA6MCxsb3NzUmF0ZTp1c2FibGU+MD8oMS1wbC91c2FibGUpKjEwMDoxMDAsYmFyS2c6KHMuc2wvMTAwMCkqa2dtKmJhcnMubGVuZ3RoLGxvc3NLZzoobG9zcy8xMDAwKSprZ20sY2hnOmNoZ30pOwogIH0pOwogIHNpbmdsZS5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGEubG9zc1JhdGUtYi5sb3NzUmF0ZTt9KTsKICB2YXIgY2hnUGxhbnM9Y2FsY0NoYXJnZU1pbihjcCxjcyxibGFkZSxlbmRMb3NzLGtnbSk7CiAgdmFyIGJwPWNhbGNCdW5kbGVQbGFuKGNwLGNzLGJsYWRlLGVuZExvc3Msa2dtKTsKICByZXR1cm57c2luZ2xlOnNpbmdsZSxjaGdQbGFuczpjaGdQbGFucyxhbGxEUDphbGxEUCxyZW1uYW50QmFyczpyci5yZW1uYW50QmFycyxidW5kbGVQbGFuOmJwLHlpZWxkQ2FyZDE6YWxsRFAubGVuZ3RoP2FsbERQWzBdOm51bGwsY2FsY1BpZWNlczpjcCxvcmlnUGllY2VzOnBpZWNlc307Cn0KCnNlbGYub25tZXNzYWdlPWZ1bmN0aW9uKGUpewogIHZhciBkPWUuZGF0YTsKICB0cnl7CiAgICB2YXIgcjsKICAgIGlmKGQubW9kZT09PSd5aWVsZCcpewogICAgICByPWNhbGNZaWVsZChkLmJsYWRlLGQuZW5kTG9zcyxkLmtnbSxkLnN0b2NrcyxkLnBpZWNlcyxkLnJlbW5hbnRzLGQubWluVmFsaWRMZW4pOwogICAgfWVsc2UgaWYoZC5tb2RlPT09J3BhdEEnKXsKICAgICAgX2RwQ2FjaGU9e307CiAgICAgIHI9e3BhdEE6Y2FsY1BhdHRlcm5BKGQucGllY2VzLGQuc3RvY2tzLGQuYmxhZGUsZC5lbmRMb3NzLGQua2dtKX07CiAgICB9ZWxzZSBpZihkLm1vZGU9PT0ncGF0QicpewogICAgICBfZHBDYWNoZT17fTsKICAgICAgcj17cGF0QjpjYWxjUGF0dGVybkIoZC5waWVjZXMsZC5zdG9ja3MsZC5ibGFkZSxkLmVuZExvc3MsZC5rZ20pfTsKICAgIH1lbHNlIGlmKGQubW9kZT09PSdwYXRDJyl7CiAgICAgIHI9e3BhdEM6bnVsbH07CiAgICB9ZWxzZXsKICAgICAgcj1jYWxjQ29yZShkLmJsYWRlLGQuZW5kTG9zcyxkLmtnbSxkLnN0b2NrcyxkLnBpZWNlcyxkLnJlbW5hbnRzLGQubWluVmFsaWRMZW4pOwogICAgfQogICAgc2VsZi5wb3N0TWVzc2FnZSh7b2s6dHJ1ZSxyZXN1bHQ6cixtb2RlOmQubW9kZX0pOwogIH1jYXRjaChlcnIpewogICAgc2VsZi5wb3N0TWVzc2FnZSh7b2s6ZmFsc2UsZXJyb3I6ZXJyLm1lc3NhZ2UsbW9kZTpkLm1vZGV9KTsKICB9Cn07Cg==';
var calcWorker = null;

function buildCalcMeta(options) {
  if (calcUiNs && typeof calcUiNs.buildCalcResultMeta === 'function') {
    return calcUiNs.buildCalcResultMeta(options);
  }
  options = options || {};
  return {
    calcId: 'calc_' + Date.now(),
    spec: options.spec != null ? options.spec : (((document.getElementById('spec') || {}).value) || ''),
    kind: options.kind != null ? options.kind : ((typeof getCurrentKind === 'function' ? getCurrentKind() : (typeof curKind !== 'undefined' ? curKind : '')) || ''),
    minRemnantLen: parseInt(options.minRemnantLen, 10) || 500,
    blade: parseInt(options.blade, 10) || 3,
    endLoss: parseInt(options.endLoss, 10) || 0,
    job: options.job || (typeof getJobInfo === 'function' ? getJobInfo() : {}),
    stocks: (options.stocks || []).map(function(stock) { return { sl: stock.sl, max: stock.max }; }),
    origPieces: (options.origPieces || []).slice(),
    calcPieces: (options.calcPieces || []).slice(),
    selectedInventoryRemnants: options.selectedInventoryRemnants || (
      typeof getSelectedInventoryRemnantDetails === 'function'
        ? getSelectedInventoryRemnantDetails()
        : []
    ),
    remnantBars: (options.remnantBars || []).map(function(bar) {
      return { pat: (bar.pat || []).slice(), loss: bar.loss || 0, sl: bar.sl || 0 };
    })
  };
}


function doCalc() {
  // 笏笏 螟画焚螳｣險・亥・鬆ｭ縺ｾ縺ｨ繧√・蟾ｻ縺堺ｸ翫￡蝠城｡後ｒ髦ｲ縺撰ｼ・笏笏
  var blade, endLoss, kgm, stocks, remnants, pieces, uniqueLens;
  var remnantResult, remainingPieces, calcPieces, calcStocks;
  var single, top3, chgPlans, dpSingle, dpCands, allDP;
  var yieldBest, yieldCard1, yieldCard2, bundlePlan;
  var patA, patB, patC;
  var state = calcInputNs && typeof calcInputNs.collectCalcExecutionState === 'function'
    ? calcInputNs.collectCalcExecutionState({
      stdLengths: STD,
      totalRows: totalRows,
      getRemnants: getRemnants
    })
    : null;

  blade = state ? state.blade : (parseInt(document.getElementById('blade').value, 10) || 3);
  endLoss = state ? state.endLoss : (parseInt(document.getElementById('endloss').value, 10) || 75);
  kgm = state ? state.kgm : (parseFloat(document.getElementById('kgm').value) || 0);
  stocks = state ? state.stocks : [];
  if (!stocks.length) { alert('使用する定尺をチェックしてください'); return; }

  // 谿区攝蜿門ｾ・
  remnants = state ? state.remnants : getRemnants();
  pieces = state ? state.pieces.slice() : [];
  if (state && state.invalidLength) { alert('部材長は 12,000mm 以下で入力してください。'); return; }
  // 驛ｨ譚先悴蜈･蜉帙〒繧よｮ区攝縺縺代〒險育ｮ励〒縺阪ｋ・域ｮ区攝縺後≠繧句ｴ蜷医・OK・・
  if (!pieces.length && !remnants.length) { alert('部材または残材を入力してください'); return; }
  if (!pieces.length && remnants.length > 0) {
    // 谿区攝縺ｮ縺ｿ繝｢繝ｼ繝会ｼ壽ｮ区攝繝ｪ繧ｹ繝医ｒ縺昴・縺ｾ縺ｾ蛻・妙蝗ｳ陦ｨ遉ｺ
    var remOnlyBars = state && state.remnantOnlyBars ? state.remnantOnlyBars : remnants.slice().sort(function(a,b){return b-a;}).map(function(rl){
      return { pat: [], loss: rl, sl: rl };
    });
    render([], [], [], endLoss, remOnlyBars, kgm, [], [], null, null, null, null, null, null);
    return;
  }
  pieces.sort(function(a, b) { return b - a; });

  // 驛ｨ譚舌き繝ｩ繝ｼ繝槭ャ繝玲ｧ狗ｯ・
  if (calcInputNs && typeof calcInputNs.assignPieceColors === 'function') {
    calcInputNs.assignPieceColors(pieces, PIECE_COLORS, pieceColorMap);
  } else {
    pieceColorMap = {};
    uniqueLens = [];
    pieces.forEach(function(p){ if (uniqueLens.indexOf(p) < 0) uniqueLens.push(p); });
    uniqueLens.sort(function(a,b){return b-a;});
    uniqueLens.forEach(function(ln, ci){ pieceColorMap[ln] = PIECE_COLORS[ci % PIECE_COLORS.length]; });
  }

  // 谿区攝蜆ｪ蜈亥・逅・
  var calcCoreFn = calcYieldNs && typeof calcYieldNs.calcCore === 'function'
    ? calcYieldNs.calcCore
    : null;
  var coreResult = calcCoreFn ? calcCoreFn({
    blade: blade,
    endLoss: endLoss,
    kgm: kgm,
    stocks: stocks,
    pieces: pieces,
    remnants: remnants,
    minValidLen: state ? state.minValidLen : (parseInt(document.getElementById('minRemnantLen') && document.getElementById('minRemnantLen').value, 10) || 500),
    kind: typeof curKind !== 'undefined' ? curKind : '',
    spec: (document.getElementById('spec') || {}).value || ''
  }) : null;

  remnantResult = { remnantBars: (coreResult && coreResult.remnantBars) || [] };
  calcPieces = (coreResult && coreResult.calcPieces) || [];
  single = (coreResult && coreResult.single) || [];
  top3 = [];
  chgPlans = (coreResult && coreResult.chgPlans) || [];
  allDP = (coreResult && coreResult.allDP) || [];
  yieldCard1 = (coreResult && coreResult.yieldCard1) || null;
  yieldCard2 = null;
  bundlePlan = (coreResult && coreResult.bundlePlan) || null;
  patA = (coreResult && coreResult.patA) || null;
  patB = (coreResult && coreResult.patB) || null;
  patC = (coreResult && coreResult.patC) || null;

  _lastCalcResult = {
    allDP: allDP,
    patA: patA,
    patB: patB,
    patC: patC,
    meta: buildCalcMeta({
      minRemnantLen: parseInt((document.getElementById('minRemnantLen') || {}).value, 10) || 500,
      blade: blade,
      endLoss: endLoss,
      stocks: stocks
    })
  };
  if (calcUiNs && typeof calcUiNs.applyCalcResultState === 'function') {
    calcUiNs.applyCalcResultState({
      single: single,
      chgPlans: chgPlans,
      allDP: allDP,
      remnantBars: remnantResult.remnantBars,
      bundlePlan: bundlePlan,
      patA: patA,
      patB: patB,
      patC: patC,
      yieldCard1: yieldCard1,
      calcPieces: calcPieces
    }, {
      meta: _lastCalcResult.meta,
      endLoss: endLoss,
      kgm: kgm
    });
    return;
  }

  render(single, top3, chgPlans, endLoss, remnantResult.remnantBars, kgm, allDP, calcPieces, bundlePlan, patA, patB, patC, yieldCard1, yieldCard2);
  _lastAllDP = allDP || [];
  _lastPatA = patA;
  _lastPatB = patB;
  if (typeof autoSyncResultRemnants === 'function') autoSyncResultRemnants(_lastCalcResult);
}

function scheduleCalcIdle(callback) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(function() { callback(); }, { timeout: 250 });
  } else {
    setTimeout(callback, 0);
  }
}

function ensureCalcLoadingOverlay() {
  return null;
}

function showCalcLoadingOverlay() {
  return;
}

function hideCalcLoadingOverlay() {
  return;
}

function createCalcWorker() {
  if (yieldWorkerFactory) {
    return yieldWorkerFactory(WORKER_B64);
  }
  var workerCode = atob(WORKER_B64);
  var blob = new Blob([workerCode], { type: 'application/javascript' });
  var url = URL.createObjectURL(blob);
  return {
    worker: new Worker(url),
    cleanup: function() {
      URL.revokeObjectURL(url);
    },
    source: 'blob'
  };
}

function runWorkerMode(mode, baseMsg) {
  if (yieldWorkerRunner) {
    return yieldWorkerRunner(mode, baseMsg, WORKER_B64);
  }
  return new Promise(function(resolve) {
    var handle = createCalcWorker();
    handle.worker.onmessage = function(e) {
      handle.worker.terminate();
      if (handle.cleanup) handle.cleanup();
      if (e.data && e.data.ok) resolve(e.data.result || {});
      else resolve({});
    };
    handle.worker.onerror = function() {
      handle.worker.terminate();
      if (handle.cleanup) handle.cleanup();
      resolve({});
    };
    handle.worker.postMessage(Object.assign({}, baseMsg, { mode: mode }));
  });
}

function applyWorkerResults(results, stocks, minValidLen, endLoss, kgm) {
  var ry = results.yield || {};
  var patA = results.patA ? results.patA.patA : null;
  var patB = results.patB ? results.patB.patB : null;
  var patC = null;
  var remBars = ry.remnantBars || [];
  var meta = buildCalcMeta({
    minRemnantLen: minValidLen,
    blade: parseInt((document.getElementById('blade') || {}).value, 10) || 3,
    endLoss: endLoss,
    stocks: stocks,
    origPieces: ry.origPieces || [],
    calcPieces: ry.calcPieces || [],
    remnantBars: remBars
  });
  if (remBars.length) {
    function mergeRemnants(pat) {
      if (!pat || !pat.bars) return pat;
      var merged = remBars.concat(pat.bars);
      var sl = pat.sl || (merged[0] && merged[0].sl) || stocks[0].sl;
      return Object.assign({}, pat, { bars: merged, metrics: calcMetrics(merged, sl, endLoss, kgm, minValidLen) });
    }
    if (patA) patA = mergeRemnants(patA);
    if (patB) {
      if (patB.plan90) patB.plan90 = mergeRemnants(patB.plan90);
      if (patB.plan80) patB.plan80 = mergeRemnants(patB.plan80);
    }
  }
  if (calcUiNs && typeof calcUiNs.applyCalcResultState === 'function') {
    calcUiNs.applyCalcResultState({
      single: ry.single || [],
      chgPlans: ry.chgPlans || [],
      allDP: ry.allDP || [],
      remnantBars: remBars,
      bundlePlan: ry.bundlePlan || null,
      patA: patA,
      patB: patB,
      patC: patC,
      yieldCard1: ry.yieldCard1 || null,
      calcPieces: ry.calcPieces || []
    }, {
      meta: meta,
      endLoss: endLoss,
      kgm: kgm
    });
    return;
  }
  _lastCalcResult = { allDP: ry.allDP, patA: patA, patB: patB, patC: patC, meta: meta };
  render(ry.single || [], [], ry.chgPlans || [], endLoss, remBars, kgm,
    ry.allDP || [], ry.calcPieces || [], ry.bundlePlan || null,
    patA, patB, patC, ry.yieldCard1 || null, null);
  _lastAllDP = ry.allDP || [];
  _lastPatA = patA;
  _lastPatB = patB;
  if (typeof autoSyncResultRemnants === 'function') autoSyncResultRemnants(_lastCalcResult);
}

function runCalc() {
  showCalcLoadingOverlay();
  var btn = calcFlowNs && typeof calcFlowNs.setRunButtonBusy === 'function'
    ? calcFlowNs.setRunButtonBusy()
    : document.getElementById('runBtn');
  if (btn && (!calcFlowNs || typeof calcFlowNs.setRunButtonBusy !== 'function')) {
    btn.innerHTML = '<span class="sp"></span> 險育ｮ嶺ｸｭ...';
    btn.disabled = true;
  }
  if (typeof _lastRegisteredRemnantSignature !== 'undefined') _lastRegisteredRemnantSignature = '';
  savePiecesHistory();
  saveSettings();

  var state = calcInputNs && typeof calcInputNs.collectCalcExecutionState === 'function'
    ? calcInputNs.collectCalcExecutionState({
      stdLengths: STD,
      totalRows: totalRows,
      getRemnants: getRemnants
    })
    : null;
  var blade = state ? state.blade : (parseInt(document.getElementById('blade').value, 10) || 3);
  var endLoss = state ? state.endLoss : (parseInt(document.getElementById('endloss').value, 10) || 75);
  var kgm = state ? state.kgm : (parseFloat(document.getElementById('kgm').value) || 0);
  var minValidLen = state ? state.minValidLen : (parseInt(document.getElementById('minRemnantLen') ? document.getElementById('minRemnantLen').value : 500, 10) || 500);

  var stocks = state ? state.stocks : [];
  if (!stocks.length) {
    if (calcFlowNs && typeof calcFlowNs.failCalcRun === 'function') calcFlowNs.failCalcRun('使用する定尺をチェックしてください');
    else { alert('使用する定尺をチェックしてください'); btn.innerHTML = '計算を実行する <span class="arr">→</span><span class="run-hint">Ctrl + Enter</span>'; btn.disabled = false; hideCalcLoadingOverlay(); }
    return;
  }

  if (calcInputNs && typeof calcInputNs.updateStocksBadge === 'function') {
    calcInputNs.updateStocksBadge(stocks);
  } else {
    var sb = document.getElementById('stocksBadge');
    if (sb) sb.textContent = '蟇ｾ雎｡螳壼ｰｺ: ' + stocks.map(function(s) { return s.sl.toLocaleString() + 'mm'; }).join(' / ');
  }

  var pieces = state ? state.pieces.slice() : [];
  if (state && state.invalidLength) {
    if (calcFlowNs && typeof calcFlowNs.failCalcRun === 'function') calcFlowNs.failCalcRun('部材長は 12,000mm 以下で入力してください。');
    else { alert('部材長は 12,000mm 以下で入力してください。'); btn.innerHTML = '計算を実行する <span class="arr">→</span><span class="run-hint">Ctrl + Enter</span>'; btn.disabled = false; hideCalcLoadingOverlay(); }
    return;
  }
  var remnants = state ? state.remnants : getRemnants();
  if (!pieces.length && !remnants.length) {
    if (calcFlowNs && typeof calcFlowNs.failCalcRun === 'function') calcFlowNs.failCalcRun('部材または残材を入力してください');
    else { alert('部材または残材を入力してください'); btn.innerHTML = '計算を実行する <span class="arr">→</span><span class="run-hint">Ctrl + Enter</span>'; btn.disabled = false; hideCalcLoadingOverlay(); }
    return;
  }
  if (!pieces.length && remnants.length > 0) {
    var remOnlyBars = state && state.remnantOnlyBars ? state.remnantOnlyBars : remnants.slice().sort(function(a, b) { return b - a; }).map(function(rl) { return { pat: [], loss: rl, sl: rl }; });
    _lastCalcResult = {
      allDP: [],
      patA: null,
      patB: null,
      patC: null,
      meta: buildCalcMeta({
        minRemnantLen: minValidLen,
        blade: blade,
        endLoss: endLoss,
        stocks: stocks,
        origPieces: pieces,
        calcPieces: [],
        remnantBars: remOnlyBars
      })
    };
    render([], [], [], endLoss, remOnlyBars, kgm, [], [], null, null, null, null, null, null);
    if (calcFlowNs && typeof calcFlowNs.completeCalcRun === 'function') calcFlowNs.completeCalcRun();
    else { btn.innerHTML = '計算を実行する <span class="arr">→</span><span class="run-hint">Ctrl + Enter</span>'; btn.disabled = false; hideCalcLoadingOverlay(); }
    return;
  }

  // Worker 蛛ｴ縺ｫ縺ｯ縺ｾ縺蝗ｺ螳售TD縺ｮ蝓九ａ霎ｼ縺ｿ縺梧ｮ九▲縺ｦ縺・ｋ縺溘ａ縲・
  // 谿区攝縺ゅｊ險育ｮ励□縺代・ browser-side 縺ｮ doCalc() 縺ｫ蟇・○縺ｦ
  // data.js 騾｣蜍輔・螳壼ｰｺ繧呈ｭ｣縺ｨ縺励※謇ｱ縺・・
  if (remnants.length > 0) {
    try { doCalc(); }
    catch (fallbackErr) {
      if (calcFlowNs && typeof calcFlowNs.failCalcRun === 'function') calcFlowNs.failCalcRun('計算エラー: ' + fallbackErr.message);
      else { alert('險育ｮ励お繝ｩ繝ｼ: ' + fallbackErr.message); }
      return;
    }
    if (calcFlowNs && typeof calcFlowNs.completeCalcRun === 'function') calcFlowNs.completeCalcRun();
    else { btn.innerHTML = '計算を実行する <span class="arr">→</span><span class="run-hint">Ctrl + Enter</span>'; btn.disabled = false; hideCalcLoadingOverlay(); }
    return;
  }

  var baseMsg = { blade: blade, endLoss: endLoss, kgm: kgm, stocks: stocks, pieces: pieces, remnants: remnants, minValidLen: minValidLen };
  var runner = calcFlowNs && typeof calcFlowNs.runSequentialModes === 'function'
    ? calcFlowNs.runSequentialModes
    : null;
  var workerSequence = runner
    ? runner(runWorkerMode, scheduleCalcIdle, baseMsg)
    : runWorkerMode('yield', baseMsg).then(function(res) {
      var fallbackResults = { yield: res || {} };
      return new Promise(function(resolve) {
        scheduleCalcIdle(function() {
          runWorkerMode('patA', baseMsg).then(function(r) {
            fallbackResults.patA = r || {};
            resolve(fallbackResults);
          });
        });
      });
    }).then(function(fallbackResults) {
      return new Promise(function(resolve) {
        scheduleCalcIdle(function() {
          runWorkerMode('patB', baseMsg).then(function(r) {
            fallbackResults.patB = r || {};
            resolve(fallbackResults);
          });
        });
      });
    });
  workerSequence.then(function(results) {
    applyWorkerResults(results, stocks, minValidLen, endLoss, kgm);
    if (calcFlowNs && typeof calcFlowNs.completeCalcRun === 'function') calcFlowNs.completeCalcRun();
    else { btn.innerHTML = '計算を実行する <span class="arr">→</span><span class="run-hint">Ctrl + Enter</span>'; btn.disabled = false; hideCalcLoadingOverlay(); }
  }).catch(function(err) {
    console.warn('Worker sequential calc failed', err);
    try { doCalc(); }
    catch (fallbackErr) {
      if (calcFlowNs && typeof calcFlowNs.failCalcRun === 'function') calcFlowNs.failCalcRun('計算エラー: ' + fallbackErr.message);
      else { alert('險育ｮ励お繝ｩ繝ｼ: ' + fallbackErr.message); }
      return;
    }
    if (calcFlowNs && typeof calcFlowNs.completeCalcRun === 'function') calcFlowNs.completeCalcRun();
    else { btn.innerHTML = '計算を実行する <span class="arr">→</span><span class="run-hint">Ctrl + Enter</span>'; btn.disabled = false; hideCalcLoadingOverlay(); }
  });
}


