const STOPWORDS = new Set([
  'MOTIVO', 'CIRCULAR', 'DEPTO', 'FECHA', 'AUTORIZADO', 'GERENCIA', 'DEPARTAMENTO',
  'CODIGO', 'CODIGOS', 'TIENDA', 'TIENDAS', 'APLICA', 'PARA', 'DEL', 'LAS', 'LOS',
  'PRECIO', 'NUEVO', 'ANTERIOR', 'OBSERVACIONES'
]);

const CODE_REGEX = /\b[A-Z]{2,}[A-Z0-9]*(?:-[A-Z0-9]+)*\b/g;

let pdfLibPromise = null;

async function loadPdfJs() {
  if (!pdfLibPromise) {
    pdfLibPromise = import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.min.mjs').then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs';
      return pdfjsLib;
    });
  }
  return pdfLibPromise;
}

export async function extractCodesFromPdf(file) {
  if (!file) return [];

  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const found = new Set();

  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item) => item.str).join(' ');
    const matches = text.match(CODE_REGEX) || [];

    matches.forEach((token) => {
      const cleaned = token.trim().toUpperCase();
      if (!cleaned) return;
      if (STOPWORDS.has(cleaned)) return;
      if (cleaned.length < 4) return;
      found.add(cleaned);
    });
  }

  return Array.from(found);
}
