import { db } from './firebase-config.js';
import { listenSession, logout } from './auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const id = new URLSearchParams(location.search).get('id');

const metaEl = document.getElementById('meta');
const pdfFrame = document.getElementById('pdfFrame');
const openPdf = document.getElementById('openPdf');
const noPdf = document.getElementById('noPdf');
const btnLogout = document.getElementById('btnLogout');
const mobileLogout = document.getElementById('mobileLogout');
const userBadge = document.getElementById('userBadge');
const menuToggle = document.querySelector('.mobile-menu-toggle');

function normalizeCircularData(data = {}) {
  return {
    ...data,
    numero: data.numero ?? data.Numero ?? '',
    departamento: data.departamento ?? data.Departamento ?? '',
    fecha: data.fecha ?? data.Fecha ?? '',
    pdfUrl: data.pdfUrl ?? data.pdfURL ?? data.linkPdf ?? ''
  };
}

function renderError(message) {
  metaEl.innerHTML = `<p>${message}</p>`;
  noPdf.textContent = 'Sin PDF asociado';
  noPdf.style.display = 'block';
  pdfFrame.style.display = 'none';
  openPdf.style.display = 'none';
}

function renderCircular(circular) {
  metaEl.innerHTML = `
    <p><strong>Número:</strong> ${circular.numero || '-'}</p>
    <p><strong>Departamento:</strong> ${circular.departamento || '-'}</p>
    <p><strong>Fecha:</strong> ${circular.fecha || '-'}</p>
    <p><strong>Aplica a:</strong> ${circular.aplicaA || '-'}</p>
  `;

  if (circular.pdfUrl) {
    pdfFrame.src = circular.pdfUrl;
    pdfFrame.style.display = 'block';
    openPdf.href = circular.pdfUrl;
    openPdf.style.display = 'inline-flex';
    noPdf.style.display = 'none';
    return;
  }

  noPdf.textContent = 'Esta circular no tiene PDF asociado.';
  noPdf.style.display = 'block';
  pdfFrame.style.display = 'none';
  openPdf.style.display = 'none';
}

async function initPage() {
  if (!id) {
    console.error('No se encontró el parámetro "id" en la URL de detalle.');
    renderError('Error: falta el parámetro "id" en la URL.');
    return;
  }

  try {
    const snapshot = await getDoc(doc(db, 'circulares', id));

    if (!snapshot.exists()) {
      renderError('Circular no encontrada');
      return;
    }

    const circular = { id: snapshot.id, ...normalizeCircularData(snapshot.data()) };
    renderCircular(circular);
  } catch (error) {
    console.error(`Error al obtener la circular ${id} desde Firestore.`, error);
    renderError('Circular no encontrada');
  }
}

btnLogout?.addEventListener('click', async () => {
  await logout();
  window.location.replace('./index.html');
});

mobileLogout?.addEventListener('click', async () => {
  await logout();
  window.location.replace('./index.html');
});

menuToggle?.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-open');
});

listenSession(async (session) => {
  if (!session) {
    window.location.replace('./index.html');
    return;
  }

  userBadge.textContent = `${session.email} (${session.role})`;
  await initPage();
});
