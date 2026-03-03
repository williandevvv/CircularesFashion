import { getCircularById } from './db-local.js';
import { currentSession, logout } from './auth.js';

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

const metaEl = document.getElementById('meta');
const btnLogout = document.getElementById('btnLogout');
const userBadge = document.getElementById('userBadge');

const pdfViewer = document.getElementById('pdfViewer');
const pdfFallback = document.getElementById('pdfFallback');
const pdfActions = document.getElementById('pdfActions');
const btnZoomOut = document.getElementById('zoomOut');
const btnZoomIn = document.getElementById('zoomIn');
const openPdf = document.getElementById('openPdf');

let pdfSource = '';
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
}

function setupOpenPdf(circular) {
  if (circular.pdfLink) {
    openPdf.href = circular.pdfLink;
    openPdf.style.display = 'inline-block';
    return;
  }

  openPdf.removeAttribute('href');
  openPdf.style.display = 'none';
}

async function renderPdf() {
  if (!pdfSource) return;
  if (!window.pdfjsLib) {
    throw new Error('PDF.js no está disponible.');
  }

  pdfViewer.innerHTML = '';
  pdfDoc = null;

  const loadingTask = window.pdfjsLib.getDocument(pdfSource);
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
  try {
    await renderPdf();
  } catch (error) {
    console.error('Error al renderizar PDF:', error);
    pdfViewer.innerHTML = '<p class="error">No se pudo cargar la vista previa del PDF.</p>';
  }
}

const circular = getCircularById(id);
if (!circular) {
  metaEl.innerHTML = '<p>No se encontró la circular.</p>';
  togglePdfUi(false);
} else {
  metaEl.innerHTML = `
    <p><strong>Número:</strong> ${circular.numero}</p>
    <p><strong>Departamento:</strong> ${circular.departamento}</p>
    <p><strong>Fecha:</strong> ${circular.fecha}</p>
    <p><strong>Aplica a:</strong> ${circular.aplicaA}</p>
  `;

  setupOpenPdf(circular);

  if (circular.pdfDataUrl) {
    pdfSource = circular.pdfDataUrl;
    togglePdfUi(true);
    refreshPdf();
  } else if (circular.pdfLink) {
    pdfSource = normalizePdfLink(circular.pdfLink);
    togglePdfUi(true);
    refreshPdf();
  } else {
    togglePdfUi(false);
  }
}

btnZoomIn?.addEventListener('click', async () => {
  if (!pdfSource) return;
  currentScale = Math.min(maxScale, currentScale + zoomStep);
  await refreshPdf();
});

btnZoomOut?.addEventListener('click', async () => {
  if (!pdfSource) return;
  currentScale = Math.max(minScale, currentScale - zoomStep);
  await refreshPdf();
});

btnLogout?.addEventListener('click', () => {
  logout();
  window.location.replace('./index.html');
});
