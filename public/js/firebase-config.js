import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  inMemoryPersistence,
  indexedDBLocalPersistence,
  initializeAuth
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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

let authInstance;

try {
  authInstance = initializeAuth(app, {
    persistence: [
      indexedDBLocalPersistence,
      browserLocalPersistence,
      browserSessionPersistence,
      inMemoryPersistence
    ]
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;

// Firestore en este proyecto vive en la base no-default "circularesfs".
export const db = getFirestore(app, "circularesfs");

export const firestorePersistenceReady = (async () => {
  try {
    await enableMultiTabIndexedDbPersistence(db);
    return 'multi-tab';
  } catch (multiTabError) {
    const code = multiTabError?.code;

    if (code === 'unimplemented') {
      console.warn('Firestore persistence no soportada en este navegador. Se usará memoria.', multiTabError);
      return 'memory';
    }

    try {
      await enableIndexedDbPersistence(db);
      return 'single-tab';
    } catch (singleTabError) {
      console.warn('Firestore persistence no disponible. La app seguirá funcionando sin caché local.', singleTabError);
      return 'memory';
    }
  }
})();

export const storage = getStorage(app);
