import { storage } from './firebase-config.js';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';

export async function uploadPdf(file, circularId) {
  const safeName = String(file?.name || 'archivo.pdf').replace(/\s+/g, '_');
  const storagePath = `circulares/${circularId}/${Date.now()}_${safeName}`;
  const fileRef = ref(storage, storagePath);

  await uploadBytes(fileRef, file, { contentType: 'application/pdf' });
  const pdfUrl = await getDownloadURL(fileRef);

  return { pdfUrl, storagePath };
}

export async function deletePdfByPath(storagePath) {
  if (!storagePath) return;
  await deleteObject(ref(storage, storagePath));
}
