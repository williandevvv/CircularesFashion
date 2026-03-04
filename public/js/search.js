import { listCirculares } from './db-firebase.js';
import { clearAdminAccess, requestAdminAccess } from './admin-access.js';

const appView = document.getElementById('appView');
const btnLogout = document.getElementById('btnLogout');
const btnAdmin = document.getElementById('btnAdmin');
const userBadge = document.getElementById('userBadge');
const mobileLogout = document.getElementById('mobileLogout');
const btnPriorityUpload = document.getElementById('btnPriorityUpload');
const menuToggle = document.querySelector('.mobile-menu-toggle');

const searchInput = document.getElementById('searchInput');
const departmentFilter = document.getElementById('departmentFilter');
const cardsContainer = document.getElementById('cardsContainer');

let circulares = [];

function showView() {
  appView?.classList.remove('hidden');
  btnAdmin?.classList.remove('hidden');
  userBadge.textContent = 'Consulta pública de circulares';
  setupFilters();
  renderResults();
}

function setupFilters() {
  const departments = [...new Set(circulares.map((c) => c.departamento).filter(Boolean))];
  departmentFilter.innerHTML = '<option value="">Todos los departamentos</option>';
  departments.forEach((dep) => {
    const op = document.createElement('option');
    op.value = dep;
    op.textContent = dep;
    departmentFilter.appendChild(op);
  });
}

function matchCircular(circular, term, department) {
  const normalized = term.toUpperCase();
  const depOk = !department || circular.departamento === department;
  if (!depOk) return false;
  if (!normalized) return true;

  const codes = Array.isArray(circular.codigos) ? circular.codigos : [];
  const byCode = codes.some((c) => String(c).toUpperCase().includes(normalized));
  const byNumber = String(circular.numero || '').toUpperCase().includes(normalized);
  const byDepartment = String(circular.departamento || '').toUpperCase().includes(normalized);

  return byCode || byNumber || byDepartment;
}

function renderResults() {
  const term = (searchInput.value || '').trim();
  const dep = departmentFilter.value;

  const results = circulares.filter((c) => matchCircular(c, term, dep));

  if (!results.length) {
    cardsContainer.innerHTML = '<p class="empty">No hay resultados con ese filtro.</p>';
    return;
  }

  cardsContainer.innerHTML = results
    .map((c) => `
      <article class="card">
        <h3>${c.numero || '-'}</h3>
        <p><strong>Departamento:</strong> ${c.departamento || '-'}</p>
        <p><strong>Fecha:</strong> ${c.fecha || '-'}</p>
        <div class="actions">
          <a class="btn" href="./detalle.html?id=${c.id}">Ver detalle</a>
          ${c.pdfUrl ? `<a class="btn btn-secondary" href="${c.pdfUrl}" target="_blank" rel="noopener">Ver PDF</a>` : ''}
        </div>
      </article>
    `)
    .join('');
}

async function refreshCirculares() {
  circulares = await listCirculares();
  setupFilters();
  renderResults();
}

function handleExitAdminMode() {
  clearAdminAccess();
  window.alert('Clave de admin eliminada para esta sesión.');
}

function openAdmin() {
  const ok = requestAdminAccess('Ingresa la clave para entrar al panel de admin:');
  if (!ok) return;
  window.location.href = './admin.html';
}

searchInput?.addEventListener('input', renderResults);
departmentFilter?.addEventListener('change', renderResults);

btnLogout?.addEventListener('click', handleExitAdminMode);
mobileLogout?.addEventListener('click', handleExitAdminMode);

btnAdmin?.addEventListener('click', openAdmin);
btnPriorityUpload?.addEventListener('click', openAdmin);

menuToggle?.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-open');
});

refreshCirculares().catch((error) => {
  console.error(error);
  cardsContainer.innerHTML = '<p class="empty">No se pudieron cargar las circulares.</p>';
});
showView();
