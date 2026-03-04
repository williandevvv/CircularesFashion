const USERS_KEY = 'cf_users';
const SESSION_KEY = 'cf_session';

const DEFAULT_USERS = [
  { email: 'admin@circulares.local', password: 'Admin123!', role: 'admin' },
  { email: 'auditor@circulares.local', password: 'Auditor123!', role: 'auditor' }
];

export function initLocalAuth() {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || 'null');
  if (!users || !Array.isArray(users) || users.length === 0) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  }
}

export function loginLocal(email, password) {
  initLocalAuth();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const found = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
  );

  if (!found) {
    return { ok: false, message: 'Credenciales inválidas.' };
  }

  const session = {
    email: found.email,
    role: found.role,
    loggedAt: Date.now()
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, user: session };
}

export function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
}

export function logoutLocal() {
  localStorage.removeItem(SESSION_KEY);
}

export function updateUserPassword(email, newPassword) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const updated = users.map((u) =>
    u.email.toLowerCase() === email.toLowerCase().trim() ? { ...u, password: newPassword } : u
  );
  localStorage.setItem(USERS_KEY, JSON.stringify(updated));
}
