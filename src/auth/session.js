(function(global) {
  'use strict';

  var ns = global.Toriai = global.Toriai || {};
  ns.auth = ns.auth || {};

  var currentSession = null;
  var listeners = [];

  function getAnonymousSession() {
    return {
      userId: null,
      officeId: null,
      organizationId: null,
      role: 'anonymous',
      isAuthenticated: false
    };
  }

  function normalizeSession(session) {
    var base = getAnonymousSession();
    if (!session || typeof session !== 'object') return base;
    return {
      userId: session.userId || session.user_id || base.userId,
      officeId: session.officeId || session.office_id || base.officeId,
      organizationId: session.organizationId || session.organization_id || base.organizationId,
      role: session.role || base.role,
      isAuthenticated: !!(session.isAuthenticated || session.userId || session.user_id)
    };
  }

  function getCurrentSession() {
    return currentSession || getAnonymousSession();
  }

  function setCurrentSession(session) {
    currentSession = normalizeSession(session);
    listeners.slice().forEach(function(listener) {
      try { listener(currentSession); } catch (error) { console.warn('[Toriai][auth] listener failed:', error); }
    });
    return currentSession;
  }

  function clearCurrentSession() {
    return setCurrentSession(null);
  }

  function getCurrentScope() {
    var session = getCurrentSession();
    return {
      userId: session.userId,
      officeId: session.officeId,
      organizationId: session.organizationId,
      role: session.role,
      storageScope: session.officeId || session.userId || 'local'
    };
  }

  function onSessionChange(listener) {
    if (typeof listener !== 'function') return function() {};
    listeners.push(listener);
    return function unsubscribe() {
      listeners = listeners.filter(function(item) { return item !== listener; });
    };
  }

  ns.auth.session = {
    getAnonymousSession: getAnonymousSession,
    getCurrentSession: getCurrentSession,
    setCurrentSession: setCurrentSession,
    clearCurrentSession: clearCurrentSession,
    getCurrentScope: getCurrentScope,
    onSessionChange: onSessionChange
  };
})(window);
