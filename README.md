# Circulares Fashion (Firebase)

Este proyecto usa Firebase Authentication + Firestore + Storage para gestionar acceso, metadatos de circulares y PDFs.

## Estructura

- `/index.html` (raíz): redirige a `/public/index.html`.
- `/public/index.html`: login + buscador de circulares.
- `/public/admin.html`: panel para crear/editar/eliminar circulares (solo admin).
- `/public/detalle.html`: vista de detalle con visor PDF (`iframe`).

## Configuración Firebase

En `public/js/app-config.js` el modo está en Firebase:

```js
export const APP_MODE = {
  auth: "firebase",
  db: "firebase",
  storage: "firebase",
  tempDisableLogin: true
};
```

> `tempDisableLogin: true` habilita acceso temporal sin login (sesión admin local) para priorizar carga de circulares. Volver a `false` para restablecer autenticación normal.

La configuración base está en `public/js/firebase-config.js` usando SDK modular CDN.

## Modelo de datos

### Firestore

Colección `circulares/{id}`:

- `numero`
- `departamento`
- `fecha`
- `aplicaA`
- `codigos`
- `pdfUrl`
- `storagePath`
- `createdAt`
- `updatedAt`
- `createdBy`

Colección `users/{uid}`:

- `role`
- `email`
- `isActive`
- `displayName`

## Rol admin (seed inicial)

Asegura que exista este documento en Firestore para habilitar acceso a `admin.html`:

- `users/hpcMP8pI8kUOMhLzdRnBqoBssjy2`
- `role = "admin"`

El guard de admin valida por rol desde Firestore (no por UID hardcodeado).

## Flujo

1. Iniciar sesión en `/public/index.html`.
2. Si `users/{uid}.role === "admin"`, se habilita botón Admin.
3. En Admin:
   - crear/editar circular,
   - subir/reemplazar PDF en Storage,
   - guardar `pdfUrl` y `storagePath` en Firestore,
   - eliminar circular y su PDF en Storage.
4. En Detalle:
   - se carga el documento desde Firestore,
   - se muestra PDF real en `iframe`,
   - botón **Abrir PDF** en nueva pestaña.

## Ejecutar localmente

```bash
python3 -m http.server 8080
```

Abrir: `http://localhost:8080/public/index.html`.
