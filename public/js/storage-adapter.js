import { storage } from "./firebase-config.js";
import { ref, uploadBytes, getDownloadURL, deleteObject }
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

export async function uploadPdf(file, circularId) {
  const path = `circulares/${circularId}/${Date.now()}_${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  const pdfUrl = await getDownloadURL(fileRef);
  return { pdfUrl, storagePath: path };
}

export async function deletePdfByPath(storagePath){
  if (!storagePath) return;
  await deleteObject(ref(storage, storagePath));
}
