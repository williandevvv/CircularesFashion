import { deleteCircularById, getAllCirculares, saveCircular } from './db-local.js';
import { extractCodesFromPdf } from './pdf-extract.js';
import { currentSession, logout } from './auth.js';

const form = document.getElementById('circular-form');
const previewImagesInput = document.getElementById('previewImages');
const previewThumbs = document.getElementById('previewThumbs');
const pdfFileInput = document.getElementById('pdfFile');
const pdfStatus = document.getElementById('pdfStatus');
const codigosInput = document.getElementById('codigos');
const circularesList = document.getElementById('circularesList');
const adminMessage = document.getElementById('adminMessage');
const userBadge = document.getElementById('userBadge');
const btnLogout = document.getElementById('btnLogout');

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE_BYTES = Math.round(1.5 * 1024 * 1024);
const MAX_TOTAL_SIZE_BYTES = 8 * 1024 * 1024;

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

function renderPreviewThumbs() {
  previewThumbs.innerHTML = '';

  previewImagesData.forEach((image, index) => {
    const img = document.createElement('img');
    img.src = image;
    img.alt = `Vista previa ${index + 1}`;
    previewThumbs.appendChild(img);
  });
}

function clearFormState() {
  form.reset();
  previewImagesData = [];
  if (pdfStatus) {
    pdfStatus.textContent = 'Si subes un PDF, se intentarán extraer códigos automáticamente para el buscador.';
  }
  renderPreviewThumbs();
}

async function handleImagesSelection(event) {
  const files = Array.from(event.target.files || []);

  if (files.length > MAX_IMAGES) {
    alert(`Máximo ${MAX_IMAGES} imágenes por circular.`);
    previewImagesInput.value = '';
    previewImagesData = [];
    renderPreviewThumbs();
    return;
  }

  const imageTooLarge = files.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
  if (imageTooLarge) {
    alert(`La imagen "${imageTooLarge.name}" supera 1.5MB.`);
    previewImagesInput.value = '';
    previewImagesData = [];
    renderPreviewThumbs();
    return;
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_SIZE_BYTES) {
    alert('Demasiadas imágenes para modo local. Reduce tamaño o cantidad.');
    previewImagesInput.value = '';
    previewImagesData = [];
    renderPreviewThumbs();
    return;
  }

  try {
    previewImagesData = await Promise.all(files.map((file) => readFileAsDataURL(file)));
    renderPreviewThumbs();
  } catch (error) {
    console.error(error);
    alert('No se pudieron leer las imágenes seleccionadas.');
    previewImagesInput.value = '';
    previewImagesData = [];
    renderPreviewThumbs();
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

  const rows = circulares.map((circular) => `
    <tr>
      <td>${circular.numero || '-'}</td>
      <td>${circular.departamento || '-'}</td>
      <td>${circular.fecha || '-'}</td>
      <td>${circular.aplicaA || '-'}</td>
      <td>${Array.isArray(circular.codigos) ? circular.codigos.length : 0}</td>
      <td>${circular.pdfName || '-'}</td>
      <td>
        <div class="actions">
          <a class="btn btn-secondary" href="./detalle.html?id=${encodeURIComponent(circular.id)}">Ver</a>
          <button class="btn btn-danger" type="button" data-delete-id="${circular.id}">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');

  circularesList.innerHTML = `
    <div class="table-wrap">
      <table>
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

  try {
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

circularesList?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
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
    renderCircularesList();
  }
});

btnLogout?.addEventListener('click', () => {
  logout();
  window.location.replace('./index.html');
});

const session = currentSession();
if (session) {
  userBadge.textContent = `${session.email} (${session.role})`;
}

renderCircularesList();
