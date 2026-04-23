(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.ui = ns.ui || {};

  var activePage = 'c';

  ns.ui.pageState = {
    getActivePage: function() {
      return activePage;
    },
    setActivePage: function(page) {
      activePage = page || activePage;
      return activePage;
    }
  };
})(window);
