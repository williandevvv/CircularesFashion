# Circulares Fashion — Sistema de Gestión de Circulares

Sistema web corporativo para la gestión y distribución de circulares internas. Los colaboradores pueden consultar y buscar circulares; los administradores gestionan circulares, PDFs y usuarios desde un panel dedicado.

---

## Tecnologías

- **Frontend:** HTML5 + CSS3 (responsive, mobile-first), JavaScript ES Modules
- **Backend:** Firebase Web SDK 10.12.5 vía CDN (sin bundler)
  - Firebase Authentication (email/password)
  - Cloud Firestore (base de datos)
  - Firebase Storage (archivos PDF)
- **Hosting:** GitHub Pages (sitio 100% estático)

---

## Estructura del proyecto

```
CircularesFashion/
├── index.html                  ← Redirect a /public/index.html
├── README.md
└── public/
    ├── index.html              ← Login + Dashboard + Buscador
    ├── admin.html              ← Panel admin (solo role=admin)
    ├── detalle.html            ← Vista circular + visor PDF
    ├── css/
    │   └── styles.css
    └── js/
        ├── firebase-config.js  ← Inicializa Firebase + exports
        ├── app-config.js       ← Constantes, helpers, toasts
        ├── auth.js             ← Login, logout, bootstrap admin
        ├── guard-admin.js      ← Protección de admin.html
        ├── db.js               ← CRUD Firestore
        ├── storage.js          ← Upload/delete PDFs
        ├── search.js           ← Filtrado cliente
        ├── admin.js            ← Lógica panel admin
        └── detalle.js          ← Lógica vista detalle
```

---

## Configuración inicial de Firebase

### 1. Authentication
1. Firebase Console → **Authentication** → Sign-in method
2. Habilitar **Correo electrónico/Contraseña**
3. Ir a **Authorized domains** → agregar `tu-usuario.github.io`

### 2. Firestore
1. Firebase Console → **Firestore Database** → Crear base de datos
2. Seleccionar **Modo de producción**
3. Elegir la región más cercana (ej. `us-central1`)
4. Aplicar las reglas de seguridad (ver sección abajo)

### 3. Storage
1. Firebase Console → **Storage** → Comenzar
2. Aplicar las reglas de seguridad (ver sección abajo)

---

## Reglas de seguridad recomendadas

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuth() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    // Circulares: cualquier usuario autenticado puede leer; solo admin escribe
    match /circulares/{id} {
      allow read: if isAuth();
      allow write: if isAdmin();
    }

    // Usuarios: autenticado puede leer; create para bootstrap; solo admin actualiza/elimina
    match /users/{uid} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update, delete: if isAdmin();
    }
  }
}
```

### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /circulares/{allPaths=**} {
      allow read: if request.auth != null;
      allow write, delete: if request.auth != null &&
        firestore.get(
          /databases/(default)/documents/users/$(request.auth.uid)
        ).data.role == "admin";
    }
  }
}
```

---

## Colecciones Firestore

### `users/{uid}`
| Campo | Tipo | Descripción |
|---|---|---|
| email | string | Correo del usuario |
| displayname | string | Nombre para mostrar |
| role | string | `admin` \| `auditor` \| `usuario` |
| isActive | boolean | Permite o bloquea el acceso |
| createdAt | timestamp | Fecha de creación |

### `circulares/{id}`
| Campo | Tipo | Descripción |
|---|---|---|
| numero | string | Ej: `005-26` |
| departamento | string | Departamento emisor |
| fecha | string | Fecha ISO `YYYY-MM-DD` |
| aplicaA | string | A quién aplica la circular |
| pdfUrl | string | URL pública de descarga (Storage) |
| pdfPath | string | Ruta interna en Storage (para eliminar) |
| createdBy | string | UID del admin que la creó |
| createdAt | timestamp | Fecha de creación |
| updatedAt | timestamp | Fecha de última modificación |

---

## Administrador por defecto

Al cargar la app por primera vez, se crea automáticamente un usuario admin:

| Campo | Valor |
|---|---|
| Email | `admin@circulares.fs` |
| Contraseña | `Admin123!` |
| Rol | `admin` |
| Nombre | `Administrador` |

> **Importante:** Cambia la contraseña del admin desde Firebase Console → Authentication después del primer acceso.

El proceso de bootstrap usa una app Firebase secundaria temporal para no interferir con la sesión actual.

---

## Despliegue en GitHub Pages

1. Crea un repositorio llamado `CircularesFashion` en GitHub
2. Sube todos los archivos del proyecto al branch `main`
3. Ve a **Settings → Pages**
4. En **Source** selecciona: `Deploy from a branch` → rama `main` → carpeta `/` (root)
5. Guarda — en unos minutos la URL estará disponible:
   `https://tu-usuario.github.io/CircularesFashion/`

> El `index.html` de la raíz redirige automáticamente a `/public/index.html`.

---

## Ejecución local

```bash
# Python 3
python -m http.server 8080
# Abre: http://localhost:8080/public/index.html

# Node.js
npx serve .
# Abre: http://localhost:3000/public/index.html
```

> Los ES Modules **requieren un servidor HTTP**. No funcionan con `file://`.

---

## Solución de problemas

### `auth/unauthorized-domain`
Agrega el dominio de GitHub Pages en Firebase Console → Authentication → Authorized domains.  
Formato: `tu-usuario.github.io`

### `Missing or insufficient permissions`
Verifica que las reglas de Firestore y Storage estén publicadas correctamente en Firebase Console.

### El PDF no carga en el visor (iframe en blanco)
Firebase Storage requiere configuración CORS. Crea un archivo `cors.json`:
```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```
Luego ejecuta en Google Cloud Shell:
```bash
gsutil cors set cors.json gs://circularesfashioncollection.firebasestorage.app
```

### El admin no se crea automáticamente
Asegúrate de que la regla `allow create: if isAuth()` esté activa en la colección `users`.  
El bootstrap se ejecuta con una app Firebase secundaria antes de mostrar el login.

### La app queda en blanco en GitHub Pages
- Verifica que todos los archivos estén en el repo con la estructura correcta
- Comprueba que `index.html` raíz exista y tenga el script de redirect
- Revisa la consola del navegador (F12) para ver errores de importación

---

## Roles y permisos

| Acción | admin | auditor | usuario |
|---|:---:|:---:|:---:|
| Ver circulares | ✅ | ✅ | ✅ |
| Ver PDF | ✅ | ✅ | ✅ |
| Crear/editar/eliminar circulares | ✅ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Acceder a admin.html | ✅ | ❌ | ❌ |
