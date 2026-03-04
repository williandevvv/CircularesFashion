// ============================================================
// ADMIN — gestión de circulares y usuarios
// ============================================================
import { db, firebaseConfig } from "./firebase-config.js";
import { guardAdmin } from "./guard-admin.js";
import { logout } from "./auth.js";
import {
  getCirculares, createCircular, updateCircular, deleteCircular,
  getUsers, updateUserDoc, createUserDoc
} from "./db.js";
import { uploadPDF, deletePDF } from "./storage.js";
import {
  formatDate, showToast, confirmDialog, APP_CONFIG,
  getInitials, setText, showAlertIn, clearAlertIn
} from "./app-config.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

let adminProfile      = null;
let allCirculares     = [];
let allUsers          = [];
let editingId         = null;
let editingPdfPath    = null;

// ── INIT ──────────────────────────────────────────────────────
(async () => {
  adminProfile = await guardAdmin();
  setText("admin-name", adminProfile.displayname || adminProfile.email);
  setText("admin-role", adminProfile.role);
  const av = document.getElementById("admin-avatar");
  if (av) av.textContent = getInitials(adminProfile.displayname || adminProfile.email);

  setupTabs();
  setupCircularModal();
  setupUserModal();
  setupConfirm();
  await Promise.all([loadCirculares(), loadUsers()]);
})();

// ── TABS ──────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab)?.classList.add("active");
    });
  });
}

// ════════════════════════════════════════════════════════════════
// CIRCULARES
// ════════════════════════════════════════════════════════════════
async function loadCirculares() {
  try {
    allCirculares = await getCirculares();
    renderCirculares(allCirculares);
    buildDeptFilter();
  } catch (e) { showToast("Error cargando circulares: " + e.message, "error"); }
}

