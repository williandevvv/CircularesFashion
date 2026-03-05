import { db } from './firebase-config.js';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const CIRCULARES_COLLECTION = 'circulares';

function normalizeCircularData(data = {}) {
  return {
    ...data,
    numero: data.numero ?? data.Numero ?? '',
    departamento: data.departamento ?? data.Departamento ?? '',
    fecha: data.fecha ?? data.Fecha ?? '',
    pdfUrl: data.pdfUrl ?? data.pdfURL ?? data.linkPdf ?? ''
  };
}

function toCircular(snapshot) {
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...normalizeCircularData(snapshot.data()) };
}

export function generateCircularId() {
  return doc(collection(db, CIRCULARES_COLLECTION)).id;
}

export async function createCircular(data, circularId = generateCircularId()) {
  const ref = doc(db, CIRCULARES_COLLECTION, circularId);
  await setDoc(ref, {
    ...data,
    createdAt: data.createdAt ?? serverTimestamp(),
    updatedAt: data.updatedAt ?? serverTimestamp()
  });
  return circularId;
}

export async function updateCircular(id, data) {
  const ref = doc(db, CIRCULARES_COLLECTION, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function deleteCircular(id) {
  await deleteDoc(doc(db, CIRCULARES_COLLECTION, id));
}

export async function listCirculares() {
  const q = query(collection(db, CIRCULARES_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...normalizeCircularData(item.data()) }));
}

export async function getCircularById(id) {
  if (!id) return null;
  const snapshot = await getDoc(doc(db, CIRCULARES_COLLECTION, id));
  return toCircular(snapshot);
}
