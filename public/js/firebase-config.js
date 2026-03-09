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
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager
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
let firestoreCacheMode = 'persistent-multi-tab';

let firestoreInstance;

try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, "circularesfs");
} catch (error) {
  console.warn(
    'Firestore persistence no disponible. Se usará caché en memoria para mantener la app operativa.',
    error
  );

  firestoreCacheMode = 'memory';
  firestoreInstance = initializeFirestore(app, {
    localCache: memoryLocalCache()
  }, "circularesfs");
}

export const db = firestoreInstance;
export const firestorePersistenceReady = Promise.resolve(firestoreCacheMode);

export const storage = getStorage(app);
