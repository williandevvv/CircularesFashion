import {
  db,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "./firebase-config.js";
import { ensureSession, bindLogout } from "./auth.js";

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultsContainer = document.getElementById("resultsContainer");
const departmentFilter = document.getElementById("departmentFilter");
const welcomeText = document.getElementById("welcomeText");
const adminNavLink = document.getElementById("adminNavLink");

const isCircularNumber = (value) => /^\d{2,4}-\d{1,3}$/i.test(value);

const buildTable = (rows = []) => {
  if (!rows.length) return "<p>Sin tabla editable.</p>";
  const body = rows
    .map(
      (row) => `
      <tr>
        <td>${row.codigo || ""}</td>
        <td contenteditable="true">${row.descripcion || ""}</td>
        <td contenteditable="true">${row.precioAnterior || ""}</td>
        <td contenteditable="true">${row.precioNuevo || ""}</td>
        <td contenteditable="true">${row.observaciones || ""}</td>
      </tr>`
    )
    .join("");

  return `<div class="table-wrap"><table><thead><tr><th>Código</th><th>Descripción</th><th>Precio anterior</th><th>Precio nuevo</th><th>Observaciones</th></tr></thead><tbody>${body}</tbody></table></div>`;
};

const renderCards = (docs) => {
  if (!docs.length) {
    resultsContainer.innerHTML = '<article class="card result-card"><p>No se encontraron circulares.</p></article>';
    return;
  }

  resultsContainer.innerHTML = docs
    .map((item) => {
      const data = item.data();
      return `
      <article class="card result-card">
        <div class="badge">Circular ${data.numero}</div>
        <h3>${data.departamento}</h3>
        <p><strong>Fecha:</strong> ${data.fecha || "-"}</p>
        <p><strong>Aplica a:</strong> ${data.aplicaA || "-"}</p>
        <div class="row-actions">
          <a class="link-btn" href="${data.pdfUrl}" target="_blank" rel="noopener">Ver PDF</a>
        </div>
        ${buildTable(data.tabla)}
      </article>`;
    })
    .join("");
};

const getAllCirculares = async () => {
  const snap = await getDocs(query(collection(db, "circulares"), orderBy("createdAt", "desc")));
  return snap.docs;
};

const searchCirculares = async () => {
  const text = searchInput.value.trim().toUpperCase();
  const department = departmentFilter.value;

  let snap;
  if (!text) {
    snap = await getAllCirculares();
  } else if (isCircularNumber(text)) {
    snap = (await getDocs(query(collection(db, "circulares"), where("numero", "==", text)))).docs;
  } else {
    snap = (await getDocs(query(collection(db, "circulares"), where("codigos", "array-contains", text)))).docs;
  }

  if (department) {
    snap = snap.filter((doc) => doc.data().departamento === department);
  }

  renderCards(snap);
};

const hydrateDepartments = async (docs) => {
  const departments = [...new Set(docs.map((item) => item.data().departamento).filter(Boolean))];
  departments.forEach((dep) => {
    const option = document.createElement("option");
    option.value = dep;
    option.textContent = dep;
    departmentFilter.appendChild(option);
  });
};

(async () => {
  const session = await ensureSession();
  bindLogout();

  welcomeText.textContent = `Usuario: ${session.user.email} · Rol: ${session.role}`;
  if (session.role === "admin") adminNavLink.classList.remove("hidden");

  const docs = await getAllCirculares();
  await hydrateDepartments(docs);
  renderCards(docs);

  searchBtn.addEventListener("click", searchCirculares);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchCirculares();
  });
})();
