import { firebaseConfig, auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  getAuth
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { deleteApp, initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { APP_MODE } from './app-config.js';

let sessionCache = null;
const isTemporaryLoginDisabled = APP_MODE.tempDisableLogin === true;
const TEMP_ADMIN_SESSION = {
  uid: 'temp-admin-session',
  email: 'admin.temporal@circulares.local',
  role: 'admin',
  displayName: 'Admin temporal',
  isActive: true
};

const AUTH_INVALID_CREDENTIAL_CODES = new Set(['auth/wrong-password', 'auth/user-not-found']);
const PROFILE_LOAD_ERROR_MESSAGE =
  'No se pudo cargar el perfil (rol) desde Firestore. Revisa Firestore Database, reglas o conexión.';
const PROFILE_MISSING_ERROR_MESSAGE =
  'Tu usuario no tiene perfil en Firestore (users/{uid}). Pide al admin que te cree el rol.';

const DEFAULT_ADMIN = {
  email: 'admin@circulares.fs',
  password: 'Admin123!',
  displayname: 'Administrador',
  role: 'admin'
};

const ROLES = new Set(['admin', 'auditor', 'usuario']);

function createSecondaryAuth() {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}-${Math.random()}`);
  return {
    secondaryApp,
    secondaryAuth: getAuth(secondaryApp)
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableFirestoreError(error) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  return (
    code.includes('unavailable') ||
    code.includes('deadline-exceeded') ||
    code.includes('timeout') ||
    message.includes('offline') ||
    message.includes('timed out') ||
    message.includes('timeout')
  );
}

async function loadUserProfileDoc(uid) {
  const userRef = doc(db, 'users', uid);

  try {
    return await getDoc(userRef);
  } catch (error) {
    if (isRetryableFirestoreError(error)) {
      await delay(800);
      return await getDoc(userRef);
    }
    throw error;
  }
}

export async function getUserRole(uid) {
  if (!uid) return 'usuario';
  const userDoc = await loadUserProfileDoc(uid);
  if (!userDoc.exists()) return 'usuario';
  const role = String(userDoc.data()?.role || '').toLowerCase();
  if (!ROLES.has(role)) return 'usuario';
  return role;
}

async function buildSession(user) {
  if (!user) return null;

  const userDoc = await loadUserProfileDoc(user.uid);

  if (!userDoc.exists()) {
    const missingProfileError = new Error(PROFILE_MISSING_ERROR_MESSAGE);
    missingProfileError.code = 'profile/not-found';
    throw missingProfileError;
  }

  const profile = userDoc.data();
  const role = await getUserRole(user.uid);

  return {
    uid: user.uid,
    email: user.email || profile.email || '',
    role,
    displayName: profile.displayName || profile.displayname || user.displayName || '',
    isActive: profile.isActive !== false
  };
}

export async function createDefaultAdmin() {
  if (isTemporaryLoginDisabled) {
    return { ok: true, skipped: true, reason: 'temp-login-disabled' };
  }

  const bootstrapKey = 'circulares.default-admin.bootstrap.done';
  if (window.localStorage.getItem(bootstrapKey) === '1') {
    return { ok: true, skipped: true };
  }

  const { secondaryApp, secondaryAuth } = createSecondaryAuth();

  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      DEFAULT_ADMIN.email,
      DEFAULT_ADMIN.password
    );

    await setDoc(doc(db, 'users', credential.user.uid), {
      email: DEFAULT_ADMIN.email,
      displayname: DEFAULT_ADMIN.displayname,
      role: DEFAULT_ADMIN.role,
      isActive: true,
      createdAt: serverTimestamp()
    }, { merge: true });

    window.localStorage.setItem(bootstrapKey, '1');
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    return { ok: true, created: true };
  } catch (error) {
    if (error?.code === 'auth/email-already-in-use') {
      window.localStorage.setItem(bootstrapKey, '1');
      await deleteApp(secondaryApp);
      return { ok: true, created: false };
    }

    console.warn('No se pudo ejecutar bootstrap de admin por defecto.', error);
    await deleteApp(secondaryApp);
    return { ok: false, error };
  }
}

export function listenSession(callback) {
  if (isTemporaryLoginDisabled) {
    sessionCache = { ...TEMP_ADMIN_SESSION };
    callback(sessionCache);
    return () => {};
  }

  return onAuthStateChanged(auth, async (user) => {
    try {
      sessionCache = await buildSession(user);
      callback(sessionCache);
    } catch (error) {
      console.error('No se pudo cargar el perfil del usuario.', error);
      sessionCache = null;
      callback(null);
    }
  });
}

export async function currentSession() {
  if (isTemporaryLoginDisabled) {
    sessionCache = { ...TEMP_ADMIN_SESSION };
    return sessionCache;
  }

  if (auth.currentUser) {
    sessionCache = await buildSession(auth.currentUser);
    return sessionCache;
  }
  return sessionCache;
}

export async function login(email, password) {
  if (isTemporaryLoginDisabled) {
    sessionCache = { ...TEMP_ADMIN_SESSION };
    return { ok: true, user: sessionCache, skipped: true };
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const session = await buildSession(credential.user);
    sessionCache = session;
    return { ok: true, user: session };
  } catch (error) {
    if (AUTH_INVALID_CREDENTIAL_CODES.has(error?.code)) {
      return { ok: false, message: 'Credenciales inválidas' };
    }

    if (error?.code === 'profile/not-found') {
      return { ok: false, message: PROFILE_MISSING_ERROR_MESSAGE };
    }

    if (String(error?.code || '').startsWith('auth/')) {
      return { ok: false, message: error?.message || 'No se pudo iniciar sesión.' };
    }

    return { ok: false, message: PROFILE_LOAD_ERROR_MESSAGE };
  }
}

export async function logout() {
  if (isTemporaryLoginDisabled) {
    sessionCache = { ...TEMP_ADMIN_SESSION };
    return;
  }

  await signOut(auth);
  sessionCache = null;
}

export async function createUserFromAdminPanel({ nombre, correo, password, role }) {
  const session = await currentSession();
  if (!session || session.role !== 'admin') {
    throw new Error('Solo un admin puede crear usuarios.');
  }

  const normalizedRole = String(role || '').toLowerCase();
  if (!ROLES.has(normalizedRole)) {
    throw new Error('Rol inválido.');
  }

  const { secondaryApp, secondaryAuth } = createSecondaryAuth();
  const credential = await createUserWithEmailAndPassword(secondaryAuth, correo, password);

  await setDoc(doc(db, 'users', credential.user.uid), {
    displayname: nombre,
    email: correo,
    role: normalizedRole,
    isActive: true,
    createdAt: serverTimestamp()
  }, { merge: true });

  await signOut(secondaryAuth);
  await deleteApp(secondaryApp);

  return {
    uid: credential.user.uid,
    email: correo,
    role: normalizedRole,
    displayname: nombre
  };
}
