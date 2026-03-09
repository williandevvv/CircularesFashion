import { firestorePersistenceReady } from './firebase-config.js';
import { listenCirculares } from './db-firebase.js';
import { listCircularesFromStorage } from './storage-adapter.js';
import { clearAdminAccess, requestAdminAccess } from './admin-access.js';

const params = new URLSearchParams(window.location.search);
const appView = document.getElementById('appView');
const btnLogout = document.getElementById('btnLogout');
const btnAdmin = document.getElementById('btnAdmin');
const userBadge = document.getElementById('userBadge');
const mobileLogout = document.getElementById('mobileLogout');
const btnPriorityUpload = document.getElementById('btnPriorityUpload');
const menuToggle = document.querySelector('.mobile-menu-toggle');
const uploadStatus = document.getElementById('uploadStatus');

const searchInput = document.getElementById('searchInput');
const departmentFilter = document.getElementById('departmentFilter');
const cardsContainer = document.getElementById('cardsContainer');
const selectedCircularSection = document.getElementById('selectedCircularSection');
const selectedCircularMeta = document.getElementById('selectedCircularMeta');
const selectedCircularFrame = document.getElementById('selectedCircularFrame');
const selectedCircularOpenPdf = document.getElementById('selectedCircularOpenPdf');
const selectedCircularNoPdf = document.getElementById('selectedCircularNoPdf');


const ACCESS_STORAGE_KEY = 'circulares_public_access';
const ACCESS_PASSWORD = 'circularesfs';
const accessGate = document.getElementById('accessGate');
const accessGateForm = document.getElementById('accessGateForm');
const accessKeyInput = document.getElementById('accessKeyInput');
const accessGateError = document.getElementById('accessGateError');

const SKELETON_CARDS_COUNT = 6;

function hasPublicAccess() {
  return window.localStorage.getItem(ACCESS_STORAGE_KEY) === 'granted';
}

function grantPublicAccess() {
  window.localStorage.setItem(ACCESS_STORAGE_KEY, 'granted');
}

function openAccessGate() {
  appView?.classList.add('hidden');
  accessGate?.classList.remove('hidden');
  accessKeyInput?.focus();
}

function unlockAccessGate() {
  accessGate?.classList.add('hidden');
  appView?.classList.remove('hidden');
}

function initPublicAccessGate() {
  if (hasPublicAccess()) {
    unlockAccessGate();
    return true;
  }

  openAccessGate();

  accessGateForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const key = (accessKeyInput?.value || '').trim();

    if (key !== ACCESS_PASSWORD) {
      accessGateError?.classList.remove('hidden');
      accessKeyInput?.focus();
      accessKeyInput?.select();
      return;
    }

    grantPublicAccess();
    accessGateError?.classList.add('hidden');
    accessKeyInput.value = '';
    unlockAccessGate();
    showView();
    showCardsSkeleton();
    loadCircularesOnce().catch((error) => {
      console.error('Error inesperado al inicializar la carga de circulares.', error);
      setCardsStatus('No se pudieron cargar las circulares.');
    });
  });

  return false;
}
let circulares = [];
let stopCircularesListener = null;
let hasRenderedFirestoreSnapshot = false;
let filtersInitialized = false;

function showView() {
  appView?.classList.remove('hidden');
  btnAdmin?.classList.remove('hidden');
  userBadge.textContent = 'Consulta habilitada por clave';
  setupFilters();
  renderResults();
}

function setCardsStatus(message) {
  if (!cardsContainer) return;
  cardsContainer.innerHTML = `<p class="empty">${message}</p>`;
}

function showCardsSkeleton(count = SKELETON_CARDS_COUNT) {
  if (!cardsContainer) return;
  const skeletons = Array.from({ length: count }, () => `
    <article class="card skeleton-card" aria-hidden="true">
      <div class="skeleton-line skeleton-title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="actions skeleton-actions">
        <span class="btn skeleton-btn"></span>
        <span class="btn skeleton-btn"></span>
      </div>
    </article>
  `).join('');

  cardsContainer.innerHTML = skeletons;
}

function showUploadStatus() {
  const uploadState = params.get('upload');
  if (!uploadStatus || !uploadState) return;

  uploadStatus.classList.remove('hidden', 'status-success', 'status-error');

  if (uploadState === 'success') {
    uploadStatus.textContent = 'La circular se subió correctamente.';
    uploadStatus.classList.add('status-success');
    return;
  }

  if (uploadState === 'error') {
    uploadStatus.textContent = 'No se pudo subir la circular.';
    uploadStatus.classList.add('status-error');
    return;
  }

  uploadStatus.classList.add('hidden');
}

