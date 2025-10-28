// imageDetail.js
const { ipcRenderer } = require('electron');
const sqlite3 = require('sqlite3').verbose();
let db;

// Helper to get query param
function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// Function to get image data from DB
async function getImageById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM Images WHERE imgId = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// Function to get words for an image
async function getWordsForImage(id) {
   return new Promise((resolve, reject) => {
     db.all('SELECT word FROM ImageWords WHERE imgId = ?', [id], (err, rows) => {
       if (err) return reject(err);
       resolve(rows.map(r => r.word));
     });
   });
}

async function loadImageDetail() {
  const id = qs('id');
  if (!id) {
    document.getElementById('title').textContent = 'No Image ID provided';
    return;
  }

  // Get DB path from main process
  const dbPath = await ipcRenderer.invoke('get-db-path');
  
  // Open DB connection
  db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, async (err) => {
    if (err) {
      console.error('[Detail] DB open error', err);
      document.getElementById('title').textContent = 'Error loading database';
      return;
    }
    
    console.log('[Detail] DB opened successfully');
    
    // Fetch image and keywords
    const image = await getImageById(id);
    
    if (!image) {
      document.getElementById('title').textContent = 'Image not found';
      return;
    }
    
    const keywords = await getWordsForImage(image.imgId);

    document.getElementById('title').textContent = image.imgPath.split(/[\\/]/).pop();
    const fullImage = document.getElementById('fullImage');
    // Use "file://" protocol to ensure local paths render as images
    fullImage.src = `file://${image.imgPath}`;
    fullImage.alt = image.imgPath;

    const dl = document.getElementById('metaList');
    dl.innerHTML = `
      <dt>ID</dt><dd>${image.imgId}</dd>
      <dt>File Path</dt><dd>${image.imgPath}</dd>
      <dt>Date Added</dt><dd>${image.timestamp}</dd>
      <dt>User</dt><dd>${image.userKey || 'N/A'}</dd>
      <dt>OCR Keywords</dt><dd>${keywords.join(', ') || 'None'}</dd>
    `;
  });
}

// Run the function on load
loadImageDetail();