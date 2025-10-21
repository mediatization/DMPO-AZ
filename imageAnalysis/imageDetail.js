import { IMAGES } from './imageData.js';

function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function findImageById(id) {
  return IMAGES.find(i => i.id === id || i.filename === id);
}

function renderMetadata(image) {
  const dl = document.getElementById('metaList');
  dl.innerHTML = '';
  function add(k, v) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    dl.appendChild(dt); dl.appendChild(dd);
  }
  add('ID', image.id);
  add('Filename', image.filename);
  add('Date', image.date);
  add('User', image.user || '—');
  add('Keywords', (image.keywords || image.tags || []).join(', '));
}

const id = qs('id');
const image = findImageById(id);
if (!image) {
  document.getElementById('title').textContent = 'Image not found';
} else {
  document.getElementById('title').textContent = image.filename;
  const fullImage = document.getElementById('fullImage');
  fullImage.src = image.full;
  fullImage.alt = image.filename;
  renderMetadata(image);
}
