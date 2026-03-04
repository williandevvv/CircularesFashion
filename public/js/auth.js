import { auth, db } from './firebase-config.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

let sessionCache = null;

const AUTH_INVALID_CREDENTIAL_CODES = new Set(['auth/wrong-password', 'auth/user-not-found']);
const PROFILE_LOAD_ERROR_MESSAGE =
  'No se pudo cargar el perfil del usuario (rol). Revisa conexión, reglas o que exista el doc users/{uid}.';
const PROFILE_MISSING_ERROR_MESSAGE =
  'Tu usuario no tiene perfil en Firestore (users/{uid}). Pide al admin que te cree el rol.';

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

async function buildSession(user) {
  if (!user) return null;

  const userDoc = await loadUserProfileDoc(user.uid);

  if (!userDoc.exists()) {
    const missingProfileError = new Error(PROFILE_MISSING_ERROR_MESSAGE);
    missingProfileError.code = 'profile/not-found';
    throw missingProfileError;
  }

  const profile = userDoc.data();

  return {
    uid: user.uid,
    email: user.email || profile.email || '',
    role: profile.role || 'user',
    displayName: profile.displayName || user.displayName || '',
    isActive: profile.isActive !== false
  };
}

export function listenSession(callback) {
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
  if (auth.currentUser) {
    sessionCache = await buildSession(auth.currentUser);
    return sessionCache;
  }
  return sessionCache;
}

export async function login(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    const session = await currentSession();
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
  await signOut(auth);
  sessionCache = null;
}
