import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyDub4MtWEFkg4GYzo7b9dVrhI-Ms5OF32I",
  authDomain: "circularesfashioncollection.firebaseapp.com",
  projectId: "circularesfashioncollection",
  storageBucket: "circularesfashioncollection.firebasestorage.app",
  messagingSenderId: "395491441213",
  appId: "1:395491441213:web:ceb09a1085e5e13cba0854",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export {
  auth,
  db,
  storage,
  functions,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  ref,
  uploadBytes,
  getDownloadURL,
  updateDoc,
  doc,
  orderBy,
  httpsCallable,
};
