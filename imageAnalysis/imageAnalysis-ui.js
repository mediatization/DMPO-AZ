// imageAnalysis-ui.js (renderer UI)
const { ipcRenderer } = require('electron');
const sqlite3 = require('sqlite3').verbose();

let db;
let IMAGES = []; // Master list of all images
let currentFilterResults = []; // List of images matching current filter
let currentPage = 1;
const pageSize = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const dbPath = await ipcRenderer.invoke('get-db-path');
  console.log('[UI] Opening DB at', dbPath);
  db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) console.error('[UI] DB open error', err);
    else console.log('[UI] DB opened successfully');
  });

  const tbody = document.querySelector('#resultsTable tbody');
  const registeredCountEl = document.getElementById('registeredCount');
  const pageInfo = document.getElementById('pageInfo');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');

  async function loadImages() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM Images ORDER BY timestamp DESC', async (err, rows) => {
        if (err) return reject(err);
        const imgs = [];
        for (const r of rows) {
          const words = await new Promise((res, rej) => {
            db.all('SELECT word FROM ImageWords WHERE imgId=?',[r.imgId],(e,wr)=>{
              if(e)rej(e); else res(wr.map(x=>x.word));
            });
          });
          imgs.push({
            id: r.imgId,
            filename: r.imgPath.split(/[\\/]/).pop(),
            date: r.timestamp ? r.timestamp.slice(0,10) : '',
            user: r.userKey || '',
            keywords: words,
            thumbnail: r.imgPath,
            full: r.imgPath
          });
        }
        resolve(imgs);
      });
    });
  }

  async function refreshImagesFromDb() {
    try {
      IMAGES = await loadImages();
      currentFilterResults = IMAGES; // Initialize filter list
      console.log('[UI] IMAGES count:', IMAGES.length);
      registeredCountEl.textContent = IMAGES.length;
      currentPage = 1; // Reset to first page
      renderResults(); // Render with the full list
    } catch (e) {
      console.error('[UI] refreshImagesFromDb error', e);
    }
  }

  function performSearch() {
    const kwInput = document.getElementById('searchKeywords').value.toLowerCase();
    const searchWords = kwInput.split(/\s+/).filter(Boolean); // Split by space
    const mode = document.getElementById('keywordMode').value; // 'AND' or 'OR'
    const user = document.getElementById('searchUser').value.toLowerCase();
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    const results = IMAGES.filter(img => {
      // Keyword Match Logic
      let matchKw = true;
      if (searchWords.length > 0) {
        if (mode === 'OR') {
          // OR: *at least one* searchWord must be included in *any* of the img.keywords
          matchKw = searchWords.some(searchWord => 
            img.keywords.some(imgKey => imgKey.includes(searchWord))
          );
        } else {
          // AND: *every* searchWord must be included in *at least one* of the img.keywords
          matchKw = searchWords.every(searchWord =>
            img.keywords.some(imgKey => imgKey.includes(searchWord))
          );
        }
      }
      
      const matchUser = !user || img.user.toLowerCase().includes(user);
      const matchDate = (!start || img.date >= start) && (!end || img.date <= end);
      
      return matchKw && matchUser && matchDate;
    });

    currentFilterResults = results; // Store filtered results
    currentPage = 1; // Reset to page 1
    renderResults(); // Render the filtered results
  }

  document.getElementById('searchBtn').addEventListener('click', performSearch);
  
  document.getElementById('clearFilters').addEventListener('click', () => {
    document.getElementById('searchKeywords').value = '';
    document.getElementById('searchUser').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('keywordMode').value = 'OR';
    
    currentFilterResults = IMAGES; // Reset filter to all images
    currentPage = 1; // Reset page
    renderResults(); // Render
  });

  function paginate(items, page, perPage) {
    const offset = (page - 1) * perPage;
    return items.slice(offset, offset + perPage);
  }

  // Modified to use 'currentFilterResults' by default
  function renderResults() {
    const dataToRender = currentFilterResults; // Always use the filtered list
    
    const total = dataToRender.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    currentPage = Math.max(1, Math.min(currentPage, totalPages)); // Ensure page is valid
    
    const pageItems = paginate(dataToRender, currentPage, pageSize);
    tbody.innerHTML = '';

    for (const img of pageItems) {
      const tr = document.createElement('tr');
      const thumbTd = document.createElement('td');
      const im = document.createElement('img');
      // Use "file://" protocol to ensure local paths render as images
      im.src = `file://${img.thumbnail}`; 
      im.className = 'thumb';
      im.addEventListener('click',()=>window.location.href=`./imageDetail.html?id=${img.id}`);
      thumbTd.appendChild(im);
      tr.appendChild(thumbTd);
      tr.innerHTML += `<td>${img.filename}</td><td>${img.user}</td><td>${img.date}</td>
                       <td>${img.keywords.map(k=>`<span class='tag-chip'>${k}</span>`).join(' ')}</td>`;
      tbody.appendChild(tr);
    }

    pageInfo.textContent = `Page ${currentPage}/${totalPages} (${total} results)`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }

  // Pagination buttons now correctly work with the filtered list
  prevPageBtn.addEventListener('click', () => { currentPage--; renderResults(); });
  nextPageBtn.addEventListener('click', () => { currentPage++; renderResults(); });

  // initial load + ipc refresh
  refreshImagesFromDb();
  ipcRenderer.on('refresh-images', async () => {
    console.log('[UI] received refresh-images, reloading DB...');
    await refreshImagesFromDb();
  });
});