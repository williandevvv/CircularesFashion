// ============================================================
// STORAGE — subida y eliminación de PDFs en Firebase Storage
// ============================================================
import { storage } from "./firebase-config.js";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

export function uploadPDF(file, circularId, onProgress) {
  return new Promise((resolve, reject) => {
    const ts       = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path     = `circulares/${circularId}/${ts}_${safeName}`;
    const sRef     = ref(storage, path);
    const task     = uploadBytesResumable(sRef, file, { contentType: "application/pdf" });

    task.on("state_changed",
      snap => { if (onProgress) onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)); },
      err  => reject(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({ url, path });
      }
    );
  });
}

export async function deletePDF(path) {
  if (!path) return;
  try { await deleteObject(ref(storage, path)); }
  catch (e) { console.warn("Storage delete (non-fatal):", e.message); }
}
