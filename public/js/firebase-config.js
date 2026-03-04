import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDub4MtWEFkg4GYzo7b9dVrhI-Ms5OF32I",
  authDomain: "circularesfashioncollection.firebaseapp.com",
  projectId: "circularesfashioncollection",
  storageBucket: "circularesfashioncollection.firebasestorage.app",
  messagingSenderId: "395491441213",
  appId: "1:395491441213:web:ceb09a1085e5e13cba0854"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// 🔥 esto evita el WebChannel Listen/channel que te está dando 400
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
});

export const storage = getStorage(app);
