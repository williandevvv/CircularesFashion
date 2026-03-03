const DB_NAME = 'cf_pdf_store';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB.'));
  });
}

function runRequest(mode, action) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = action(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falló la operación con IndexedDB.'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error || new Error('No se pudo completar la transacción.'));
  }));
}

export async function saveLocalPdf(key, file) {
  if (!key || !file) return;
  await runRequest('readwrite', (store) => store.put(file, key));
}

export async function getLocalPdf(key) {
  if (!key) return null;
  const result = await runRequest('readonly', (store) => store.get(key));
  return result instanceof Blob ? result : null;
}
