// AUTH — login, logout, perfil
import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() };
  } catch (e) {
    console.warn("getUserProfile:", e.message);
    return null;
  }
}

export async function ensureUserDoc(user) {
  try {
    const ref  = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        email:       user.email,
        displayname: user.displayName || user.email.split("@")[0],
        role:        "usuario",
        isActive:    true,
        createdAt:   serverTimestamp()
      });
    }
    return (await getDoc(ref)).data();
  } catch (e) {
    console.warn("ensureUserDoc:", e.message);
    return null;
  }
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
