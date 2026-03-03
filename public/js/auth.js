import { APP_MODE } from './app-config.js';
import { initLocalAuth, loginLocal, getSession, logoutLocal } from './local-auth.js';

if (APP_MODE.auth === 'local') {
  initLocalAuth();
}

export function login(email, password) {
  if (APP_MODE.auth === 'local') {
    return loginLocal(email, password);
  }
  return { ok: false, message: 'Modo auth no implementado todavía.' };
}

export function currentSession() {
  if (APP_MODE.auth === 'local') {
    return getSession();
  }
  return null;
}

export function logout() {
  if (APP_MODE.auth === 'local') {
    logoutLocal();
  }
}
