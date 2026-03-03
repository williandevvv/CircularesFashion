import { getCircularById, updateCircular } from './db-local.js';
import { currentSession, logout } from './auth.js';

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

const metaEl = document.getElementById('meta');
const tableBody = document.getElementById('tablaBody');
const btnSave = document.getElementById('btnSave');
const pdfWrap = document.getElementById('pdfWrap');
const btnLogout = document.getElementById('btnLogout');
const userBadge = document.getElementById('userBadge');

const session = currentSession();
if (!session) {
  window.location.replace('./index.html');
}
if (session) {
  userBadge.textContent = `${session.email} (${session.role})`;
}

const circular = getCircularById(id);
if (!circular) {
  metaEl.innerHTML = '<p>No se encontró la circular.</p>';
  btnSave.disabled = true;
} else {
  metaEl.innerHTML = `
    <p><strong>Número:</strong> ${circular.numero}</p>
    <p><strong>Departamento:</strong> ${circular.departamento}</p>
    <p><strong>Fecha:</strong> ${circular.fecha}</p>
    <p><strong>Aplica a:</strong> ${circular.aplicaA}</p>
  `;

  if (circular.pdfLink) {
    pdfWrap.innerHTML = `<a class="btn" href="${circular.pdfLink}" target="_blank" rel="noopener">Ver PDF</a>`;
  }

  tableBody.innerHTML = circular.tabla
    .map(
      (row, index) => `
      <tr>
        <td>${row.codigo}</td>
        <td><input data-field="descripcion" data-index="${index}" value="${row.descripcion || ''}"></td>
        <td><input data-field="precioAnterior" data-index="${index}" value="${row.precioAnterior || ''}"></td>
        <td><input data-field="precioNuevo" data-index="${index}" value="${row.precioNuevo || ''}"></td>
        <td><input data-field="observaciones" data-index="${index}" value="${row.observaciones || ''}"></td>
      </tr>
    `
    )
    .join('');
}

btnSave?.addEventListener('click', () => {
  if (!circular) return;
  const tablaActualizada = circular.tabla.map((row, index) => {
    const inputBy = (field) =>
      document.querySelector(`input[data-field="${field}"][data-index="${index}"]`)?.value?.trim() || '';

    return {
      ...row,
      descripcion: inputBy('descripcion'),
      precioAnterior: inputBy('precioAnterior'),
      precioNuevo: inputBy('precioNuevo'),
      observaciones: inputBy('observaciones')
    };
  });

  updateCircular(circular.id, { tabla: tablaActualizada });
  alert('Cambios guardados.');
});

btnLogout?.addEventListener('click', () => {
  logout();
  window.location.replace('./index.html');
});
