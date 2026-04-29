(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.inventory = ns.inventory || {};

  function getScope() {
    return ns.auth && ns.auth.session && ns.auth.session.getCurrentScope
      ? ns.auth.session.getCurrentScope()
      : { storageScope: 'local', officeId: null, userId: null, organizationId: null };
  }

  function buildInventoryKey(kind, spec) {
    return ['inventory', kind || '', spec || ''].join(':');
  }

  function buildScopedInventoryKey(kind, spec, scope) {
    var resolvedScope = scope || getScope();
    return [resolvedScope.storageScope || 'local', buildInventoryKey(kind, spec)].join(':');
  }

  function normalizeInventoryRecord(record, scope) {
    var resolvedScope = scope || getScope();
    var item = Object.assign({}, record || {});
    item.officeId = item.officeId || resolvedScope.officeId || null;
    item.organizationId = item.organizationId || resolvedScope.organizationId || null;
    item.ownerUserId = item.ownerUserId || resolvedScope.userId || null;
    return item;
  }

  function filterRecordsForCurrentScope(records, scope) {
    var resolvedScope = scope || getScope();
    if (!Array.isArray(records)) return [];
    if (!resolvedScope.officeId && !resolvedScope.userId) return records.slice();
    return records.filter(function(record) { return belongsToScope(record, resolvedScope); });
  }

  function belongsToScope(record, scope) {
    var resolvedScope = scope || getScope();
    if (!record) return false;
    if (!resolvedScope.officeId && !resolvedScope.userId) return true;
    if (resolvedScope.officeId && record.officeId) return record.officeId === resolvedScope.officeId;
    if (resolvedScope.userId && record.ownerUserId) return record.ownerUserId === resolvedScope.userId;
    return !record.officeId && !record.ownerUserId;
  }

  ns.inventory.service = {
    getScope: getScope,
    buildInventoryKey: buildInventoryKey,
    buildScopedInventoryKey: buildScopedInventoryKey,
    normalizeInventoryRecord: normalizeInventoryRecord,
    belongsToScope: belongsToScope,
    filterRecordsForCurrentScope: filterRecordsForCurrentScope
  };
})(window);
