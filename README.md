# Circulares Fashion (modo local)

Este proyecto está preparado para correr como sitio estático en GitHub Pages y empezar en modo 100% local (sin Firebase por ahora).

## Estructura

- `/index.html` (raíz): solo redirige automáticamente a `/public/index.html`.
- `/public/index.html`: login + buscador de circulares.
- `/public/admin.html`: panel para crear circulares (solo admin).
- `/public/detalle.html`: vista de detalle con tabla editable por circular.

## Cómo funciona el modo local

- La autenticación usa `localStorage`.
- La sesión activa también se guarda en `localStorage`.
- Las circulares se guardan en `localStorage` bajo una base local simple.
- Si en `admin.html` el usuario no tiene rol `admin`, se redirige de inmediato a `index.html`.

## Usuarios por defecto

Se inicializan automáticamente estos usuarios:

1. `admin@circulares.local` / `Admin123!` / rol `admin`
2. `auditor@circulares.local` / `Auditor123!` / rol `auditor`

### Cambiar contraseñas

Las contraseñas están en el almacenamiento local (`cf_users`).
Opciones rápidas para cambiarlas:

- Abrir DevTools → Application/Storage → `localStorage` y editar `cf_users`.
- O usar la función `updateUserPassword(email, newPassword)` en `public/js/local-auth.js` desde consola importando el módulo.

## Flujo de uso

1. Entrar por `public/index.html`.
2. Iniciar sesión.
3. Si el usuario es admin, puede ir al panel Admin y crear circulares.
4. En Admin:
   - Completa datos de la circular.
   - Opcionalmente pega un link externo de PDF.
   - Opcionalmente sube un PDF local para extraer códigos automáticamente con PDF.js.
5. En el buscador principal puedes buscar por:
   - código (`COJIN130`, `FC-25-0904`, etc.),
   - número de circular (`005-26`),
   - departamento.
6. En detalle se puede editar la tabla y guardar cambios.

## Despliegue en GitHub Pages

1. Sube este repo a GitHub.
2. En **Settings → Pages**, configura como fuente la rama principal (`main` o la que uses) y carpeta raíz (`/`).
3. GitHub Pages abrirá `index.html` en la raíz.
4. Ese archivo redirige automáticamente a `/public/index.html`.

## Preparado para migrar a Firebase

El archivo `public/js/app-config.js` ya trae switches:

```js
export const APP_MODE = { auth: 'local', db: 'local', storage: 'local' };
```

### Pasos para migrar después

1. Crear proyecto en Firebase.
2. Activar Authentication y Firestore.
3. (Opcional) Activar Storage.
   - Nota: para aprovisionar bucket de Storage normalmente se requiere plan Blaze.
4. Cambiar `APP_MODE` a `firebase` en los módulos necesarios (`auth`, `db`, `storage`).
5. Reemplazar `local-auth` por Firebase Auth + lógica de roles.
6. Completar `storage-adapter.js` para subir PDF y devolver `downloadURL`.

## Ejecutar localmente

Puedes abrir directamente `public/index.html`, pero recomendado usar un servidor estático mínimo para evitar limitaciones del navegador con módulos:

```bash
python3 -m http.server 8080
```

Luego abre: `http://localhost:8080/public/index.html`.
