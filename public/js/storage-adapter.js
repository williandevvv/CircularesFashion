import { storage } from './firebase-config.js';
import {
  deleteObject,
  getDownloadURL,
  listAll,
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

function normalizeFileName(name = '') {
  const noTimestamp = name.replace(/^\d+_/, '');
  return noTimestamp.replace(/\.pdf$/i, '').replace(/_/g, ' ').trim();
}

export async function listCircularesFromStorage() {
  const rootRef = ref(storage, 'circulares');
  const root = await listAll(rootRef);
  const result = [];

  for (const circularFolder of root.prefixes) {
    const folderItems = await listAll(circularFolder);
    for (const fileRef of folderItems.items) {
      if (!/\.pdf$/i.test(fileRef.name)) continue;
      const pdfUrl = await getDownloadURL(fileRef);
      result.push({
        id: circularFolder.name,
        numero: normalizeFileName(fileRef.name) || circularFolder.name,
        pdfUrl,
        storagePath: fileRef.fullPath,
        source: 'storage'
      });
    }
  }

  return result;
}
