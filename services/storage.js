/**
 * SERVIÇO: storage.js
 * Agora apenas gerencia a sessão do usuário. O resto foi para o backend.
 *
 * @module StorageService
 */

const StorageService = (() => {
  const KEYS = {
    SESSION: 'mvc_session',
  };

  /**
   * Mantido por compatibilidade com `authController.init()`
   */
  async function init() {
    return Promise.resolve();
  }

  // --- Sessão ---
  function setSession(user) {
    sessionStorage.setItem(KEYS.SESSION, JSON.stringify(user));
  }

  function getSession() {
    return JSON.parse(sessionStorage.getItem(KEYS.SESSION) || 'null');
  }

  function clearSession() {
    sessionStorage.removeItem(KEYS.SESSION);
  }

  return {
    init,
    setSession, getSession, clearSession,
  };
})();
