import { db } from './firebase-config.js';
import { listenSession, logout } from './auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

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

function renderMissingCircular(message) {
  metaEl.innerHTML = `<p>${message}</p>`;
  noPdf.textContent = 'Sin PDF asociado';
  noPdf.style.display = 'block';
  pdfFrame.style.display = 'none';
  openPdf.style.display = 'none';
}

async function initPage() {
  if (!id) {
    console.error('No se encontró el parámetro "id" en la URL de detalle.');
    renderMissingCircular('Circular no encontrada');
    return;
  }

  try {
    const circularRef = doc(db, 'circulares', id);
    const snapshot = await getDoc(circularRef);

    if (!snapshot.exists()) {
      renderMissingCircular('Circular no encontrada');
      return;
    }

    const circular = { id: snapshot.id, ...normalizeCircularData(snapshot.data()) };

    metaEl.innerHTML = `
      <p><strong>Número:</strong> ${circular.numero || '-'}</p>
      <p><strong>Departamento:</strong> ${circular.departamento || '-'}</p>
      <p><strong>Fecha:</strong> ${circular.fecha || '-'}</p>
      <p><strong>Aplica a:</strong> ${circular.aplicaA || '-'}</p>
    `;

    if (circular.pdfUrl) {
      const iframeMarkup = `<iframe src="${circular.pdfUrl}" style="width:100%; height:80vh;"></iframe>`;
      pdfFrame.outerHTML = iframeMarkup;
      openPdf.href = circular.pdfUrl;
      noPdf.style.display = 'none';
    } else {
      noPdf.textContent = 'Sin PDF asociado';
      noPdf.style.display = 'block';
      pdfFrame.style.display = 'none';
      openPdf.style.display = 'none';
    }
  } catch (error) {
    console.error(`Error al obtener la circular ${id} desde Firestore.`, error);
    renderMissingCircular('Circular no encontrada');
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
