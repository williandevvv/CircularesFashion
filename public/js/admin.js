import {
  db,
  storage,
  functions,
  addDoc,
  collection,
  serverTimestamp,
  ref,
  uploadBytes,
  getDownloadURL,
  httpsCallable,
} from "./firebase-config.js";
import { guardAdminRoute, bindLogout } from "./auth.js";

const form = document.getElementById("circularForm");
const statusMessage = document.getElementById("statusMessage");

const extractCodes = httpsCallable(functions, "extractCircularCodes");

const toTableRows = (codes) =>
  codes.map((codigo) => ({
    codigo,
    descripcion: "",
    precioAnterior: "",
    precioNuevo: "",
    observaciones: "",
  }));

const uploadPdf = async (file, numero) => {
  const safeName = `${Date.now()}-${numero}-${file.name}`.replace(/\s+/g, "_");
  const storageRef = ref(storage, `circulares/${safeName}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
};

const createCircular = async (payload) => {
  return addDoc(collection(db, "circulares"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
};

(async () => {
  const session = await guardAdminRoute();
  if (!session) return;
  bindLogout();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusMessage.textContent = "Procesando circular...";

    try {
      const numero = document.getElementById("numero").value.trim();
      const departamento = document.getElementById("departamento").value.trim();
      const fecha = document.getElementById("fecha").value;
      const aplicaA = document.getElementById("aplicaA").value;
      const pdfFile = document.getElementById("pdf").files[0];
      if (!pdfFile) throw new Error("Debes adjuntar un archivo PDF.");

      const pdfUrl = await uploadPdf(pdfFile, numero);
      const extraction = await extractCodes({ pdfUrl });
      const codigos = extraction.data.codes || [];

      await createCircular({
        numero,
        departamento,
        fecha,
        aplicaA,
        pdfUrl,
        codigos,
        tabla: toTableRows(codigos),
      });

      statusMessage.textContent = `Circular creada. Códigos detectados: ${codigos.length}`;
      form.reset();
    } catch (error) {
      console.error(error);
      statusMessage.textContent = `Error: ${error.message}`;
    }
  });
})();
