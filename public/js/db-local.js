const DB_KEY = 'cf_circulares';

function parseCirculares(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sortByCreatedAtDesc(items) {
  return [...items].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

export function getAllCirculares() {
  return sortByCreatedAtDesc(parseCirculares(localStorage.getItem(DB_KEY)));
}

export function getCirculares() {
  return getAllCirculares();
}

export function saveCirculares(items) {
  localStorage.setItem(DB_KEY, JSON.stringify(sortByCreatedAtDesc(items)));
}

export function saveCircular(circular) {
  const all = getAllCirculares();
  const index = all.findIndex((item) => item.id === circular.id);

  if (index >= 0) {
    all[index] = { ...all[index], ...circular };
  } else {
    all.push(circular);
  }

  saveCirculares(all);
  return circular;
}

export function addCircular(circular) {
  return saveCircular(circular);
}

export function getCircularById(id) {
  return getAllCirculares().find((c) => c.id === id) || null;
}

export function deleteCircularById(id) {
  const all = getAllCirculares();
  const filtered = all.filter((c) => c.id !== id);

  if (filtered.length === all.length) {
    return false;
  }

  saveCirculares(filtered);
  return true;
}

export function updateCircularById(id, partialData) {
  const all = getAllCirculares();
  const index = all.findIndex((c) => c.id === id);

  if (index === -1) {
    return null;
  }

  all[index] = { ...all[index], ...partialData };
  saveCirculares(all);
  return all[index];
}

export function replaceCircularById(id, fullObject) {
  const all = getAllCirculares();
  const index = all.findIndex((c) => c.id === id);

  if (index === -1) {
    return null;
  }

  all[index] = { ...fullObject, id };
  saveCirculares(all);
  return all[index];
}

export function updateCircular(id, patch) {
  return updateCircularById(id, patch);
}
