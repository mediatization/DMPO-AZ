// imageData.js (Updated: 50 entries, 'tags' field removed)
// Modular dummy data for imageAnalysis UI.
// Exports:
//   TAGS - array of available tags (legacy reference)
//   IMAGES - array of image objects: { id, filename, date, user, keywords, thumbnail, full }
// Note: 'keywords' now serves as the primary search field (simulating OCR output).
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

const now = new Date(); // Note: Original date generation uses this for relative daysAgo()
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
    thumbnail: makeSvgDataUri('screenshot-001', 240, 140, '#ffffff', '#0f172a'),
    full: makeSvgDataUri('screenshot-001 (full)', 1200, 800, '#ffffff', '#0f172a')
  },
  {
    id: 'img-002',
    filename: 'receipt-2025-09-21.jpg',
    date: daysAgo(30),
    user: 'bob',
    keywords: ['receipt', 'invoice'],
    thumbnail: makeSvgDataUri('receipt-2025-09-21', 240, 140, '#fff7ed', '#92400e'),
    full: makeSvgDataUri('receipt-2025-09-21 (full)', 1200, 1600, '#fff7ed', '#92400e')
  },
  {
    id: 'img-003',
    filename: 'note-handwritten.png',
    date: daysAgo(10),
    user: 'carla',
    keywords: ['handwritten', 'document'],
    thumbnail: makeSvgDataUri('note-handwritten', 240, 140, '#f8fafc', '#075985'),
    full: makeSvgDataUri('note-handwritten (full)', 1200, 1600, '#f8fafc', '#075985')
  },
  {
    id: 'img-004',
    filename: 'invoice_42.pdf.png',
    date: daysAgo(5),
    user: 'alice',
    keywords: ['invoice', 'document'],
    thumbnail: makeSvgDataUri('invoice_42', 240, 140, '#f1f5f9', '#064e3b'),
    full: makeSvgDataUri('invoice_42 (full)', 1200, 800, '#f1f5f9', '#064e3b')
  },
  {
    id: 'img-005',
    filename: 'product-label.jpg',
    date: daysAgo(60),
    user: 'bob',
    keywords: ['label', 'photo'],
    thumbnail: makeSvgDataUri('product-label', 240, 140, '#ecfeff', '#065f46'),
    full: makeSvgDataUri('product-label (full)', 1200, 800, '#ecfeff', '#065f46')
  },
{
    id: 'img-006',
    filename: 'invoice-2025-07-27-6.heic',
    date: daysAgo(86),
    user: 'alice',
    keywords: ['invoice'],
    thumbnail: makeSvgDataUri('Invoice #6', 240, 140, '#fff7ed', '#111'),
    full: makeSvgDataUri('Invoice #6 (full)', 1200, 1600, '#fff7ed', '#111')
  },
{
    id: 'img-007',
    filename: 'receipt-2025-08-31-7.png',
    date: daysAgo(51),
    user: 'jack',
    keywords: ['receipt'],
    thumbnail: makeSvgDataUri('Receipt #7', 240, 140, '#f3f4f6', '#064e3b'),
    full: makeSvgDataUri('Receipt #7 (full)', 1200, 1600, '#f3f4f6', '#064e3b')
  },
{
    id: 'img-008',
    filename: 'label-8.pdf',
    date: daysAgo(20),
    user: 'ivy',
    keywords: ['label'],
    thumbnail: makeSvgDataUri('Label 8', 240, 140, '#ecfeff', '#064e3b'),
    full: makeSvgDataUri('Label 8 (full)', 1200, 800, '#ecfeff', '#064e3b')
  },
{
    id: 'img-009',
    filename: 'note-2025-08-08-9.pdf',
    date: daysAgo(74),
    user: 'bob',
    keywords: ['document', 'handwritten', 'photo'],
    thumbnail: makeSvgDataUri('Note by bob', 240, 140, '#f8fafc', '#075985'),
    full: makeSvgDataUri('Note by bob (full)', 1200, 1600, '#f8fafc', '#075985')
  },
{
    id: 'img-010',
    filename: 'screenshot-2025-08-15-carla.pdf',
    date: daysAgo(67),
    user: 'carla',
    keywords: ['document', 'photo', 'screen'],
    thumbnail: makeSvgDataUri('Screen carla', 240, 140, '#ffffff', '#0f172a'),
    full: makeSvgDataUri('Screen carla (full)', 1200, 800, '#ffffff', '#0f172a')
  },
{
    id: 'img-011',
    filename: 'handwritten-2025-09-19-11.heic',
    date: daysAgo(32),
    user: 'frank',
    keywords: ['handwritten', 'invoice'],
    thumbnail: makeSvgDataUri('Handwritten #11', 240, 140, '#f3f4f6', '#064e3b'),
    full: makeSvgDataUri('Handwritten #11 (full)', 1200, 1600, '#f3f4f6', '#064e3b')
  },
{
    id: 'img-012',
    filename: 'screenshot-2025-08-01-alice.png',
    date: daysAgo(81),
    user: 'alice',
    keywords: ['screen'],
    thumbnail: makeSvgDataUri('Screen alice', 240, 140, '#ffffff', '#0f172a'),
    full: makeSvgDataUri('Screen alice (full)', 1200, 800, '#ffffff', '#0f172a')
  },
{
    id: 'img-013',
    filename: 'document-13.png',
    date: daysAgo(51),
    user: 'grace',
    keywords: ['document'],
    thumbnail: makeSvgDataUri('Document 13', 240, 140, '#f1f5f9', '#064e3b'),
    full: makeSvgDataUri('Document 13 (full)', 1200, 800, '#f1f5f9', '#064e3b')
  },
{
    id: 'img-014',
    filename: 'label-14.heic',
    date: daysAgo(13),
    user: 'ivy',
    keywords: ['label'],
    thumbnail: makeSvgDataUri('Label 14', 240, 140, '#f3f4f6', '#111'),
    full: makeSvgDataUri('Label 14 (full)', 1200, 800, '#f3f4f6', '#111')
  },
{
    id: 'img-015',
    filename: 'label-15.jpg',
    date: daysAgo(63),
    user: 'carla',
    keywords: ['label'],
    thumbnail: makeSvgDataUri('Label 15', 240, 140, '#f3f4f6', '#111'),
    full: makeSvgDataUri('Label 15 (full)', 1200, 800, '#f3f4f6', '#111')
  },
{
    id: 'img-016',
    filename: 'photo-16.jpg',
    date: daysAgo(69),
    user: 'jack',
    keywords: ['photo'],
    thumbnail: makeSvgDataUri('Photo 16', 240, 140, '#ecfeff', '#065f46'),
    full: makeSvgDataUri('Photo 16 (full)', 1200, 800, '#ecfeff', '#065f46')
  },
{
    id: 'img-017',
    filename: 'invoice-2025-10-05-17.jpg',
    date: daysAgo(16),
    user: 'grace',
    keywords: ['invoice', 'handwritten', 'label'],
    thumbnail: makeSvgDataUri('Invoice #17', 240, 140, '#f1f5f9', '#111'),
    full: makeSvgDataUri('Invoice #17 (full)', 1200, 1600, '#f1f5f9', '#111')
  },
{
    id: 'img-018',
    filename: 'note-2025-08-09-18.pdf',
    date: daysAgo(73),
    user: 'emma',
    keywords: ['handwritten'],
    thumbnail: makeSvgDataUri('Note by emma', 240, 140, '#f8fafc', '#075985'),
    full: makeSvgDataUri('Note by emma (full)', 1200, 1600, '#f8fafc', '#075985')
  },
{
    id: 'img-019',
    filename: 'screen-2025-10-18-19.pdf',
    date: daysAgo(3),
    user: 'frank',
    keywords: ['screen', 'receipt'],
    thumbnail: makeSvgDataUri('Screen #19', 240, 140, '#f3f4f6', '#064e3b'),
    full: makeSvgDataUri('Screen #19 (full)', 1200, 1600, '#f3f4f6', '#064e3b')
  },
{
    id: 'img-020',
    filename: 'handwritten-2025-08-17-20.pdf',
    date: daysAgo(65),
    user: 'ivy',
    keywords: ['handwritten', 'invoice'],
    thumbnail: makeSvgDataUri('Handwritten #20', 240, 140, '#fff7ed', '#064e3b'),
    full: makeSvgDataUri('Handwritten #20 (full)', 1200, 1600, '#fff7ed', '#064e3b')
  },
{
    id: 'img-021',
    filename: 'screenshot-2025-10-20-frank.pdf',
    date: daysAgo(1),
    user: 'frank',
    keywords: ['screen', 'label'],
    thumbnail: makeSvgDataUri('Screen frank', 240, 140, '#ffffff', '#0f172a'),
    full: makeSvgDataUri('Screen frank (full)', 1200, 800, '#ffffff', '#0f172a')
  },
{
    id: 'img-022',
    filename: 'invoice-2025-09-09-22.png',
    date: daysAgo(42),
    user: 'david',
    keywords: ['invoice'],
    thumbnail: makeSvgDataUri('Invoice #22', 240, 140, '#f3f4f6', '#111'),
    full: makeSvgDataUri('Invoice #22 (full)', 1200, 1600, '#f3f4f6', '#111')
  },
{
    id: 'img-023',
    filename: 'receipt-2025-09-20-23.jpg',
    date: daysAgo(31),
    user: 'ivy',
    keywords: ['receipt'],
    thumbnail: makeSvgDataUri('Receipt #23', 240, 140, '#f1f5f9', '#92400e'),
    full: makeSvgDataUri('Receipt #23 (full)', 1200, 1600, '#f1f5f9', '#92400e')
  },
{
    id: 'img-024',
    filename: 'document-2025-08-18-24.jpg',
    date: daysAgo(64),
    user: 'frank',
    keywords: ['document', 'handwritten', 'receipt'],
    thumbnail: makeSvgDataUri('Document #24', 240, 140, '#fff7ed', '#064e3b'),
    full: makeSvgDataUri('Document #24 (full)', 1200, 1600, '#fff7ed', '#064e3b')
  },
{
    id: 'img-025',
    filename: 'photo-2025-09-24-25.png',
    date: daysAgo(27),
    user: 'david',
    keywords: ['photo', 'receipt'],
    thumbnail: makeSvgDataUri('Photo #25', 240, 140, '#f1f5f9', '#111'),
    full: makeSvgDataUri('Photo #25 (full)', 1200, 1600, '#f1f5f9', '#111')
  },
{
    id: 'img-026',
    filename: 'receipt-2025-07-28-26.png',
    date: daysAgo(85),
    user: 'frank',
    keywords: ['receipt'],
    thumbnail: makeSvgDataUri('Receipt #26', 240, 140, '#f3f4f6', '#111'),
    full: makeSvgDataUri('Receipt #26 (full)', 1200, 1600, '#f3f4f6', '#111')
  },
{
    id: 'img-027',
    filename: 'receipt-2025-09-15-27.heic',
    date: daysAgo(36),
    user: 'jack',
    keywords: ['receipt'],
    thumbnail: makeSvgDataUri('Receipt #27', 240, 140, '#f3f4f6', '#92400e'),
    full: makeSvgDataUri('Receipt #27 (full)', 1200, 1600, '#f3f4f6', '#92400e')
  },
{
    id: 'img-028',
    filename: 'receipt-2025-09-16-28.heic',
    date: daysAgo(35),
    user: 'ivy',
    keywords: ['receipt', 'invoice'],
    thumbnail: makeSvgDataUri('Receipt #28', 240, 140, '#fff7ed', '#111'),
    full: makeSvgDataUri('Receipt #28 (full)', 1200, 1600, '#fff7ed', '#111')
  },
{
    id: 'img-029',
    filename: 'document-2025-08-02-29.heic',
    date: daysAgo(80),
    user: 'grace',
    keywords: ['document', 'invoice'],
    thumbnail: makeSvgDataUri('Document #29', 240, 140, '#f3f4f6', '#92400e'),
    full: makeSvgDataUri('Document #29 (full)', 1200, 1600, '#f3f4f6', '#92400e')
  },
{
    id: 'img-030',
    filename: 'photo-30.png',
    date: daysAgo(84),
    user: 'carla',
    keywords: ['photo', 'document'],
    thumbnail: makeSvgDataUri('Photo 30', 240, 140, '#ecfeff', '#111'),
    full: makeSvgDataUri('Photo 30 (full)', 1200, 800, '#ecfeff', '#111')
  },
{
    id: 'img-031',
    filename: 'note-2025-09-27-31.pdf',
    date: daysAgo(24),
    user: 'jack',
    keywords: ['handwritten', 'document'],
    thumbnail: makeSvgDataUri('Note by jack', 240, 140, '#f8fafc', '#075985'),
    full: makeSvgDataUri('Note by jack (full)', 1200, 1600, '#f8fafc', '#075985')
  },
{
    id: 'img-032',
    filename: 'note-2025-08-23-32.jpg',
    date: daysAgo(59),
    user: 'frank',
    keywords: ['handwritten'],
    thumbnail: makeSvgDataUri('Note by frank', 240, 140, '#f8fafc', '#075985'),
    full: makeSvgDataUri('Note by frank (full)', 1200, 1600, '#f8fafc', '#075985')
  },
{
    id: 'img-033',
    filename: 'invoice-2025-10-16-33.pdf',
    date: daysAgo(5),
    user: 'david',
    keywords: ['invoice', 'document'],
    thumbnail: makeSvgDataUri('Invoice #33', 240, 140, '#f1f5f9', '#064e3b'),
    full: makeSvgDataUri('Invoice #33 (full)', 1200, 1600, '#f1f5f9', '#064e3b')
  },
{
    id: 'img-034',
    filename: 'receipt-2025-09-02-34.png',
    date: daysAgo(49),
    user: 'carla',
    keywords: ['receipt'],
    thumbnail: makeSvgDataUri('Receipt #34', 240, 140, '#f1f5f9', '#111'),
    full: makeSvgDataUri('Receipt #34 (full)', 1200, 1600, '#f1f5f9', '#111')
  },
{
    id: 'img-035',
    filename: 'note-2025-10-05-35.pdf',
    date: daysAgo(16),
    user: 'frank',
    keywords: ['document', 'handwritten'],
    thumbnail: makeSvgDataUri('Note by frank', 240, 140, '#f8fafc', '#075985'),
    full: makeSvgDataUri('Note by frank (full)', 1200, 1600, '#f8fafc', '#075985')
  },
{
    id: 'img-036',
    filename: 'photo-36.pdf',
    date: daysAgo(88),
    user: 'jack',
    keywords: ['photo'],
    thumbnail: makeSvgDataUri('Photo 36', 240, 140, '#f3f4f6', '#064e3b'),
    full: makeSvgDataUri('Photo 36 (full)', 1200, 800, '#f3f4f6', '#064e3b')
  },
{
    id: 'img-037',
    filename: 'label-2025-10-07-37.jpg',
    date: daysAgo(14),
    user: 'david',
    keywords: ['label', 'screen', 'receipt'],
    thumbnail: makeSvgDataUri('Label #37', 240, 140, '#fff7ed', '#111'),
    full: makeSvgDataUri('Label #37 (full)', 1200, 1600, '#fff7ed', '#111')
  },
{
    id: 'img-038',
    filename: 'screenshot-2025-09-06-frank.heic',
    date: daysAgo(45),
    user: 'frank',
    keywords: ['screen'],
    thumbnail: makeSvgDataUri('Screen frank', 240, 140, '#ffffff', '#0f172a'),
    full: makeSvgDataUri('Screen frank (full)', 1200, 800, '#ffffff', '#0f172a')
  },
{
    id: 'img-039',
    filename: 'receipt-2025-08-10-39.jpg',
    date: daysAgo(72),
    user: 'bob',
    keywords: ['receipt'],
    thumbnail: makeSvgDataUri('Receipt #39', 240, 140, '#f1f5f9', '#064e3b'),
    full: makeSvgDataUri('Receipt #39 (full)', 1200, 1600, '#f1f5f9', '#064e3b')
  },
{
    id: 'img-040',
    filename: 'note-2025-10-04-40.jpg',
    date: daysAgo(17),
    user: 'emma',
    keywords: ['handwritten'],
    thumbnail: makeSvgDataUri('Note by emma', 240, 140, '#f8fafc', '#075985'),
    full: makeSvgDataUri('Note by emma (full)', 1200, 1600, '#f8fafc', '#075985')
  },
{
    id: 'img-041',
    filename: 'receipt-2025-10-18-41.jpg',
    date: daysAgo(3),
    user: 'david',
    keywords: ['receipt'],
    thumbnail: makeSvgDataUri('Receipt #41', 240, 140, '#fff7ed', '#111'),
    full: makeSvgDataUri('Receipt #41 (full)', 1200, 1600, '#fff7ed', '#111')
  },
{
    id: 'img-042',
    filename: 'invoice-2025-08-26-42.pdf',
    date: daysAgo(56),
    user: 'grace',
    keywords: ['invoice'],
    thumbnail: makeSvgDataUri('Invoice #42', 240, 140, '#f1f5f9', '#111'),
    full: makeSvgDataUri('Invoice #42 (full)', 1200, 1600, '#f1f5f9', '#111')
  },
{
    id: 'img-043',
    filename: 'invoice-2025-09-30-43.png',
    date: daysAgo(21),
    user: 'alice',
    keywords: ['invoice'],
    thumbnail: makeSvgDataUri('Invoice #43', 240, 140, '#fff7ed', '#111'),
    full: makeSvgDataUri('Invoice #43 (full)', 1200, 1600, '#fff7ed', '#111')
  },
{
    id: 'img-044',
    filename: 'screenshot-2025-10-11-jack.png',
    date: daysAgo(10),
    user: 'jack',
    keywords: ['photo', 'screen'],
    thumbnail: makeSvgDataUri('Screen jack', 240, 140, '#ffffff', '#0f172a'),
    full: makeSvgDataUri('Screen jack (full)', 1200, 800, '#ffffff', '#0f172a')
  },
{
    id: 'img-045',
    filename: 'receipt-2025-08-22-45.pdf',
    date: daysAgo(60),
    user: 'bob',
    keywords: ['receipt'],
    thumbnail: makeSvgDataUri('Receipt #45', 240, 140, '#f1f5f9', '#111'),
    full: makeSvgDataUri('Receipt #45 (full)', 1200, 1600, '#f1f5f9', '#111')
  },
{
    id: 'img-046',
    filename: 'label-2025-08-30-46.jpg',
    date: daysAgo(52),
    user: 'emma',
    keywords: ['label', 'invoice', 'photo'],
    thumbnail: makeSvgDataUri('Label #46', 240, 140, '#f1f5f9', '#111'),
    full: makeSvgDataUri('Label #46 (full)', 1200, 1600, '#f1f5f9', '#111')
  },
{
    id: 'img-047',
    filename: 'document-47.png',
    date: daysAgo(6),
    user: 'emma',
    keywords: ['document'],
    thumbnail: makeSvgDataUri('Document 47', 240, 140, '#f3f4f6', '#065f46'),
    full: makeSvgDataUri('Document 47 (full)', 1200, 800, '#f3f4f6', '#065f46')
  },
{
    id: 'img-048',
    filename: 'label-48.jpg',
    date: daysAgo(1),
    user: 'frank',
    keywords: ['label'],
    thumbnail: makeSvgDataUri('Label 48', 240, 140, '#ecfeff', '#065f46'),
    full: makeSvgDataUri('Label 48 (full)', 1200, 800, '#ecfeff', '#065f46')
  },
{
    id: 'img-049',
    filename: 'screen-2025-09-25-49.jpg',
    date: daysAgo(26),
    user: 'jack',
    keywords: ['screen', 'photo', 'invoice'],
    thumbnail: makeSvgDataUri('Screen #49', 240, 140, '#f1f5f9', '#111'),
    full: makeSvgDataUri('Screen #49 (full)', 1200, 1600, '#f1f5f9', '#111')
  },
{
    id: 'img-050',
    filename: 'photo-50.heic',
    date: daysAgo(12),
    user: 'ivy',
    keywords: ['photo'],
    thumbnail: makeSvgDataUri('Photo 50', 240, 140, '#f1f5f9', '#064e3b'),
    full: makeSvgDataUri('Photo 50 (full)', 1200, 800, '#f1f5f9', '#064e3b')
  }
];

// Notes for integrators:
// - The IMAGES array has been expanded to 50 entries.
// - The deprecated 'tags' field has been removed.
// - Replace the 'thumbnail' and 'full' values with actual file URLs or blob URLs from the backend.
// - Dates use the daysAgo() utility for relative date calculation from 'now'.