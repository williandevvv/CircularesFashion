// ============================================================
// DETALLE — vista individual de circular con visor PDF
// ============================================================
import { onAuth, getUserProfile, logout } from "./auth.js";
import { getCircular } from "./db.js";
import { formatDate, showToast, getInitials, setText } from "./app-config.js";

const params     = new URLSearchParams(location.search);
const circularId = params.get("id");
let currentUser  = null;

// ── Auth guard ────────────────────────────────────────────────
onAuth(async user => {
  if (!user) { location.replace("./index.html"); return; }
  const profile = await getUserProfile(user.uid);
  if (!profile?.isActive) { await logout(); location.replace("./index.html"); return; }
  currentUser = profile;
  renderNavUser();
  if (!circularId) { showLoadError("No se especificó una circular."); return; }
  await loadCircular();
});

function renderNavUser() {
  setText("user-name",   currentUser.displayname || currentUser.email);
  setText("user-role",   currentUser.role);
  const av = document.getElementById("user-avatar");
  if (av) av.textContent = getInitials(currentUser.displayname || currentUser.email);
}

async function loadCircular() {
  try {
    const c = await getCircular(circularId);
    if (!c) { showLoadError("Circular no encontrada."); return; }
    document.getElementById("loading")?.classList.add("hidden");
    document.getElementById("circular-content")?.classList.remove("hidden");
    renderCircular(c);
  } catch (err) {
    showLoadError("Error al cargar: " + err.message);
  }
}

function renderCircular(c) {
  document.title = `Circular ${c.numero || ""} — Circulares Fashion`;
  setText("det-numero",  c.numero      || "—");
  setText("det-dept",    c.departamento|| "—");
  setText("det-dept-badge", c.departamento || "—");
  setText("det-aplica",  c.aplicaA     || "—");
  setText("det-fecha",   formatDate(c.fecha));
  setText("det-created", formatDate(c.createdAt));

  const iframe  = document.getElementById("pdf-iframe");
  const openBtn = document.getElementById("btn-open-pdf");
  const openBtn2= document.getElementById("btn-open-pdf2");

  if (c.pdfUrl) {
    if (iframe)  { iframe.src = c.pdfUrl; }
    if (openBtn) { openBtn.href = c.pdfUrl; openBtn.classList.remove("hidden"); }
    if (openBtn2){ openBtn2.href = c.pdfUrl; }
  } else {
    const ps = document.getElementById("pdf-section");
    if (ps) ps.innerHTML = '<p class="text-muted" style="padding:32px;text-align:center">No hay PDF asociado a esta circular.</p>';
  }
}

function showLoadError(msg) {
  const el = document.getElementById("loading");
  if (el) el.innerHTML = `<div class="alert alert-error" style="max-width:440px;margin:0 auto">${msg}</div>`;
}

// ── Eventos ───────────────────────────────────────────────────
document.getElementById("btn-back")?.addEventListener("click", () => history.length > 1 ? history.back() : location.replace("./index.html"));
document.getElementById("btn-logout")?.addEventListener("click", async () => { await logout(); location.replace("./index.html"); });
