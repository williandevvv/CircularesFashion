import { getCircularById } from './db-firebase.js';
import { listenSession, logout } from './auth.js';

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

async function initPage() {
  const circular = await getCircularById(id);
  if (!circular) {
    metaEl.innerHTML = '<p>No se encontró la circular.</p>';
    noPdf.style.display = 'block';
    pdfFrame.style.display = 'none';
    openPdf.style.display = 'none';
    return;
  }

  metaEl.innerHTML = `
    <p><strong>Número:</strong> ${circular.numero || '-'}</p>
    <p><strong>Departamento:</strong> ${circular.departamento || '-'}</p>
    <p><strong>Fecha:</strong> ${circular.fecha || '-'}</p>
    <p><strong>Aplica a:</strong> ${circular.aplicaA || '-'}</p>
  `;

  if (circular.pdfUrl) {
    pdfFrame.src = circular.pdfUrl;
    openPdf.href = circular.pdfUrl;
    noPdf.style.display = 'none';
  } else {
    noPdf.style.display = 'block';
    pdfFrame.style.display = 'none';
    openPdf.style.display = 'none';
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
