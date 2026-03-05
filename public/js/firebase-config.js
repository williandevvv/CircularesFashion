import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { enableIndexedDbPersistence, getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDub4MtWEFkg4GYzo7b9dVrhI-Ms5OF32I",
  authDomain: "circularesfashioncollection.firebaseapp.com",
  projectId: "circularesfashioncollection",
  storageBucket: "circularesfashioncollection.firebasestorage.app",
  messagingSenderId: "395491441213",
  appId: "1:395491441213:web:ceb09a1085e5e13cba0854"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Firestore en este proyecto vive en la base no-default "circularesfs".
export const db = getFirestore(app, "circularesfs");

enableIndexedDbPersistence(db).catch(() => {
  // Puede fallar en multi-pestaña o navegadores sin soporte; no bloqueamos la app.
});

export const storage = getStorage(app);
