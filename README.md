# Plataforma Interna de Gestión de Circulares

Aplicación web corporativa para centralizar la carga, consulta y trazabilidad de circulares empresariales en PDF. La solución utiliza Firebase Authentication, Firestore, Storage, Cloud Functions y Hosting para ofrecer un flujo seguro de punta a punta.

## Funcionalidades principales

- Inicio de sesión con Firebase Authentication.
- Control de acceso por roles (`admin`, `auditor`, `bodega`, `tienda`) con validación en frontend y backend.
- Panel administrativo para crear circulares con metadatos y PDF.
- Extracción automática de códigos desde PDF con Cloud Functions + `pdf-parse`.
- Generación automática de tabla editable por circular:
  - Código
  - Descripción
  - Precio anterior
  - Precio nuevo
  - Observaciones
- Búsqueda inteligente:
  - Si el término parece número de circular (ej: `005-26`), busca por `numero`.
  - En otros casos, busca por código dentro del arreglo `codigos`.
- Filtro por departamento y visualización en tarjetas.

---

## Arquitectura del sistema

1. El usuario `admin` crea una circular en `admin.html`.
2. El PDF se sube a Firebase Storage (`/circulares/...`).
3. El frontend invoca la Cloud Function `extractCircularCodes` enviando `pdfUrl`.
4. La función descarga el PDF, extrae texto y aplica regex:

```regex
\b[A-Z]{2,}[A-Z0-9]*(?:-[A-Z0-9]+)*\b
```

5. Se filtran palabras comunes (`MOTIVO`, `DEPTO`, `FECHA`, `CIRCULAR`, etc.) y se devuelve un arreglo único de códigos.
6. Se guarda la circular en Firestore (`circulares/{id}`) con `codigos[]` y `tabla[]` generada automáticamente.

---

## Estructura del proyecto

```text
/public
  index.html
  admin.html
  /css
    styles.css
  /js
    auth.js
    admin.js
    search.js
    firebase-config.js
/functions
  index.js
  package.json
firebase.json
firestore.rules
storage.rules
.firebaserc
README.md
```

---

## Configuración inicial de Firebase

### 1) Crear proyecto Firebase

- Crear un proyecto en Firebase Console.
- Copiar el `projectId`.
- Actualizar `.firebaserc` y `public/js/firebase-config.js` con los datos reales del proyecto.

### 2) Habilitar Authentication

- Ir a **Authentication > Sign-in method**.
- Habilitar `Email/Password`.
- Crear usuarios internos (admin/auditor/bodega/tienda).

### 3) Crear Firestore

- Ir a **Firestore Database**.
- Crear la base en modo producción.
- Aplicar las reglas de `firestore.rules`.

### 4) Configurar Storage

- Ir a **Storage**.
- Inicializar bucket.
- Aplicar las reglas de `storage.rules`.

---

## Reglas sugeridas

### Firestore (`firestore.rules`)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isAdmin() { return isAuthenticated() && request.auth.token.role == 'admin'; }

    match /circulares/{docId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
  }
}
```

### Storage (`storage.rules`)

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAuthenticated() { return request.auth != null; }
    function isAdmin() { return isAuthenticated() && request.auth.token.role == 'admin'; }

    match /circulares/{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

---

## Cloud Functions

### Instalar dependencias

```bash
cd functions
npm install
```

### Desplegar funciones

```bash
firebase deploy --only functions
```

Funciones incluidas:

- `extractCircularCodes` (Callable): extrae códigos de PDF para circular.
- `setAdminRole` (Callable): asigna claims de rol (`admin`, `auditor`, `bodega`, `tienda`).

---

## Asignar rol admin (custom claims)

Opción recomendada: usar `setAdminRole` desde un usuario ya administrador.

Ejemplo de payload:

```json
{
  "uid": "UID_DEL_USUARIO",
  "role": "admin"
}
```

También puede asignarse por script con `firebase-admin` desde un entorno seguro interno.

> Nota operativa: después de cambiar claims, el usuario debe renovar token (cerrar sesión y volver a entrar).

---

## Deploy de Hosting

```bash
firebase deploy --only hosting
```

Para desplegar todo (hosting, reglas y funciones):

```bash
firebase deploy
```

---

## Colección principal

`circulares/{id}`

- `numero`
- `departamento`
- `fecha`
- `aplicaA`
- `pdfUrl`
- `codigos[]`
- `tabla[]`
- `createdAt`

Opcional para índices por código:

`codigoIndex/{codigo}/refs/{circularId}`

---

## Notas técnicas

- La validación de rol se ejecuta en frontend (UI/rutas) y backend (Cloud Functions + rules).
- `/admin` queda protegido por guard de rol; usuarios no admin se redirigen a dashboard.
- La búsqueda combina estrategia por patrón de número vs. búsqueda en `array-contains` para códigos.
- La interfaz está diseñada con layout corporativo, sidebar y comportamiento responsivo.
