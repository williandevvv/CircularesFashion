import { getCirculares } from './db-local.js';
import { currentSession, login, logout } from './auth.js';

const loginView = document.getElementById('loginView');
const appView = document.getElementById('appView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const btnLogout = document.getElementById('btnLogout');
const btnAdmin = document.getElementById('btnAdmin');
const userBadge = document.getElementById('userBadge');

const searchInput = document.getElementById('searchInput');
const departmentFilter = document.getElementById('departmentFilter');
const cardsContainer = document.getElementById('cardsContainer');

let session = currentSession();

function showView() {
  const isLogged = Boolean(session);
  loginView.classList.toggle('hidden', isLogged);
  appView.classList.toggle('hidden', !isLogged);

  if (isLogged) {
    userBadge.textContent = `${session.email} (${session.role})`;
    btnAdmin.classList.toggle('hidden', session.role !== 'admin');
    setupFilters();
    renderResults();
  }
}

function setupFilters() {
  const circulares = getCirculares();
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

  const byCode = circular.codigos.some((c) => c.toUpperCase().includes(normalized));
  const byNumber = circular.numero.toUpperCase().includes(normalized);
  const byDepartment = circular.departamento.toUpperCase().includes(normalized);

  return byCode || byNumber || byDepartment;
}

function renderResults() {
  const term = (searchInput.value || '').trim();
  const dep = departmentFilter.value;

  const results = getCirculares().filter((c) => matchCircular(c, term, dep));

  if (results.length === 0) {
    cardsContainer.innerHTML = '<p class="empty">No hay resultados con ese filtro.</p>';
    return;
  }

  cardsContainer.innerHTML = results
    .map(
      (c) => `
      <article class="card">
        <h3>${c.numero}</h3>
        <p><strong>Departamento:</strong> ${c.departamento}</p>
        <p><strong>Fecha:</strong> ${c.fecha}</p>
        <div class="actions">
          <a class="btn" href="./detalle.html?id=${c.id}">Ver detalle</a>
          ${c.pdfLink ? `<a class="btn btn-secondary" href="${c.pdfLink}" target="_blank" rel="noopener">Ver PDF</a>` : ''}
        </div>
      </article>
    `
    )
    .join('');
}

loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  loginError.textContent = '';
  const data = new FormData(loginForm);
  const email = String(data.get('email') || '').trim();
  const password = String(data.get('password') || '').trim();

  const res = login(email, password);
  if (!res.ok) {
    loginError.textContent = res.message;
    return;
  }

  session = currentSession();
  showView();
});

searchInput?.addEventListener('input', renderResults);
departmentFilter?.addEventListener('change', renderResults);

btnLogout?.addEventListener('click', () => {
  logout();
  session = null;
  showView();
});

btnAdmin?.addEventListener('click', () => {
  window.location.href = './admin.html';
});

showView();
