// ============================================================
// APP CONFIG — constantes, utilidades globales
// ============================================================

export const APP_CONFIG = {
  name: "Circulares Fashion",
  adminEmail: "admin@circulares.fs",
  adminPassword: "Admin123!",
  adminDisplayname: "Administrador",
  roles: ["admin", "auditor", "usuario"],
  departments: [
    "Dirección General","Recursos Humanos","Finanzas",
    "Operaciones","Ventas","Marketing","Logística",
    "Tecnología","Diseño","Producción","Legal","General"
  ]
};

// ── Toast notifications ──────────────────────────────────────
export function showToast(msg, type = "info", duration = 3500) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const icons = { success:"✅", error:"❌", info:"ℹ️", warning:"⚠️" };
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]||"ℹ️"}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.3s,transform 0.3s";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(12px)";
    setTimeout(() => toast.remove(), 320);
  }, duration);
}

// ── Date formatter ────────────────────────────────────────────
export function formatDate(val) {
  if (!val) return "—";
  try {
    if (val?.toDate) val = val.toDate();
    if (typeof val === "string") val = new Date(val);
    if (isNaN(val)) return "—";
    return val.toLocaleDateString("es-HN", { day:"2-digit", month:"short", year:"numeric" });
  } catch { return "—"; }
}

// ── Initials from name ────────────────────────────────────────
export function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(0,2).join("").toUpperCase();
}

// ── Confirm dialog ────────────────────────────────────────────
export function confirmDialog(title, message) {
  return new Promise(resolve => {
    const overlay = document.getElementById("confirm-overlay");
    if (!overlay) { resolve(window.confirm(message)); return; }
    const titleEl = document.getElementById("confirm-title");
    const msgEl   = document.getElementById("confirm-msg");
    if (titleEl) titleEl.textContent = title;
    if (msgEl)   msgEl.textContent   = message;
    overlay.classList.remove("hidden");
    const yes = document.getElementById("confirm-yes");
    const no  = document.getElementById("confirm-no");
    const close = () => { overlay.classList.add("hidden"); yes.onclick = null; no.onclick = null; };
    yes.onclick = () => { close(); resolve(true); };
    no.onclick  = () => { close(); resolve(false); };
  });
}

// ── Helper: set element text ──────────────────────────────────
export function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? "—";
}

// ── Helper: show alert inside a container ────────────────────
export function showAlertIn(id, msg, type = "error") {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove("hidden");
}

export function clearAlertIn(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = "alert hidden";
  el.textContent = "";
}
