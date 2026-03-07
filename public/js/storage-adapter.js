import { storage } from './firebase-config.js';
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';

export async function uploadPdf(file, circularId) {
  const storagePath = `circulares/${circularId}/archivo.pdf`;
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
  return String(name)
    .replace(/\.pdf$/i, '')
    .replace(/^\d{10,}([_\s-]+)/, '')
    .replace(/[_\s-]+/g, ' ')
    .trim();
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
      const normalizedNumero = normalizeFileName(fileRef.name);
      result.push({
        id: circularFolder.name,
        numero: normalizedNumero || 'Circular sin número',
        pdfUrl,
        storagePath: fileRef.fullPath,
        source: 'storage'
      });
    }
  }

  return result;
}
