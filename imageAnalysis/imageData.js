// imageData.js
// Modular dummy data for imageAnalysis UI.
// Exports:
//   TAGS - array of available tags (can add/remove tags here)
//   IMAGES - array of image objects: { id, filename, date, tags, thumbnail, full }
// Thumbnail and full fields are data-URI SVG placeholders for now. Replace with real URLs later.

export const TAGS = [
  'receipt',
  'screen',
  'document',
  'handwritten',
  'invoice',
  'photo',
  'label'
];

function makeSvgDataUri(text, width = 400, height = 240, bg = '#f3f4f6', fg = '#111') {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>` +
    `<rect width='100%' height='100%' fill='${bg}'/>` +
    `<g font-family='Segoe UI, Roboto, Arial, sans-serif' font-size='18' fill='${fg}'>` +
    `<text x='50%' y='45%' dominant-baseline='middle' text-anchor='middle' font-size='20'>${text}</text>` +
    `<text x='50%' y='65%' dominant-baseline='middle' text-anchor='middle' font-size='12' opacity='0.7'>${width}×${height}</text>` +
    `</g></svg>`;

  // safe base64 encode for browsers
  try {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  } catch (e) {
    // Fallback for environments where btoa/unescape is not available
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
}

const now = new Date();
function daysAgo(n) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export const IMAGES = [
  {
    id: 'img-001',
    filename: 'screenshot-001.png',
    date: daysAgo(2),
    user: 'alice',
    keywords: ['screen', 'photo'],
    tags: ['screen', 'photo'],
    thumbnail: makeSvgDataUri('screenshot-001', 240, 140, '#ffffff', '#0f172a'),
    full: makeSvgDataUri('screenshot-001 (full)', 1200, 800, '#ffffff', '#0f172a')
  },
  {
    id: 'img-002',
    filename: 'receipt-2025-09-21.jpg',
    date: daysAgo(30),
    user: 'bob',
    keywords: ['receipt', 'invoice'],
    tags: ['receipt', 'invoice'],
    thumbnail: makeSvgDataUri('receipt-2025-09-21', 240, 140, '#fff7ed', '#92400e'),
    full: makeSvgDataUri('receipt-2025-09-21 (full)', 1200, 1600, '#fff7ed', '#92400e')
  },
  {
    id: 'img-003',
    filename: 'note-handwritten.png',
    date: daysAgo(10),
    user: 'carla',
    keywords: ['handwritten', 'document'],
    tags: ['handwritten', 'document'],
    thumbnail: makeSvgDataUri('note-handwritten', 240, 140, '#f8fafc', '#075985'),
    full: makeSvgDataUri('note-handwritten (full)', 1200, 1600, '#f8fafc', '#075985')
  },
  {
    id: 'img-004',
    filename: 'invoice_42.pdf.png',
    date: daysAgo(5),
    user: 'alice',
    keywords: ['invoice', 'document'],
    tags: ['invoice', 'document'],
    thumbnail: makeSvgDataUri('invoice_42', 240, 140, '#f1f5f9', '#064e3b'),
    full: makeSvgDataUri('invoice_42 (full)', 1200, 800, '#f1f5f9', '#064e3b')
  },
  {
    id: 'img-005',
    filename: 'product-label.jpg',
    date: daysAgo(60),
    user: 'bob',
    keywords: ['label', 'photo'],
    tags: ['label', 'photo'],
    thumbnail: makeSvgDataUri('product-label', 240, 140, '#ecfeff', '#065f46'),
    full: makeSvgDataUri('product-label (full)', 1200, 800, '#ecfeff', '#065f46')
  }
];

// Notes for integrators:
// - Replace the `thumbnail` and `full` values with actual file URLs or blob URLs from the backend.
// - Dates are ISO YYYY-MM-DD strings here but can be changed to timestamps if desired.
