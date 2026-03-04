import { APP_MODE } from "./app-config.js";
import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

export function listenAuth(cb) {
  if (APP_MODE.auth !== "firebase") throw new Error("auth no está en firebase");
  return onAuthStateChanged(auth, cb);
}

export async function doLogin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function doLogout() {
  await signOut(auth);
}
export function logout() {
  if (APP_MODE.auth === 'local') {
    logoutLocal();
  }
}
