const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const pdfParse = require("pdf-parse");

admin.initializeApp();

const CODE_REGEX = /\b[A-Z]{2,}[A-Z0-9]*(?:-[A-Z0-9]+)*\b/g;
const STOP_WORDS = new Set([
  "MOTIVO",
  "DEPTO",
  "DEPARTAMENTO",
  "FECHA",
  "CIRCULAR",
  "TODAS",
  "MALL",
  "CENTRO",
  "TIENDAS",
  "APLICA",
  "PARA",
  "LISTA",
  "CODIGO",
  "CODIGOS",
]);

exports.extractCircularCodes = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Usuario no autenticado.");
  }

  if (context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Solo el administrador puede extraer códigos.");
  }

  const { pdfUrl } = data || {};
  if (!pdfUrl) {
    throw new functions.https.HttpsError("invalid-argument", "Debes enviar la URL del PDF.");
  }

  try {
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    const parsed = await pdfParse(response.data);
    const rawCodes = (parsed.text || "").toUpperCase().match(CODE_REGEX) || [];

    const filtered = [...new Set(rawCodes.filter((token) => !STOP_WORDS.has(token) && token.length >= 4))];
    return { codes: filtered };
  } catch (error) {
    console.error("Error procesando PDF", error);
    throw new functions.https.HttpsError("internal", "No fue posible procesar el PDF.");
  }
});

exports.setAdminRole = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Solo admin puede asignar roles.");
  }

  const { uid, role } = data || {};
  const allowed = ["admin", "auditor", "bodega", "tienda"];

  if (!uid || !allowed.includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "UID o rol inválido.");
  }

  await admin.auth().setCustomUserClaims(uid, { role });
  return { message: `Rol ${role} asignado a ${uid}` };
});