function renderCirculares(list) {
  setText("circulares-count", list.length);
  const tbody = document.getElementById("circulares-tbody");
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--slate-400)">Sin circulares registradas</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(c => `
    <tr>
      <td data-label="Número"><strong class="text-blue">${c.numero||"—"}</strong></td>
      <td data-label="Departamento">${c.departamento||"—"}</td>
      <td data-label="Aplica A"><span class="text-muted">${c.aplicaA||"—"}</span></td>
      <td data-label="Fecha">${formatDate(c.fecha)}</td>
      <td data-label="Creado">${formatDate(c.createdAt)}</td>
      <td data-label="Acciones">
        <div class="td-actions">
          <a href="detalle.html?id=${c.id}" class="btn btn-ghost btn-sm" title="Ver">👁 Ver</a>
          <button class="btn btn-outline btn-sm" onclick="window._editC('${c.id}')">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="window._deleteC('${c.id}','${(c.numero||'').replace(/'/g,'')}')" >🗑 Eliminar</button>
        </div>
      </td>
    </tr>`).join("");
}

function buildDeptFilter() {
  const sel = document.getElementById("filter-dept-admin");
  if (!sel) return;
  const depts = [...new Set(allCirculares.map(c => c.departamento).filter(Boolean))].sort();
  sel.innerHTML = `<option value="">Todos los departamentos</option>` +
    depts.map(d => `<option value="${d}">${d}</option>`).join("");
  sel.onchange = filterCircularTable;
  const si = document.getElementById("search-admin");
  if (si) si.oninput = filterCircularTable;
}

function filterCircularTable() {
  const q    = (document.getElementById("search-admin")?.value||"").toLowerCase();
  const dept = document.getElementById("filter-dept-admin")?.value||"";
  let res = allCirculares;
  if (q)    res = res.filter(c => (c.numero||"").toLowerCase().includes(q)||(c.departamento||"").toLowerCase().includes(q)||(c.aplicaA||"").toLowerCase().includes(q));
  if (dept) res = res.filter(c => c.departamento === dept);
  renderCirculares(res);
}

// ── Modal circular ────────────────────────────────────────────
function setupCircularModal() {
  document.getElementById("btn-nueva-circular")?.addEventListener("click", () => openCircularModal(null));
  document.getElementById("modal-circ-close")?.addEventListener("click",  closeCircularModal);
  document.getElementById("modal-circ-cancel")?.addEventListener("click", closeCircularModal);
  document.getElementById("form-circular")?.addEventListener("submit",    handleSaveCircular);

  // File display
  const fi = document.getElementById("pdf-file");
  if (fi) fi.addEventListener("change", () => {
    const f    = fi.files[0];
    const span = document.getElementById("file-label");
    if (span) { span.textContent = f ? f.name : "Seleccionar PDF (.pdf)"; span.className = f ? "file-name" : "file-text"; }
  });

  // Populate dept select
  const ds = document.getElementById("ci-departamento");
  if (ds) ds.innerHTML = APP_CONFIG.departments.map(d => `<option value="${d}">${d}</option>`).join("");
}

function openCircularModal(c) {
  editingId      = c ? c.id   : null;
  editingPdfPath = c ? c.pdfPath : null;
  setText("modal-circ-title", c ? "Editar Circular" : "Nueva Circular");
  document.getElementById("ci-numero").value     = c?.numero      || "";
  document.getElementById("ci-departamento").value = c?.departamento|| APP_CONFIG.departments[0];
  document.getElementById("ci-fecha").value      = c?.fecha?.substring?.(0,10) || new Date().toISOString().substring(0,10);
  document.getElementById("ci-aplicaA").value    = c?.aplicaA     || "";
  const fi = document.getElementById("pdf-file");
  if (fi) { fi.value = ""; fi.required = !c; }
  const note  = document.getElementById("pdf-replace-note");
  if (note) note.classList.toggle("hidden", !c);
  const label = document.getElementById("file-label");
  if (label) { label.textContent = "Seleccionar PDF (.pdf)"; label.className = "file-text"; }
  clearAlertIn("alert-circular");
  document.getElementById("progress-bar").style.width = "0%";
  document.getElementById("upload-progress").classList.remove("active");
  document.getElementById("modal-circular").classList.remove("hidden");
}

function closeCircularModal() {
  document.getElementById("modal-circular").classList.add("hidden");
  document.getElementById("form-circular").reset();
  editingId = editingPdfPath = null;
}

async function handleSaveCircular(e) {
  e.preventDefault();
  const btn  = document.getElementById("btn-save-circular");
  const file = document.getElementById("pdf-file").files[0];
  if (!editingId && !file) { showAlertIn("alert-circular","El archivo PDF es obligatorio.","error"); return; }

  const data = {
    numero:       document.getElementById("ci-numero").value.trim(),
    departamento: document.getElementById("ci-departamento").value,
    fecha:        document.getElementById("ci-fecha").value,
    aplicaA:      document.getElementById("ci-aplicaA").value.trim()
  };

  btn.disabled = true; btn.textContent = "Guardando...";
  const prog  = document.getElementById("upload-progress");
  const bar   = document.getElementById("progress-bar");
  const ptext = document.getElementById("progress-text");

  try {
    if (file) {
      prog.classList.add("active");
      const tempId = editingId || "tmp_" + Date.now();
      const { url, path } = await uploadPDF(file, tempId, pct => {
        bar.style.width = pct + "%";
        ptext.textContent = `Subiendo PDF… ${pct}%`;
      });
      if (editingId && editingPdfPath) await deletePDF(editingPdfPath);
      data.pdfUrl  = url;
      data.pdfPath = path;
    }

    if (editingId) {
      await updateCircular(editingId, data);
      showToast("Circular actualizada correctamente", "success");
    } else {
      data.createdBy = adminProfile.uid;
      await createCircular(data);
      showToast("Circular creada correctamente", "success");
    }
    closeCircularModal();
    await loadCirculares();
  } catch (err) {
    showAlertIn("alert-circular", err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "Guardar Circular";
    prog.classList.remove("active");
  }
}

window._editC = id => {
  const c = allCirculares.find(x => x.id === id);
  if (c) openCircularModal(c);
};

window._deleteC = async (id, numero) => {
  const ok = await confirmDialog("Eliminar circular", `¿Eliminar la circular ${numero}? Esta acción no se puede deshacer.`);
  if (!ok) return;
  try {
    const c = allCirculares.find(x => x.id === id);
    if (c?.pdfPath) await deletePDF(c.pdfPath);
    await deleteCircular(id);
    showToast("Circular eliminada", "success");
    await loadCirculares();
  } catch (e) { showToast("Error: " + e.message, "error"); }
};

// ════════════════════════════════════════════════════════════════
// USUARIOS
// ════════════════════════════════════════════════════════════════
async function loadUsers() {
  try {
    allUsers = await getUsers();
    renderUsers(allUsers);
  } catch (e) { showToast("Error cargando usuarios: " + e.message, "error"); }
}

function renderUsers(list) {
  setText("users-count", list.length);
  const tbody = document.getElementById("users-tbody");
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:48px;color:var(--slate-400)">Sin usuarios</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(u => `
    <tr>
      <td data-label="Nombre">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="user-avatar" style="width:32px;height:32px;font-size:0.75rem;flex-shrink:0">${getInitials(u.displayname||u.email)}</div>
          <strong>${u.displayname||"—"}</strong>
        </div>
      </td>
      <td data-label="Email"><span class="text-muted">${u.email||"—"}</span></td>
      <td data-label="Rol">
        <select class="form-control" style="min-width:110px;padding:6px 10px;font-size:0.8rem"
          onchange="window._updateRole('${u.id}',this.value)">
          ${APP_CONFIG.roles.map(r=>`<option value="${r}"${u.role===r?" selected":""}>${r}</option>`).join("")}
        </select>
      </td>
      <td data-label="Activo">
        <label class="toggle">
          <input type="checkbox" ${u.isActive?"checked":""} onchange="window._toggleActive('${u.id}',this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td data-label="Creado">${formatDate(u.createdAt)}</td>
    </tr>`).join("");
}

window._updateRole = async (uid, role) => {
  try {
    await updateUserDoc(uid, { role });
    allUsers = allUsers.map(u => u.id === uid ? {...u, role} : u);
    showToast("Rol actualizado", "success");
  } catch (e) { showToast("Error: " + e.message, "error"); }
};

window._toggleActive = async (uid, isActive) => {
  try {
    await updateUserDoc(uid, { isActive });
    allUsers = allUsers.map(u => u.id === uid ? {...u, isActive} : u);
    showToast(isActive ? "Usuario activado" : "Usuario desactivado", isActive ? "success" : "info");
  } catch (e) { showToast("Error: " + e.message, "error"); }
};

// ── Modal usuario ─────────────────────────────────────────────
function setupUserModal() {
  document.getElementById("btn-nuevo-usuario")?.addEventListener("click", openUserModal);
  document.getElementById("modal-user-close")?.addEventListener("click",  closeUserModal);
  document.getElementById("modal-user-cancel")?.addEventListener("click", closeUserModal);
  document.getElementById("form-user")?.addEventListener("submit",        handleCreateUser);
}

function openUserModal() {
  clearAlertIn("alert-user");
  document.getElementById("form-user").reset();
  document.getElementById("u-isActive").checked = true;
  document.getElementById("modal-user").classList.remove("hidden");
}
function closeUserModal() {
  document.getElementById("modal-user").classList.add("hidden");
  document.getElementById("form-user").reset();
}

async function handleCreateUser(e) {
  e.preventDefault();
  const btn         = document.getElementById("btn-save-user");
  const displayname = document.getElementById("u-displayname").value.trim();
  const email       = document.getElementById("u-email").value.trim();
  const password    = document.getElementById("u-password").value;
  const role        = document.getElementById("u-role").value;
  const isActive    = document.getElementById("u-isActive").checked;

  btn.disabled = true; btn.textContent = "Creando...";
  try {
    // Crear en Auth sin cerrar sesión del admin
    const secApp  = initializeApp(firebaseConfig, "create_user_" + Date.now());
    const secAuth = getAuth(secApp);
    const cred    = await createUserWithEmailAndPassword(secAuth, email, password);
    const uid     = cred.user.uid;
    await secAuth.signOut();

    // Crear doc en Firestore
    await createUserDoc(uid, { displayname, email, role, isActive });

    showToast("Usuario creado correctamente", "success");
    closeUserModal();
    await loadUsers();
  } catch (err) {
    showAlertIn("alert-user", err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "Crear Usuario";
  }
}

// ── Confirm dialog ────────────────────────────────────────────
function setupConfirm() {
  document.getElementById("confirm-no")?.addEventListener("click", () => {
    document.getElementById("confirm-overlay").classList.add("hidden");
  });
}

// ── Logout ────────────────────────────────────────────────────
document.getElementById("btn-logout")?.addEventListener("click", async () => {
  await logout(); location.replace("./index.html");
});
