import { getCircularById, updateCircular } from './db-local.js';
import { currentSession, logout } from './auth.js';

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

const metaEl = document.getElementById('meta');
const tableBody = document.getElementById('tablaBody');
const btnSave = document.getElementById('btnSave');
const pdfWrap = document.getElementById('pdfWrap');
const btnLogout = document.getElementById('btnLogout');
const userBadge = document.getElementById('userBadge');
const tableSection = document.getElementById('tableSection');

const pdfViewer = document.getElementById('pdfViewer');
const pdfFallback = document.getElementById('pdfFallback');
const pdfActions = document.getElementById('pdfActions');
const btnZoomOut = document.getElementById('zoomOut');
const btnZoomIn = document.getElementById('zoomIn');
const openPdf = document.getElementById('openPdf');

let pdfUrl = '';
let pdfDoc = null;
let currentScale = 1.2;
const zoomStep = 0.15;
const minScale = 0.6;
const maxScale = 2.4;

const session = currentSession();
if (!session) {
  window.location.replace('./index.html');
}
if (session) {
  userBadge.textContent = `${session.email} (${session.role})`;
}

function normalizePdfLink(url) {
  if (!url) return '';

  const drivePattern = /drive\.google\.com\/file\/d\/([^/]+)/;
  const match = url.match(drivePattern);

  if (match?.[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }

  return url;
}

function togglePdfUi(hasPdf) {
  pdfActions.style.display = hasPdf ? 'flex' : 'none';
  pdfViewer.style.display = hasPdf ? 'block' : 'none';
  pdfFallback.style.display = hasPdf ? 'none' : 'block';
  tableSection.style.display = hasPdf ? 'none' : 'block';
}

async function renderPdfFromUrl(url) {
  if (!window.pdfjsLib) {
    throw new Error('PDF.js no está disponible.');
  }

  pdfViewer.innerHTML = '';
  pdfDoc = null;

  const loadingTask = window.pdfjsLib.getDocument(url);
  pdfDoc = await loadingTask.promise;

  for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: currentScale });

    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-page';
    const context = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    pdfViewer.appendChild(canvas);
  }
}

async function refreshPdf() {
  if (!pdfUrl) return;

  try {
    await renderPdfFromUrl(pdfUrl);
  } catch (error) {
    console.error('Error al renderizar PDF:', error);
    pdfViewer.innerHTML = '<p class="error">No se pudo cargar la vista previa del PDF.</p>';
  }
}

const circular = getCircularById(id);
if (!circular) {
  metaEl.innerHTML = '<p>No se encontró la circular.</p>';
  btnSave.disabled = true;
  togglePdfUi(false);
} else {
  metaEl.innerHTML = `
    <p><strong>Número:</strong> ${circular.numero}</p>
    <p><strong>Departamento:</strong> ${circular.departamento}</p>
    <p><strong>Fecha:</strong> ${circular.fecha}</p>
    <p><strong>Aplica a:</strong> ${circular.aplicaA}</p>
  `;

  tableBody.innerHTML = circular.tabla
    .map(
      (row, index) => `
      <tr>
        <td>${row.codigo}</td>
        <td><input data-field="descripcion" data-index="${index}" value="${row.descripcion || ''}"></td>
        <td><input data-field="precioAnterior" data-index="${index}" value="${row.precioAnterior || ''}"></td>
        <td><input data-field="precioNuevo" data-index="${index}" value="${row.precioNuevo || ''}"></td>
        <td><input data-field="observaciones" data-index="${index}" value="${row.observaciones || ''}"></td>
      </tr>
    `
    )
    .join('');

  if (circular.pdfLink) {
    pdfUrl = normalizePdfLink(circular.pdfLink);
    openPdf.href = pdfUrl;
    pdfWrap.innerHTML = `<a class="btn" href="${pdfUrl}" target="_blank" rel="noopener">Ver PDF</a>`;
    togglePdfUi(true);
    refreshPdf();
  } else {
    togglePdfUi(false);
  }
}

btnZoomIn?.addEventListener('click', async () => {
  if (!pdfUrl) return;
  currentScale = Math.min(maxScale, currentScale + zoomStep);
  await refreshPdf();
});

btnZoomOut?.addEventListener('click', async () => {
  if (!pdfUrl) return;
  currentScale = Math.max(minScale, currentScale - zoomStep);
  await refreshPdf();
});

btnSave?.addEventListener('click', () => {
  if (!circular) return;
  const tablaActualizada = circular.tabla.map((row, index) => {
    const inputBy = (field) =>
      document.querySelector(`input[data-field="${field}"][data-index="${index}"]`)?.value?.trim() || '';

    return {
      ...row,
      descripcion: inputBy('descripcion'),
      precioAnterior: inputBy('precioAnterior'),
      precioNuevo: inputBy('precioNuevo'),
      observaciones: inputBy('observaciones')
    };
  });

  updateCircular(circular.id, { tabla: tablaActualizada });
  alert('Cambios guardados.');
});

btnLogout?.addEventListener('click', () => {
  logout();
  window.location.replace('./index.html');
});
