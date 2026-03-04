// ============================================================
// SEARCH — filtrado cliente de circulares
// ============================================================
export function filterCirculares(circulares, query, department) {
  let res = [...circulares];
  if (query?.trim()) {
    const q = query.trim().toLowerCase();
    res = res.filter(c =>
      (c.numero      || "").toLowerCase().includes(q) ||
      (c.departamento|| "").toLowerCase().includes(q) ||
      (c.aplicaA     || "").toLowerCase().includes(q)
    );
  }
  if (department && department !== "all") {
    res = res.filter(c => (c.departamento || "").toLowerCase() === department.toLowerCase());
  }
  return res;
}

export function extractDepartments(circulares) {
  return [...new Set(circulares.map(c => c.departamento).filter(Boolean))].sort();
}
