import {
  deleteCircularById,
  getAllCirculares,
  getCircularById,
  saveCircular,
  updateCircularById
} from './db-local.js';
import { extractCodesFromPdf } from './pdf-extract.js';
import { currentSession, logout } from './auth.js';

const form = document.getElementById('circular-form');
const formTitle = document.getElementById('formTitle');
const submitButton = document.getElementById('submitButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const previewImagesInput = document.getElementById('previewImages');
const previewThumbs = document.getElementById('previewThumbs');
const pdfFileInput = document.getElementById('pdfFile');
const pdfStatus = document.getElementById('pdfStatus');
const codigosInput = document.getElementById('codigos');
const circularesList = document.getElementById('circularesList');
const adminMessage = document.getElementById('adminMessage');
const userBadge = document.getElementById('userBadge');
const btnLogout = document.getElementById('btnLogout');
const menuToggle = document.querySelector('.mobile-menu-toggle');

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE_BYTES = Math.round(1.5 * 1024 * 1024);
const MAX_TOTAL_SIZE_BYTES = 8 * 1024 * 1024;

let editingId = null;
let previewImagesData = [];

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.readAsDataURL(file);
  });
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
  if (formTitle) {
    formTitle.textContent = isEditing ? 'Editar circular' : 'Nueva circular';
  }
  if (submitButton) {
    submitButton.textContent = isEditing ? 'Guardar cambios' : 'Crear circular';
  }
  if (cancelEditButton) {
    cancelEditButton.classList.toggle('hidden', !isEditing);
  }
}

function renderPreviewThumbs() {
  previewThumbs.innerHTML = '';

  previewImagesData.forEach((image, index) => {
    const item = document.createElement('div');
    item.className = 'thumb-item';

    const img = document.createElement('img');
    img.src = image;
    img.alt = `Vista previa ${index + 1}`;

    const controls = document.createElement('div');
    controls.className = 'thumb-controls';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-danger';
    removeButton.textContent = 'Quitar';
    removeButton.dataset.removeIndex = String(index);

    const upButton = document.createElement('button');
    upButton.type = 'button';
    upButton.className = 'btn btn-secondary';
    upButton.textContent = '↑';
    upButton.dataset.upIndex = String(index);
    upButton.disabled = index === 0;

    const downButton = document.createElement('button');
    downButton.type = 'button';
    downButton.className = 'btn btn-secondary';
    downButton.textContent = '↓';
    downButton.dataset.downIndex = String(index);
    downButton.disabled = index === previewImagesData.length - 1;

    controls.append(upButton, downButton, removeButton);
    item.append(img, controls);
    previewThumbs.appendChild(item);
  });
}

function clearFormState() {
  form.reset();
  previewImagesData = [];
  if (pdfStatus) {
    pdfStatus.textContent = 'Si subes un PDF, se intentarán extraer códigos automáticamente para el buscador.';
  }
  if (previewImagesInput) {
    previewImagesInput.value = '';
  }
  renderPreviewThumbs();
}

function cancelEdit() {
  editingId = null;
  clearFormState();
  updateEditUI();
}

function startEdit(id) {
  const circular = getCircularById(id);
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
  previewImagesData = Array.isArray(circular.previewImages) ? [...circular.previewImages] : [];
  if (pdfStatus) {
    pdfStatus.textContent = circular.pdfName
      ? `PDF guardado actualmente: ${circular.pdfName}. Puedes reemplazarlo subiendo otro.`
      : 'Esta circular no tiene PDF asociado. Puedes subir uno opcional.';
  }
  if (previewImagesInput) {
    previewImagesInput.value = '';
  }
  renderPreviewThumbs();
  updateEditUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleImagesSelection(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) {
    return;
  }

  const availableSlots = MAX_IMAGES - previewImagesData.length;
  if (availableSlots <= 0) {
    alert(`Máximo ${MAX_IMAGES} imágenes por circular.`);
    previewImagesInput.value = '';
    return;
  }

  const accepted = [];
  for (const file of files) {
    if (accepted.length >= availableSlots) {
      alert(`Solo puedes tener ${MAX_IMAGES} imágenes en total. Algunas no se agregaron.`);
      break;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      alert(`La imagen "${file.name}" supera 1.5MB y no se agregó.`);
      continue;
    }
    accepted.push(file);
  }

  if (!accepted.length) {
    previewImagesInput.value = '';
    return;
  }

  try {
    const newData = await Promise.all(accepted.map((file) => readFileAsDataURL(file)));
    const merged = [...previewImagesData, ...newData];
    const estimatedTotalBytes = merged.reduce((sum, imageDataUrl) => {
      const base64Content = imageDataUrl.split(',')[1] || '';
      return sum + Math.round((base64Content.length * 3) / 4);
    }, 0);

    if (estimatedTotalBytes > MAX_TOTAL_SIZE_BYTES) {
      alert('Demasiadas imágenes para modo local. Reduce tamaño o cantidad.');
      previewImagesInput.value = '';
      return;
    }

    previewImagesData = merged;
    renderPreviewThumbs();
  } catch (error) {
    console.error(error);
    alert('No se pudieron leer las imágenes seleccionadas.');
  } finally {
    previewImagesInput.value = '';
  }
}

