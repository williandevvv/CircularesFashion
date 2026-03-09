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

export async function listCircularesFromStorage(options = {}) {
  const onlyIds = Array.isArray(options.onlyIds) && options.onlyIds.length
    ? new Set(options.onlyIds.filter(Boolean).map(String))
    : null;

  const rootRef = ref(storage, 'circulares');
  const root = await listAll(rootRef);
  const folderPromises = root.prefixes
    .filter((folder) => !onlyIds || onlyIds.has(folder.name))
    .map(async (circularFolder) => {
      const folderItems = await listAll(circularFolder);
      const pdfRef = folderItems.items.find((item) => /\.pdf$/i.test(item.name));
      if (!pdfRef) return null;

      const pdfUrl = await getDownloadURL(pdfRef);
      const normalizedNumero = normalizeFileName(pdfRef.name);
      return {
        id: circularFolder.name,
        numero: normalizedNumero || 'Circular sin número',
        pdfUrl,
        storagePath: pdfRef.fullPath,
        source: 'storage'
      };
    });

  const result = await Promise.all(folderPromises);

  return result.filter(Boolean);
}
