function getAppSteelKinds() {
  if (window.Toriai && window.Toriai.data && window.Toriai.data.steel && typeof window.Toriai.data.steel.getAllKinds === 'function') {
    return window.Toriai.data.steel.getAllKinds();
  }
  return (typeof getCalcEnabledKinds === 'function') ? getCalcEnabledKinds() : [];
}

function ensureSteelCatalogReady() {
  var kinds = getAppSteelKinds();
  if (Array.isArray(kinds) && kinds.length) return kinds;

  if (typeof getCalcEnabledKinds === 'function') {
    kinds = getCalcEnabledKinds() || [];
  }
  return Array.isArray(kinds) ? kinds : [];
}

function getAppSteelRows(kind) {
  if (window.Toriai && window.Toriai.data && window.Toriai.data.steel && typeof window.Toriai.data.steel.getRowsByKind === 'function') {
    var rows = window.Toriai.data.steel.getRowsByKind(kind);
    if (Array.isArray(rows) && rows.length) return rows;
  }
  if (typeof getSteelRowsForKind === 'function') {
    return getSteelRowsForKind(kind) || [];
  }
  return [];
}

function getAppSteelRow(kind, spec) {
  if (window.Toriai && window.Toriai.data && window.Toriai.data.steel && typeof window.Toriai.data.steel.findRowByKindAndSpec === 'function') {
    return window.Toriai.data.steel.findRowByKindAndSpec(kind, spec);
  }
  var rows = getAppSteelRows(kind);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i][0] === spec) return rows[i];
  }
  return null;
}

