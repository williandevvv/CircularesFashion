import { getCircularById } from './db-local.js';
import { currentSession, logout } from './auth.js';

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

const metaEl = document.getElementById('meta');
const imageViewer = document.getElementById('imageViewer');
const noImages = document.getElementById('noImages');
const btnLogout = document.getElementById('btnLogout');
const userBadge = document.getElementById('userBadge');

const session = currentSession();
if (!session) {
  window.location.replace('./index.html');
}
if (session) {
  userBadge.textContent = `${session.email} (${session.role})`;
}

function renderImages(previewImages = []) {
  imageViewer.innerHTML = '';

  if (!previewImages.length) {
    noImages.style.display = 'block';
    return;
  }

  noImages.style.display = 'none';
  previewImages.forEach((imageSrc, index) => {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = `Página ${index + 1} de la circular`;
    img.loading = 'lazy';
    imageViewer.appendChild(img);
  });
}

function initPage() {
  const circular = getCircularById(id);
  if (!circular) {
    metaEl.innerHTML = '<p>No se encontró la circular.</p>';
    renderImages([]);
    return;
  }

  metaEl.innerHTML = `
    <p><strong>Número:</strong> ${circular.numero}</p>
    <p><strong>Departamento:</strong> ${circular.departamento}</p>
    <p><strong>Fecha:</strong> ${circular.fecha}</p>
    <p><strong>Aplica a:</strong> ${circular.aplicaA}</p>
  `;

  renderImages(Array.isArray(circular.previewImages) ? circular.previewImages : []);
}

initPage();

btnLogout?.addEventListener('click', () => {
  logout();
  window.location.replace('./index.html');
});
