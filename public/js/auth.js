// ============================================================
// AUTH — login, logout, bootstrap admin, perfil
// ============================================================
import { auth, db, firebaseConfig } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { APP_CONFIG } from "./app-config.js";

// ── Bootstrap admin por defecto ──────────────────────────────
export async function bootstrapAdmin() {
  try {
    const secondaryName = "bootstrap_" + Date.now();
    const secApp  = initializeApp(firebaseConfig, secondaryName);
    const secAuth = getAuth(secApp);
    let uid = null;

    try {
      const cred = await createUserWithEmailAndPassword(
        secAuth, APP_CONFIG.adminEmail, APP_CONFIG.adminPassword
      );
      uid = cred.user.uid;
    } catch (e) {
      if (e.code !== "auth/email-already-in-use") console.warn("Bootstrap create:", e.message);
    }

    if (uid) {
      const ref  = doc(db, "users", uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          email: APP_CONFIG.adminEmail,
          displayname: APP_CONFIG.adminDisplayname,
          role: "admin",
          isActive: true,
          createdAt: serverTimestamp()
        });
      }
    }
    await secAuth.signOut();
  } catch (err) {
    console.warn("Bootstrap (non-fatal):", err.message);
  }
}

// ── Login ─────────────────────────────────────────────────────
export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ── Logout ────────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
}

// ── Obtener perfil Firestore ─────────────────────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() };
}

// ── Asegurar doc de usuario en primer login ──────────────────
export async function ensureUserDoc(user) {
  const ref  = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email,
      displayname: user.displayName || user.email.split("@")[0],
      role: "usuario",
      isActive: true,
      createdAt: serverTimestamp()
    });
  }
  return (await getDoc(ref)).data();
}

// ── Auth observer ─────────────────────────────────────────────
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
