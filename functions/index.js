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

const DEFAULT_USERS = {
  admin: {
    role: "admin",
    email: process.env.DEFAULT_ADMIN_EMAIL || "admin@circulares.local",
    password: process.env.DEFAULT_ADMIN_PASSWORD || "Admin1234!",
    displayName: "Administrador Default",
  },
  auditor: {
    role: "auditor",
    email: process.env.DEFAULT_AUDITOR_EMAIL || "auditor@circulares.local",
    password: process.env.DEFAULT_AUDITOR_PASSWORD || "Auditor1234!",
    displayName: "Auditor Default",
  },
};

async function createOrUpdateDefaultUser(userConfig) {
  const { email, password, displayName, role } = userConfig;
  let userRecord;

  try {
    userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(userRecord.uid, { password, displayName });
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }

    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
  }

  await admin.auth().setCustomUserClaims(userRecord.uid, { role });

  return {
    uid: userRecord.uid,
    email,
    role,
  };
}

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

exports.createDefaultUsers = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Solo admin puede crear usuarios por defecto.");
  }

  const { bootstrapSecret } = data || {};
  const expectedSecret = process.env.DEFAULT_USERS_SECRET;

  if (expectedSecret && bootstrapSecret !== expectedSecret) {
    throw new functions.https.HttpsError("permission-denied", "Secret de bootstrap inválido.");
  }

  try {
    const [adminUser, auditorUser] = await Promise.all([
      createOrUpdateDefaultUser(DEFAULT_USERS.admin),
      createOrUpdateDefaultUser(DEFAULT_USERS.auditor),
    ]);

    return {
      message: "Usuarios por defecto listos.",
      users: [adminUser, auditorUser],
    };
  } catch (error) {
    console.error("Error creando usuarios por defecto", error);
    throw new functions.https.HttpsError("internal", "No fue posible crear los usuarios por defecto.");
  }
});
