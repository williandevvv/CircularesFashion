import { ensureAdminAccess } from './admin-access.js';

const hasAccess = ensureAdminAccess('Ingresa la clave para entrar al panel de admin:');
if (!hasAccess) {
  window.location.replace('./index.html');
}
