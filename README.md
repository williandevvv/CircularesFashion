# Circulares Fashion (Firebase)

Este proyecto usa **Firebase Authentication + Firestore + Storage** para el login, los usuarios y las circulares.

## Estado actual del login

Se dejó el login reforzado para que funcione incluso cuando existe el usuario en Firebase Auth pero **falta su perfil** en Firestore (`users/{uid}`).

- Si el perfil falta al iniciar sesión, la app lo repara automáticamente.
- Para usuarios por defecto, también restaura el rol correcto (`admin` o `auditor`) cuando corresponde.

---

## Qué tienes que hacer (paso a paso)

## 1) Instalar dependencias de Functions (opcional para despliegue)

```bash
cd functions
npm install
cd ..
```

## 2) Verificar configuración de Firebase

Archivo: `public/js/firebase-config.js`

Debes confirmar que estos valores son de tu proyecto real:

- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

## 3) Verificar modo de aplicación

Archivo: `public/js/app-config.js`

Debe estar así para login normal:

```js
export const APP_MODE = {
  auth: "firebase",
  db: "firebase",
  storage: "firebase",
  tempDisableLogin: false
};
```

> Si pones `tempDisableLogin: true`, se saltará el login y entrará con sesión temporal admin.

## 4) Configurar Authentication en Firebase Console

1. Ve a **Firebase Console > Authentication > Sign-in method**.
2. Activa **Email/Password**.
3. Guarda cambios.

## 5) Configurar Firestore Database

1. Ve a **Firebase Console > Firestore Database**.
2. Crea la base si no existe.
3. Asegúrate de tener colección `users`.

Estructura mínima de cada perfil:

- `users/{uid}`
  - `email: string`
  - `displayname: string`
  - `role: "admin" | "auditor" | "usuario"`
  - `isActive: boolean`

## 6) Configurar reglas de Firestore

Publica `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

## 7) Levantar proyecto local

Desde la raíz:

```bash
python3 -m http.server 8080
```

Abrir:

- `http://localhost:8080/public/index.html`

## 8) Probar login

Usuarios por defecto:

- `admin@circulares.fs` / `Admin123!`
- `auditor@circulares.fs` / `Auditor123!`

Si el usuario existe en Auth pero no en Firestore, ahora se crea el perfil automáticamente al login.

---

## Solución de problemas

- **“Credenciales inválidas”**: correo o contraseña incorrectos.
- **Error de perfil/rol**: revisar Firestore y reglas.
- **No carga datos**: verificar conectividad y que Firestore tenga la colección `circulares`.

---

## Estructura principal

- `/index.html` (raíz): redirige a `/public/index.html`.
- `/public/index.html`: login + buscador de circulares.
- `/public/admin.html`: panel admin.
- `/public/detalle.html`: detalle con visor PDF.
- `/public/js/auth.js`: autenticación, sesión, bootstrap y reparación de perfil.