async function handlePdfSelection(event) {
  const file = event.target.files?.[0];
  if (!file) {
    if (pdfStatus) {
      pdfStatus.textContent = 'Si subes un PDF, se intentarán extraer códigos automáticamente para el buscador.';
    }
    return;
  }

  if (pdfStatus) {
    pdfStatus.textContent = 'Leyendo PDF y detectando códigos...';
  }

  try {
    const detectedCodes = await extractCodesFromPdf(file);
    const mergedCodes = normalizeCodes([
      ...parseCodesFromText(codigosInput?.value || ''),
      ...detectedCodes
    ]);

    if (codigosInput) {
      codigosInput.value = mergedCodes.join(', ');
    }

    if (pdfStatus) {
      pdfStatus.textContent = detectedCodes.length
        ? `Se detectaron ${detectedCodes.length} código(s) desde el PDF.`
        : 'No se detectaron códigos en el PDF. Puedes ingresarlos manualmente.';
    }
  } catch (error) {
    console.error(error);
    if (pdfStatus) {
      pdfStatus.textContent = 'No se pudo leer el PDF. Puedes guardar igual y escribir códigos manualmente.';
    }
  }
}

function renderCircularesList() {
  const circulares = getAllCirculares();

  if (!circulares.length) {
    circularesList.innerHTML = '<p class="muted">No hay circulares guardadas.</p>';
    return;
  }

  const rows = circulares.map((circular) => {
    const codigosCount = Array.isArray(circular.codigos) ? circular.codigos.length : 0;
    return `
    <tr>
      <td data-label="Número">${circular.numero || '-'}</td>
      <td data-label="Departamento">${circular.departamento || '-'}</td>
      <td data-label="Fecha">${circular.fecha || '-'}</td>
      <td data-label="Aplica a">${circular.aplicaA || '-'}</td>
      <td data-label="Códigos">${codigosCount}</td>
      <td data-label="PDF">${circular.pdfName || '-'}</td>
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

form?.addEventListener('submit', (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const numero = String(data.get('numero') || '').trim();
  const departamento = String(data.get('departamento') || '').trim();
  const fecha = String(data.get('fecha') || '').trim();
  const aplicaA = String(data.get('aplicaA') || '').trim();
  const pdfFile = pdfFileInput?.files?.[0] || null;
  const codigos = parseCodesFromText(String(data.get('codigos') || ''));

  if (!numero || !departamento || !fecha || !aplicaA) {
    alert('Completa los campos obligatorios.');
    return;
  }

  const estimatedTotalBytes = previewImagesData.reduce((sum, imageDataUrl) => {
    const base64Content = imageDataUrl.split(',')[1] || '';
    return sum + Math.round((base64Content.length * 3) / 4);
  }, 0);

  if (estimatedTotalBytes > MAX_TOTAL_SIZE_BYTES) {
    alert('Demasiadas imágenes para modo local. Reduce tamaño o cantidad.');
    return;
  }

  try {
    if (editingId !== null) {
      const current = getCircularById(editingId);
      if (!current) {
        alert('La circular que intentas editar ya no existe.');
        cancelEdit();
        renderCircularesList();
        return;
      }

      updateCircularById(editingId, {
        numero,
        departamento,
        fecha,
        aplicaA,
        codigos,
        pdfName: pdfFile ? pdfFile.name : (current.pdfName || null),
        previewImages: [...previewImagesData],
        updatedAt: Date.now(),
        createdAt: current.createdAt
      });
      showMessage('Cambios guardados.');
      cancelEdit();
      renderCircularesList();
      return;
    }

    const circular = {
      id: crypto.randomUUID(),
      numero,
      departamento,
      fecha,
      aplicaA,
      codigos,
      pdfName: pdfFile ? pdfFile.name : null,
      previewImages: [...previewImagesData],
      createdAt: Date.now()
    };

    saveCircular(circular);
    showMessage('Circular guardada.');
    clearFormState();
    renderCircularesList();
  } catch (error) {
    console.error(error);
    alert('No se pudo guardar la circular.');
  }
});

previewImagesInput?.addEventListener('change', handleImagesSelection);
pdfFileInput?.addEventListener('change', handlePdfSelection);

previewThumbs?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const removeIndex = target.dataset.removeIndex;
  if (removeIndex !== undefined) {
    const index = Number(removeIndex);
    previewImagesData = previewImagesData.filter((_, currentIndex) => currentIndex !== index);
    renderPreviewThumbs();
    return;
  }

  const upIndex = target.dataset.upIndex;
  if (upIndex !== undefined) {
    const index = Number(upIndex);
    if (index > 0) {
      [previewImagesData[index - 1], previewImagesData[index]] = [previewImagesData[index], previewImagesData[index - 1]];
      renderPreviewThumbs();
    }
    return;
  }

  const downIndex = target.dataset.downIndex;
  if (downIndex !== undefined) {
    const index = Number(downIndex);
    if (index < previewImagesData.length - 1) {
      [previewImagesData[index + 1], previewImagesData[index]] = [previewImagesData[index], previewImagesData[index + 1]];
      renderPreviewThumbs();
    }
  }
});

circularesList?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const editId = target.dataset.editId;
  if (editId) {
    startEdit(editId);
    return;
  }

  const id = target.dataset.deleteId;
  if (!id) {
    return;
  }

  const confirmed = window.confirm('¿Seguro que quieres eliminar esta circular? Esta acción no se puede deshacer.');
  if (!confirmed) {
    return;
  }

  const deleted = deleteCircularById(id);
  if (deleted) {
    showMessage('Circular eliminada.');
    if (editingId === id) {
      cancelEdit();
    }
    renderCircularesList();
  }
});

cancelEditButton?.addEventListener('click', cancelEdit);

btnLogout?.addEventListener('click', () => {
  logout();
  window.location.replace('./index.html');
});

menuToggle?.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-open');
});

const session = currentSession();
if (session) {
  userBadge.textContent = `${session.email} (${session.role})`;
}

updateEditUI();
renderCircularesList();
