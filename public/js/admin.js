import { addCircular } from './db-local.js';
import { extractCodesFromPdf } from './pdf-extract.js';
import { savePdf } from './storage-adapter.js';
import { currentSession, logout } from './auth.js';

const form = document.getElementById('circular-form');
const pdfFileInput = document.getElementById('pdfFile');
const extractedCodesEl = document.getElementById('extractedCodes');
const userBadge = document.getElementById('userBadge');
const btnLogout = document.getElementById('btnLogout');

let extractedCodes = [];

function makeRows(codes) {
  return codes.map((codigo) => ({
    codigo,
    descripcion: '',
    precioAnterior: '',
    precioNuevo: '',
    observaciones: ''
  }));
}

function renderCodes() {
  extractedCodesEl.textContent = extractedCodes.length
    ? extractedCodes.join(', ')
    : 'No hay códigos extraídos todavía.';
}

pdfFileInput?.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    extractedCodes = [];
    renderCodes();
    return;
  }

  extractedCodesEl.textContent = 'Extrayendo códigos...';
  try {
    extractedCodes = await extractCodesFromPdf(file);
    renderCodes();
  } catch (error) {
    console.error(error);
    extractedCodes = [];
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
  const pdfFile = pdfFileInput.files?.[0] || null;

  if (!numero || !departamento || !fecha || !aplicaA) {
    alert('Completa los campos obligatorios.');
    return;
  }

  const storageRes = await savePdf(pdfFile);

  const circular = {
    id: crypto.randomUUID(),
    numero,
    departamento,
    fecha,
    aplicaA,
    pdfLink: rawPdfLink || storageRes.pdfUrl || null,
    codigos: extractedCodes,
    tabla: makeRows(extractedCodes),
    createdAt: Date.now()
  };

  addCircular(circular);
  alert('Circular guardada correctamente.');
  extractedCodes = [];
  renderCodes();
  form.reset();
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