function setupFilters() {
  const departments = [...new Set(circulares.map((c) => c.departamento).filter(Boolean))];
  const previousValue = departmentFilter.value;
  departmentFilter.innerHTML = '<option value="">Todos los departamentos</option>';
  departments.forEach((dep) => {
    const op = document.createElement('option');
    op.value = dep;
    op.textContent = dep;
    departmentFilter.appendChild(op);
  });
  if (previousValue && departments.includes(previousValue)) {
    departmentFilter.value = previousValue;
  }
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

function renderSelectedCircular() {
  const selectedId = params.get('id');
  if (!selectedId || !selectedCircularSection) return;

  const circular = circulares.find((item) => item.id === selectedId);
  if (!circular) {
    selectedCircularSection.classList.remove('hidden');
    selectedCircularMeta.innerHTML = '<p class="muted">No se encontró la circular seleccionada.</p>';
    selectedCircularFrame.classList.add('hidden');
    selectedCircularOpenPdf.classList.add('hidden');
    selectedCircularNoPdf.classList.remove('hidden');
    return;
  }

  selectedCircularSection.classList.remove('hidden');
  selectedCircularMeta.innerHTML = `
    <p><strong>Número:</strong> ${circular.numero || '-'}</p>
    <p><strong>Departamento:</strong> ${circular.departamento || '-'}</p>
    <p><strong>Fecha:</strong> ${circular.fecha || '-'}</p>
    <p><strong>Aplica a:</strong> ${circular.aplicaA || '-'}</p>
  `;

  if (circular.pdfUrl) {
    selectedCircularFrame.src = circular.pdfUrl;
    selectedCircularFrame.classList.remove('hidden');
    selectedCircularOpenPdf.href = circular.pdfUrl;
    selectedCircularOpenPdf.classList.remove('hidden');
    selectedCircularNoPdf.classList.add('hidden');
  } else {
    selectedCircularFrame.classList.add('hidden');
    selectedCircularOpenPdf.classList.add('hidden');
    selectedCircularNoPdf.classList.remove('hidden');
  }
}

function renderResults() {
  const term = (searchInput.value || '').trim();
  const dep = departmentFilter.value;

  const results = circulares.filter((c) => matchCircular(c, term, dep));

  if (!results.length) {
    setCardsStatus('No hay resultados con ese filtro.');
    return;
  }

  cardsContainer.innerHTML = results
    .map((c) => {
      const detailHref = `./detalle.html?id=${encodeURIComponent(c.id)}`;
      const pdfAction = c.pdfUrl
        ? `<a class="btn btn-secondary" href="${c.pdfUrl}" target="_blank" rel="noopener">Ver PDF</a>`
        : '<button class="btn btn-secondary" type="button" disabled title="Sin PDF asociado">Sin PDF</button>';

      return `
      <article class="card">
        <h3>${c.numero || '-'}</h3>
        <p><strong>Departamento:</strong> ${c.departamento || '-'}</p>
        <p><strong>Fecha:</strong> ${c.fecha || '-'}</p>
        <div class="actions">
          <a class="btn" href="${detailHref}">Ver detalle</a>
          ${pdfAction}
        </div>
      </article>
    `;
    })
    .join('');
}

function mergeCirculares(primary = [], fallback = []) {
  const byId = new Map();

  primary.forEach((item) => {
    if (!item?.id) return;
    byId.set(item.id, item);
  });

  fallback.forEach((item) => {
    if (!item?.id) return;
    const current = byId.get(item.id);
    if (!current) {
      byId.set(item.id, item);
      return;
    }

    if (!current.pdfUrl && item.pdfUrl) {
      byId.set(item.id, { ...current, pdfUrl: item.pdfUrl, storagePath: item.storagePath ?? current.storagePath });
    }
  });

  return Array.from(byId.values());
}

function updateCircularesFromFirestore(firestoreCirculares = []) {
  circulares = mergeCirculares(firestoreCirculares, []);

  if (!filtersInitialized) {
    setupFilters();
    filtersInitialized = true;
  }

  renderResults();
  renderSelectedCircular();
}

async function hydrateMissingPdfUrls(firestoreCirculares = []) {
  const missingPdfIds = firestoreCirculares
    .filter((item) => item?.id && !item.pdfUrl)
    .map((item) => item.id);

  if (!missingPdfIds.length) return;

  const storageFallback = await listCircularesFromStorage({ onlyIds: missingPdfIds }).catch((error) => {
    console.error('Error al consultar fallback de PDFs en Storage.', error);
    return [];
  });

  if (!storageFallback.length) return;

  circulares = mergeCirculares(firestoreCirculares, storageFallback);
  setupFilters();
  renderResults();
  renderSelectedCircular();
}

async function loadCircularesOnce() {
  if (stopCircularesListener) return;

  stopCircularesListener = listenCirculares((firestoreCirculares) => {
    hasRenderedFirestoreSnapshot = true;
    updateCircularesFromFirestore(firestoreCirculares);

    hydrateMissingPdfUrls(firestoreCirculares).catch((error) => {
      console.error('Error inesperado en hidratación de PDFs.', error);
    });
  }, (error) => {
    console.error('Error al escuchar circulares desde Firestore.', error);
    stopCircularesListener = null;

    if (!hasRenderedFirestoreSnapshot) {
      setCardsStatus('No se pudieron cargar las circulares.');
    }
  });
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

showUploadStatus();

firestorePersistenceReady
  .catch((error) => {
    console.warn('Firestore persistence no pudo inicializarse. Se continuará sin cache persistente.', error);
  })
  .finally(() => {
    const canEnter = initPublicAccessGate();
    if (!canEnter) {
      setCardsStatus('Ingresa la clave de acceso para consultar circulares.');
      return;
    }

    showView();
    showCardsSkeleton();
    loadCircularesOnce().catch((error) => {
      console.error('Error inesperado al inicializar la carga de circulares.', error);
      setCardsStatus('No se pudieron cargar las circulares.');
    });
  });

window.addEventListener('beforeunload', () => {
  stopCircularesListener?.();
});
