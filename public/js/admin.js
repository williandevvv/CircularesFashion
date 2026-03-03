import { addCircular } from './db-local.js';
import { extractCodesFromPdf } from './pdf-extract.js';
import { currentSession, logout } from './auth.js';
import { saveLocalPdf } from './pdf-local-store.js';

const form = document.getElementById('circular-form');
const pdfFileInput = document.getElementById('pdfFile');
const extractedCodesEl = document.getElementById('extractedCodes');
const userBadge = document.getElementById('userBadge');
const btnLogout = document.getElementById('btnLogout');

let extractedCodes = [];
let selectedPdfFile = null;

function makeRows(codes) {
  return codes.map((codigo) => ({
    codigo,
    descripcion: '',
    precioAnterior: '',
    precioNuevo: '',
    observaciones: ''
  }));
}

function renderCodes(message) {
  if (message) {
    extractedCodesEl.textContent = message;
    return;
  }

  extractedCodesEl.textContent = extractedCodes.length
    ? extractedCodes.join(', ')
    : 'No hay códigos extraídos todavía.';
}

pdfFileInput?.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    extractedCodes = [];
    selectedPdfFile = null;
    renderCodes();
    return;
  }

  extractedCodesEl.textContent = 'Cargando PDF y extrayendo códigos...';

  try {
    selectedPdfFile = file;
    extractedCodes = await extractCodesFromPdf(file);
    renderCodes('PDF cargado. Códigos extraídos: ' + (extractedCodes.join(', ') || 'ninguno'));
  } catch (error) {
    console.error(error);
    extractedCodes = [];
    selectedPdfFile = null;
    extractedCodesEl.textContent = 'No se pudo leer el PDF.';
  }
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const numero = String(data.get('numero') || '').trim();
  const departamento = String(data.get('departamento') || '').trim();
  const fecha = String(data.get('fecha') || '').trim();
  const aplicaA = String(data.get('aplicaA') || '').trim();
  const rawPdfLink = String(data.get('pdfLink') || '').trim();

  if (!numero || !departamento || !fecha || !aplicaA) {
    alert('Completa los campos obligatorios.');
    return;
  }

  const circular = {
    id: crypto.randomUUID(),
    numero,
    departamento,
    fecha,
    aplicaA,
    pdfLink: rawPdfLink || null,
    codigos: extractedCodes,
    tabla: makeRows(extractedCodes),
    createdAt: Date.now()
  };

  if (selectedPdfFile) {
    circular.pdfSource = 'indexeddb';
    circular.pdfStorageKey = circular.id;
  } else if (circular.pdfLink) {
    circular.pdfSource = 'link';
  }

  try {
    if (selectedPdfFile) {
      await saveLocalPdf(circular.pdfStorageKey, selectedPdfFile);
    }

    addCircular(circular);

    alert('Circular guardada correctamente.');
    extractedCodes = [];
    selectedPdfFile = null;
    renderCodes();
    form.reset();
  } catch (error) {
    console.error(error);
    if (error?.name === 'QuotaExceededError') {
      alert('PDF muy pesado para modo local. Use link PDF o active Storage.');
      return;
    }

    alert('No se pudo guardar la circular.');
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
renderCodes();
