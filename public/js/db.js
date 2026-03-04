// ============================================================
// DB — CRUD Firestore para circulares y usuarios
// ============================================================
import { db } from "./firebase-config.js";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const CIRC  = "circulares";
const USERS = "users";

// ── Circulares ────────────────────────────────────────────────
export async function getCirculares() {
  const q    = query(collection(db, CIRC), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getCircular(id) {
  const snap = await getDoc(doc(db, CIRC, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createCircular(data) {
  return addDoc(collection(db, CIRC), {
    ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
}

export async function updateCircular(id, data) {
  await updateDoc(doc(db, CIRC, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteCircular(id) {
  await deleteDoc(doc(db, CIRC, id));
}

// ── Usuarios ──────────────────────────────────────────────────
export async function getUsers() {
  const snap = await getDocs(collection(db, USERS));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateUserDoc(uid, data) {
  await updateDoc(doc(db, USERS, uid), data);
}

export async function createUserDoc(uid, data) {
  await setDoc(doc(db, USERS, uid), { ...data, createdAt: serverTimestamp() });
}
