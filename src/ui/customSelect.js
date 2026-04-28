// ── Universal Custom <select> ──────────────────────────────
/**
 * Replace a native <select> with a fully-styleable custom dropdown.
 * The native element is hidden but kept in the DOM so all existing
 * JS (onchange, value reads, etc.) continues to work unchanged.
 *
 * opts: {
 *   cls      : extra CSS class on the wrapper (e.g. 'cs-sort', 'cs-inv')
 *   dataTab  : boolean — adds cs-wrap--data for blue hover variant
 *   flex1    : boolean — wrapper gets flex:1 (for flex children)
 *   block    : boolean — wrapper displays as block (full width)
 * }
 */
function initCustomSelect(id, opts) {
  opts = opts || {};
  var native = document.getElementById(id);
  if (!native || native._csInit) return;
  native._csInit = true;

  // ── Build wrapper ──────────────────────────────────────
  var wrapClass = 'cs-wrap';
  if (opts.cls)     wrapClass += ' ' + opts.cls;
  if (opts.dataTab) wrapClass += ' cs-wrap--data';
  if (opts.flex1)   wrapClass += ' cs-flex1';
  if (opts.block)   wrapClass += ' cs-block';

  var wrap     = document.createElement('div');
  var trigger  = document.createElement('button');
  var lbl      = document.createElement('span');
  var arrow    = document.createElement('span');
  var dropdown = document.createElement('div');

  wrap.className     = wrapClass;
  if (opts.wrapStyle) wrap.style.cssText = opts.wrapStyle;
  trigger.type       = 'button';
  trigger.className  = 'cs-trigger';
  lbl.className      = 'cs-label';
  arrow.className    = 'cs-arrow';
  arrow.textContent  = '▾';
  dropdown.className = 'cs-dropdown';

  trigger.appendChild(lbl);
  trigger.appendChild(arrow);
  wrap.appendChild(trigger);
  wrap.appendChild(dropdown);

  // Insert wrapper before native, then hide native
  native.parentNode.insertBefore(wrap, native);
  native.style.display = 'none';
  // Move native inside wrap so it stays logically grouped
  wrap.appendChild(native);

  // ── Sync custom UI ← native options ───────────────────
  function sync() {
    var selVal = native.value;
    var selText = null;
    dropdown.innerHTML = '';
    Array.from(native.options).forEach(function(opt) {
      var div = document.createElement('div');
      div.className = 'cs-option' + (opt.value === selVal ? ' cs-option--selected' : '');
      div.dataset.value = opt.value;
      div.textContent = opt.text;
      div.addEventListener('mousedown', function(e) {
        e.preventDefault(); // prevent blur-before-click race
        if (native.value !== opt.value) {
          native.value = opt.value;
          native.dispatchEvent(new Event('change', { bubbles: true }));
        }
        close();
      });
      dropdown.appendChild(div);
      if (opt.value === selVal) selText = opt.text;
    });
    lbl.textContent = selText !== null ? selText
      : (native.options[0] ? native.options[0].text : '');
  }

  // ── Open / Close ───────────────────────────────────────
  function open() {
    document.querySelectorAll('.cs-wrap.cs-open').forEach(function(w) {
      if (w !== wrap) w.classList.remove('cs-open');
    });
    wrap.classList.add('cs-open');
    var sel = dropdown.querySelector('.cs-option--selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function close() { wrap.classList.remove('cs-open'); }
  function toggle() { wrap.classList.contains('cs-open') ? close() : open(); }

  trigger.addEventListener('click', function(e) {
    e.stopPropagation();
    toggle();
  });
  document.addEventListener('mousedown', function(e) {
    if (!wrap.contains(e.target)) close();
  });
  // Keyboard: Enter/Space toggle, Escape close, arrows navigate
  trigger.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!wrap.classList.contains('cs-open')) { open(); return; }
      var items = dropdown.querySelectorAll('.cs-option');
      var cur = Array.from(items).findIndex(function(o) { return o.classList.contains('cs-option--selected'); });
      var next = e.key === 'ArrowDown' ? Math.min(cur + 1, items.length - 1) : Math.max(cur - 1, 0);
      if (items[next]) items[next].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }
  });

  // ── Watch native for external option / value changes ──
  new MutationObserver(sync).observe(native, {
    childList: true, subtree: true,
    attributes: true, attributeFilter: ['value', 'selected']
  });
  native.addEventListener('change', sync);

  sync();
}

// ── Initialize all custom selects ─────────────────────────
(function() {
  function doInit() {
    initCustomSelect('hsSort',         { cls: 'cs-sort' });
    initCustomSelect('invSort',        { cls: 'cs-sort' });
    initCustomSelect('invSelect',      { cls: 'cs-inv', flex1: true });
    initCustomSelect('dataKindSelect', {
      block: true, dataTab: true,
      wrapStyle: 'margin:10px 0 14px;max-width:280px'
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doInit, { once: true });
  } else {
    doInit();
  }
})();
