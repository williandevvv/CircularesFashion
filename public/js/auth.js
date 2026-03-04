import { auth, db } from './firebase-config.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

let sessionCache = null;

async function buildSession(user) {
  if (!user) return null;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const profile = userDoc.exists() ? userDoc.data() : {};

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
    return { ok: false, message: error?.message || 'No se pudo iniciar sesión.' };
  }
}

export async function logout() {
  await signOut(auth);
  sessionCache = null;
}
