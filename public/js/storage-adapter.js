import { APP_MODE } from './app-config.js';

export async function savePdf(file) {
  if (!file) {
    return { pdfUrl: null, storagePath: null };
  }

  if (APP_MODE.storage === 'local') {
    return { pdfUrl: null, storagePath: null };
  }

  return { pdfUrl: null, storagePath: null };
}
