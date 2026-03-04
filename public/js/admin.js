import { extractCodesFromPdf } from './pdf-extract.js';
import {
  createCircular,
  deleteCircular,
  generateCircularId,
  getCircularById,
  listCirculares,
  updateCircular
} from './db-firebase.js';
import { deletePdfByPath, uploadPdf } from './storage-adapter.js';
import { clearAdminAccess, validateAdminPassword } from './admin-access.js';

const form = document.getElementById('circular-form');
const formTitle = document.getElementById('formTitle');
const submitButton = document.getElementById('submitButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const pdfFileInput = document.getElementById('pdfFile');
const pdfStatus = document.getElementById('pdfStatus');
const codigosInput = document.getElementById('codigos');
const circularesList = document.getElementById('circularesList');
const adminMessage = document.getElementById('adminMessage');
const btnLogout = document.getElementById('btnLogout');
const menuToggle = document.querySelector('.mobile-menu-toggle');

let editingId = null;
let cachedCirculares = [];

function confirmAdminPassword(actionLabel) {
  const password = window.prompt(`Ingresa la clave para ${actionLabel}:`);
  if (password === null) return false;
  const valid = validateAdminPassword(password.trim());
  if (!valid) {
    alert('Clave incorrecta.');
  }
  return valid;
}

function normalizeCodes(rawCodes = []) {
  return [...new Set(rawCodes
    .map((code) => String(code || '').trim().toUpperCase())
    .filter((code) => code.length >= 2))];
}

function parseCodesFromText(value = '') {
  return normalizeCodes(String(value)
    .split(',')
    .map((code) => code.trim()));
}

function showMessage(message = '') {
  adminMessage.textContent = message;
}

function updateEditUI() {
  const isEditing = editingId !== null;
  formTitle.textContent = isEditing ? 'Editar circular' : 'Nueva circular';
  submitButton.textContent = isEditing ? 'Guardar cambios' : 'Crear circular';
  cancelEditButton.classList.toggle('hidden', !isEditing);
  pdfFileInput.required = !isEditing;
}

function clearFormState() {
  form.reset();
  pdfStatus.textContent = 'Debes subir un PDF para guardar la circular.';
}

function cancelEdit() {
  editingId = null;
  clearFormState();
  updateEditUI();
}

function startEdit(id) {
  const circular = cachedCirculares.find((item) => item.id === id);
  if (!circular) {
    showMessage('No se encontró la circular a editar.');
    return;
  }

  editingId = id;
  form.numero.value = circular.numero || '';
  form.departamento.value = circular.departamento || '';
  form.fecha.value = circular.fecha || '';
  form.aplicaA.value = circular.aplicaA || '';
  codigosInput.value = Array.isArray(circular.codigos) ? circular.codigos.join(', ') : '';
  pdfFileInput.value = '';
  pdfStatus.textContent = circular.pdfUrl
    ? 'PDF actual cargado. Si eliges otro archivo, se reemplazará en Storage.'
    : 'Esta circular no tiene PDF asociado. Debes seleccionar uno para guardar.';
  updateEditUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handlePdfSelection(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    alert('Solo se permiten archivos PDF.');
    event.target.value = '';
    return;
  }

  if (pdfStatus) {
    pdfStatus.textContent = 'Leyendo PDF para detectar códigos...';
  }

  try {
    const detectedCodes = normalizeCodes(await extractCodesFromPdf(file));
    const mergedCodes = normalizeCodes([
      ...parseCodesFromText(codigosInput?.value || ''),
      ...detectedCodes
    ]);

    codigosInput.value = mergedCodes.join(', ');

    pdfStatus.textContent = detectedCodes.length
      ? `PDF listo. Se detectaron ${detectedCodes.length} código(s).`
      : 'PDF listo. No se detectaron códigos automáticamente.';
  } catch (error) {
    console.error(error);
    pdfStatus.textContent = 'PDF seleccionado. No se pudieron extraer códigos, puedes escribirlos manualmente.';
  }
}

function renderCircularesList() {
  if (!cachedCirculares.length) {
    circularesList.innerHTML = '<p class="muted">No hay circulares guardadas.</p>';
    return;
  }

  const rows = cachedCirculares.map((circular) => {
    const codigosCount = Array.isArray(circular.codigos) ? circular.codigos.length : 0;
    return `
      <tr>
        <td data-label="Número">${circular.numero || '-'}</td>
        <td data-label="Departamento">${circular.departamento || '-'}</td>
        <td data-label="Fecha">${circular.fecha || '-'}</td>
        <td data-label="Aplica a">${circular.aplicaA || '-'}</td>
        <td data-label="Códigos">${codigosCount}</td>
        <td data-label="PDF">${circular.pdfUrl ? 'Cargado' : '-'}</td>
        <td data-label="Acciones">
          <div class="actions">
            <a class="btn btn-secondary" href="./detalle.html?id=${encodeURIComponent(circular.id)}">Ver</a>
            <button class="btn" type="button" data-edit-id="${circular.id}">Editar</button>
            <button class="btn btn-danger" type="button" data-delete-id="${circular.id}">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  circularesList.innerHTML = `
    <div class="table-wrap">
      <table class="responsive-table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Departamento</th>
            <th>Fecha</th>
            <th>Aplica a</th>
            <th>Códigos</th>
            <th>PDF</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function refreshCirculares() {
  cachedCirculares = await listCirculares();
  renderCircularesList();
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const action = editingId ? 'editar la circular' : 'agregar la circular';
  if (!confirmAdminPassword(action)) return;

  const data = new FormData(form);
  const numero = String(data.get('numero') || '').trim();
  const departamento = String(data.get('departamento') || '').trim();
  const fecha = String(data.get('fecha') || '').trim();
  const aplicaA = String(data.get('aplicaA') || '').trim();
  const codigos = parseCodesFromText(String(data.get('codigos') || ''));
  const pdfFile = pdfFileInput?.files?.[0] || null;

  if (!numero || !departamento || !fecha || !aplicaA) {
    alert('Completa los campos obligatorios.');
    return;
  }

  if (pdfFile && pdfFile.type !== 'application/pdf') {
    alert('Solo se permiten archivos PDF.');
    return;
  }

  try {
    if (editingId) {
      const current = await getCircularById(editingId);
      if (!current) {
        alert('La circular que intentas editar ya no existe.');
        cancelEdit();
        await refreshCirculares();
        return;
      }

      let nextPdfUrl = current.pdfUrl || null;
      let nextStoragePath = current.storagePath || null;

      if (pdfFile) {
        const uploaded = await uploadPdf(pdfFile, editingId);
        nextPdfUrl = uploaded.pdfUrl;
        nextStoragePath = uploaded.storagePath;
        if (current.storagePath) {
          await deletePdfByPath(current.storagePath).catch((error) => {
            console.warn('No se pudo borrar el PDF anterior.', error);
          });
        }
      }

      if (!nextPdfUrl) {
        alert('Debes mantener o subir un PDF para la circular.');
        return;
      }

      await updateCircular(editingId, {
        numero,
        departamento,
        fecha,
        aplicaA,
        codigos,
        pdfUrl: nextPdfUrl,
        storagePath: nextStoragePath
      });

      showMessage('Cambios guardados.');
      cancelEdit();
      await refreshCirculares();
      return;
    }

    if (!pdfFile) {
      alert('Debes seleccionar un PDF para crear la circular.');
      return;
    }

    const circularId = generateCircularId();
    const uploaded = await uploadPdf(pdfFile, circularId);

    await createCircular({
      numero,
      departamento,
      fecha,
      aplicaA,
      codigos,
      pdfUrl: uploaded.pdfUrl,
      storagePath: uploaded.storagePath,
      createdBy: 'admin-clave'
    }, circularId);

    showMessage('Circular guardada.');
    clearFormState();
    await refreshCirculares();
  } catch (error) {
    console.error(error);
    alert('No se pudo guardar la circular.');
  }
});

pdfFileInput?.addEventListener('change', handlePdfSelection);

circularesList?.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const editId = target.dataset.editId;
  if (editId) {
    if (!confirmAdminPassword('editar esta circular')) return;
    startEdit(editId);
    return;
  }

  const id = target.dataset.deleteId;
  if (!id) return;

  if (!confirmAdminPassword('eliminar esta circular')) return;

  const confirmed = window.confirm('¿Seguro que quieres eliminar esta circular? Esta acción no se puede deshacer.');
  if (!confirmed) return;

  try {
    const current = await getCircularById(id);
    if (current?.storagePath) {
      await deletePdfByPath(current.storagePath).catch((error) => {
        console.warn('No se pudo borrar PDF en Storage.', error);
      });
    }
    await deleteCircular(id);

    showMessage('Circular eliminada.');
    if (editingId === id) {
      cancelEdit();
    }
    await refreshCirculares();
  } catch (error) {
    console.error(error);
    alert('No se pudo eliminar la circular.');
  }
});

cancelEditButton?.addEventListener('click', cancelEdit);

btnLogout?.addEventListener('click', () => {
  clearAdminAccess();
  window.location.replace('./index.html');
});

menuToggle?.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-open');
});

updateEditUI();
refreshCirculares().catch((error) => {
  console.error(error);
  showMessage('No se pudieron cargar las circulares.');
});
