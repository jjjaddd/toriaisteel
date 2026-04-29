(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.ui = ns.ui || {};
  ns.ui.calc = ns.ui.calc || {};

  function renderCardRemnantSection(card, rems) {
    if (!card) return;
    var pat = card.querySelector('.cc-pat');
    var section = card.querySelector('.rem-section');
    if (!section && pat) {
      var probe = pat.nextElementSibling;
      while (probe) {
        if (probe.classList && probe.classList.contains('diag-toggle')) break;
        if (((probe.textContent || '').indexOf('端材リスト') >= 0) || (probe.classList && probe.classList.contains('rem-list'))) {
          section = probe;
          break;
        }
        probe = probe.nextElementSibling;
      }
    }
    if (!section) {
      section = document.createElement('div');
      section.className = 'rem-section rem-strip';
      if (pat && pat.parentNode === card) pat.insertAdjacentElement('afterend', section);
      else card.appendChild(section);
    }
    section.classList.add('rem-section', 'rem-strip');
    section.style.background = '';
    var dup = section.nextElementSibling;
    while (dup && !(dup.classList && dup.classList.contains('diag-toggle'))) {
      var next = dup.nextElementSibling;
      if ((dup.textContent || '').indexOf('端材リスト') >= 0 || (dup.classList && dup.classList.contains('rem-section'))) {
        dup.remove();
      }
      dup = next;
    }
    section.innerHTML =
      '<div class="rem-strip-label">端材リスト</div>' +
      (rems.length ? global.buildRemHtmlFromRemnants(rems) : '<div class="rem-list"><span class="rem-pill rem-pill-empty">なし</span></div>');
  }

  function hydrateCardRemnantLists() {
    document.querySelectorAll('.cc[id]').forEach(function(card) {
      var payload = typeof global.buildCardSelectionPayload === 'function'
        ? global.buildCardSelectionPayload(global._lastCalcResult || {}, card.id)
        : null;
      var rems = payload ? payload.remnants.slice() : (typeof global.extractRemnants === 'function'
        ? global.extractRemnants(global._lastCalcResult, card.id)
        : global.extractRemnantsFromBars(global.getBarsForSelectedCard(card.id, global._lastCalcResult)));
      renderCardRemnantSection(card, rems);
    });
  }

  ns.ui.calc.renderCardRemnantSection = renderCardRemnantSection;
  ns.ui.calc.hydrateCardRemnantLists = hydrateCardRemnantLists;
  global.renderCardRemnantSection = renderCardRemnantSection;
  global.hydrateCardRemnantLists = hydrateCardRemnantLists;
})(window);
