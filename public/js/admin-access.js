const ADMIN_PASSWORD = 'Fs2026coll';
const ADMIN_SESSION_KEY = 'cf_admin_access';

export function validateAdminPassword(password) {
  return String(password || '') === ADMIN_PASSWORD;
}

export function hasAdminAccess() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'ok';
}

export function grantAdminAccess() {
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'ok');
}

export function clearAdminAccess() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export function requestAdminAccess(message = 'Ingresa la clave de administrador:') {
  const password = window.prompt(message);
  if (password === null) return false;

  const valid = validateAdminPassword(password.trim());
  if (!valid) {
    window.alert('Clave incorrecta.');
    return false;
  }

  grantAdminAccess();
  return true;
}

export function ensureAdminAccess(message) {
  if (hasAdminAccess()) return true;
  return requestAdminAccess(message);
}
