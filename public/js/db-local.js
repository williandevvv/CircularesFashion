const DB_KEY = 'cf_circulares';

export function getCirculares() {
  return JSON.parse(localStorage.getItem(DB_KEY) || '[]');
}

export function saveCirculares(items) {
  localStorage.setItem(DB_KEY, JSON.stringify(items));
}

export function addCircular(circular) {
  const all = getCirculares();
  all.unshift(circular);
  saveCirculares(all);
}

export function getCircularById(id) {
  return getCirculares().find((c) => c.id === id) || null;
}

export function updateCircular(id, patch) {
  const all = getCirculares();
  const updated = all.map((c) => (c.id === id ? { ...c, ...patch } : c));
  saveCirculares(updated);
  return updated.find((c) => c.id === id) || null;
}
