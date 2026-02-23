// imageAnalysis-ui.js
const { ipcRenderer } = require('electron/renderer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database setup and connection
const db = new sqlite3.Database('imgDb');

// Initialize database tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS Images (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        imgPath TEXT NOT NULL UNIQUE, 
        date TEXT, 
        user TEXT,
        notes TEXT DEFAULT ''
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS ImageWords (
        imgId INTEGER NOT NULL, 
        word TEXT NOT NULL, 
        PRIMARY KEY(imgId, word), 
        FOREIGN KEY (imgId) REFERENCES Images(id) ON DELETE CASCADE
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS Tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag TEXT NOT NULL UNIQUE
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS ImageTags (
        imgId INTEGER NOT NULL,
        tagId INTEGER NOT NULL,
        PRIMARY KEY(imgId, tagId),
        FOREIGN KEY (imgId) REFERENCES Images(id) ON DELETE CASCADE,
        FOREIGN KEY (tagId) REFERENCES Tags(id) ON DELETE CASCADE
    )`);
});

// DOM Elements
const keywordsInput = document.getElementById('keywordsInput');
const startDateInput = document.getElementById('startDate');
const startTimeInput = document.getElementById('startTime');
const endDateInput = document.getElementById('endDate');
const endTimeInput = document.getElementById('endTime');
const userInput = document.getElementById('userInput');
const keywordModeSelect = document.getElementById('keywordMode');
const tagsInput = document.getElementById("tagsInput");
const tagModeSelect = document.getElementById('tagMode');
const imageTableBody = document.getElementById('imageTableBody');
const clearFiltersBtn = document.getElementById('clearFilters');
const registeredCountEl = document.getElementById('registeredCount');
const resultsCountEl = document.getElementById('resultsCount');
const paginationControlsEl = document.getElementById('paginationControls');

// Pagination State
const PAGINATION_SETTINGS = {
  ITEMS_PER_PAGE: 10,
  currentPage: 1,
  totalResults: 0,
  totalPages: 0,
};

let hasSearched = false;

// Database Query Functions
async function getRegisteredCount() {
    return new Promise((res, rej) => {
        db.get("SELECT COUNT(*) as count FROM Images", (err, row) => {
            if (err) rej(err);
            else res(row ? row.count : 0);
        });
    });
}

async function queryDatabase(filters) {
    const { searchKeywords, searchMode, searchTags, tagMode, startDate, endDate, startTime, endTime, searchUser, page, itemsPerPage } = filters;

    const queryParams = [];
    let baseQuery = `SELECT DISTINCT T1.id FROM Images AS T1`;
    let joinClause = '';
    const whereClauses = [];
    
    if (searchKeywords.length > 0) {
        joinClause = ` INNER JOIN ImageWords AS T2 ON T1.id = T2.imgId`;
        const placeholders = searchKeywords.map(() => '?').join(',');
        whereClauses.push(`T2.word IN (${placeholders})`);
        queryParams.push(...searchKeywords);
    }

    if (searchTags.length > 0) {
        joinClause += ` INNER JOIN ImageTags as T3 on T1.id = T3.imgid`;
        joinClause += ` INNER JOIN Tags as T4 on T3.tagId = T4.id`;
        const tagPlaceholders = searchTags.map(() => '?').join(',');
        whereClauses.push(`T4.tag IN (${tagPlaceholders})`);
        queryParams.push(...searchTags);
    }

    // --- Start Filter ---
    if (startDate) {
        let s = startDate;
        if (startTime) s += ' ' + startTime;
        else s += ' 00:00:00';
        
        whereClauses.push(`datetime(T1.date, 'localtime') >= ?`);
        queryParams.push(s);
    } else if (startTime) {
        whereClauses.push(`strftime('%H:%M:%S', T1.date, 'localtime') >= ?`);
        queryParams.push(startTime);
    }

    // --- End Filter ---
    if (endDate) {
        let e = endDate;
        if (endTime) e += ' ' + endTime;
        else e += ' 23:59:59';
        
        whereClauses.push(`datetime(T1.date, 'localtime') <= ?`);
        queryParams.push(e);
    } else if (endTime) {
        whereClauses.push(`strftime('%H:%M:%S', T1.date, 'localtime') <= ?`);
        queryParams.push(endTime);
    }

    if (searchUser) {
        whereClauses.push(`T1.user LIKE ?`);
        queryParams.push(`%${searchUser}%`);
    }
    
    let whereString = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    let groupByString = '';
    
    if (searchKeywords.length > 0) {
        groupByString = ` GROUP BY T1.id`;
        if (searchMode === 'AND') {
            groupByString += ` HAVING COUNT(DISTINCT T2.word) = ?`;
            queryParams.push(searchKeywords.length);
        }
    }
    if (searchTags.length > 0) {
        if (groupByString === '') {
            groupByString = ` GROUP BY T1.id`;
            if (tagMode === 'AND') {
                groupByString += ` HAVING COUNT(DISTINCT T4.tag) = ?`;
                queryParams.push(searchTags.length);
            }
        }
        else if (tagMode === 'AND') {
            groupByString += ` AND COUNT(DISTINCT T4.tag) = ?`;
            queryParams.push(searchTags.length);
        }
    }

    const idQuery = baseQuery + joinClause + whereString + groupByString;
    
    const countSql = `SELECT COUNT(*) as count FROM (${idQuery})`;
    const totalRow = await new Promise((res, rej) => {
        db.get(countSql, queryParams, (err, row) => err ? rej(err) : res(row));
    });
    
    const totalResults = totalRow.count;
    if (totalResults === 0) {
        return { totalResults: 0, images: [] };
    }
    
    const offset = (page - 1) * itemsPerPage;
    const pagedIdQuery = idQuery + ` ORDER BY T1.date DESC, T1.id DESC LIMIT ? OFFSET ?`;
    const idRows = await new Promise((res, rej) => {
            db.all(pagedIdQuery, [...queryParams, itemsPerPage, offset], (err, rows) => err ? rej(err) : res(rows));
    });
    
    if (idRows.length === 0) {
        return { totalResults: totalResults, images: [] };
    }
    
    const ids = idRows.map(r => r.id);
    const idPlaceholders = ids.map(() => '?').join(',');
    const dataQuery = `
        SELECT id, imgPath, date, user
        FROM Images 
        WHERE id IN (${idPlaceholders})
        ORDER BY date DESC, id DESC`;
    
    const images = await new Promise((res, rej) => {
        db.all(dataQuery, ids, (err, rows) => err ? rej(err) : res(rows));
    });
    
    for (const img of images) {
        img.keywords = await new Promise((resolve, reject) => {
            db.all(`SELECT word FROM ImageWords WHERE imgId = ?`, [img.id], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const words = rows.map(row => row.word);
                    resolve(words);
                }
            });
        });

        img.thumbnail = img.imgPath; 
        img.full = img.imgPath; 
        img.id = img.id.toString();
    }
    
    return { totalResults, images };
}

// UI Functions
function renderPagination() {
  const { currentPage, totalPages, totalResults } = PAGINATION_SETTINGS;
  paginationControlsEl.innerHTML = '';
  
  if (totalPages <= 1) { 
    paginationControlsEl.style.display = 'none';
    return;
  }
  
  paginationControlsEl.style.display = 'flex';

  const start = (currentPage - 1) * PAGINATION_SETTINGS.ITEMS_PER_PAGE + 1;
  const end = Math.min(currentPage * PAGINATION_SETTINGS.ITEMS_PER_PAGE, totalResults);
  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `Showing ${start}-${end} of ${totalResults} results`;
  paginationControlsEl.appendChild(info);

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.textContent = '← Previous';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => changePage(currentPage - 1));
  paginationControlsEl.appendChild(prevBtn);

  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `page-btn${i === currentPage ? ' active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => changePage(i));
    paginationControlsEl.appendChild(pageBtn);
  }
  
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.textContent = 'Next →';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => changePage(currentPage + 1));
  paginationControlsEl.appendChild(nextBtn);
}

function changePage(page) {
  if (page < 1 || page > PAGINATION_SETTINGS.totalPages || page === PAGINATION_SETTINGS.currentPage) {
    return;
  }
  PAGINATION_SETTINGS.currentPage = page;
  performSearch(false);
  document.querySelector('.table-wrap').scrollTop = 0;
}

async function applyRender(pageImages) {
  imageTableBody.innerHTML = '';
  
  if (pageImages.length === 0) {
    const row = imageTableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.textContent = hasSearched ? 'No images match the criteria.' : 'Click Search to view results.';
    cell.style.textAlign = 'center';
    cell.style.padding = '20px';
  } else {
    for (let image of pageImages) {
      const row = imageTableBody.insertRow();
      
      // Preview
      const thumbCell = row.insertCell();
      const img = document.createElement('img');
      img.className = 'thumb';
      img.alt = `${image.filename} thumbnail`;
      img.src = 'file://' + image.thumbnail;
      img.addEventListener('click', () => {
        ipcRenderer.invoke("open-image-detail", image.id);
      });
      thumbCell.appendChild(img);

      // Timestamp
      const dateCell = row.insertCell();
      if (image.date) {
        const d = new Date(image.date);
        if (!isNaN(d)) {
          dateCell.textContent = d.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
        } else {
          dateCell.textContent = image.date;
        }
      } else {
        dateCell.textContent = '';
      }

      // User
      const userCell = row.insertCell();
      userCell.textContent = image.user || '';

      // Keywords
      const keywordsCell = row.insertCell();
      keywordsCell.className = 'keywords-cell';
      const keywordsFlex = document.createElement('div');
      keywordsFlex.className = 'keywords-flex';
      (Array.isArray(image.keywords) ? image.keywords : []).forEach(keyword => {
        const span = document.createElement('span');
        span.className = 'tag-chip';
        span.textContent = keyword;
        keywordsFlex.appendChild(span);
      });
      keywordsCell.appendChild(keywordsFlex);

      // Tags
      const tagsCell = row.insertCell();
      tagsCell.className = 'tags-cell';
      const tagsFlex = document.createElement('div');
      tagsFlex.className = 'tags-flex';

      const rows = await new Promise((res, rej) => {
        db.all(`SELECT t.tag
                FROM ImageTags it, Tags t 
                WHERE it.tagId = t.id AND it.imgId = ?`, 
                [image.id], 
                (err, rows) => err ? rej(err) : res(rows)
              );
      });  

      for (const r of rows) {
        const span = document.createElement('span');
        span.className = 'tag-chip manual-tag';
        span.textContent = r.tag;
        tagsFlex.appendChild(span);
      }
      tagsCell.appendChild(tagsFlex);

      while (row.cells.length < 5) {
        row.insertCell();
      }
      while (row.cells.length > 5) {
        row.deleteCell(-1);
      }
    }
  }

  resultsCountEl.textContent = PAGINATION_SETTINGS.totalResults;
  renderPagination();
}

function clearResults() {
  PAGINATION_SETTINGS.currentPage = 1;
  PAGINATION_SETTINGS.totalResults = 0;

  keywordsInput.value = '';
  tagsInput.value = '';
  startDateInput.value = '';
  endDateInput.value = '';
  if (startTimeInput) startTimeInput.value = '';
  if (endTimeInput) endTimeInput.value = '';
  userInput.value = '';

  resultsCountEl.textContent = 0;
  imageTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#6b7280;">Click Search to view results.</td></tr>';
  paginationControlsEl.style.display = 'none';
  hasSearched = false;
}

async function performSearch(resetPage = true) {
  if (resetPage) {
    PAGINATION_SETTINGS.currentPage = 1; 
    hasSearched = true;
  }

  const searchKeywordsStr = keywordsInput.value.toLowerCase().trim();
  const searchKeywords = searchKeywordsStr ? searchKeywordsStr.split(/[\s,]+/).filter(k => k.length > 0) : [];
  const searchMode = keywordModeSelect.value;
  
  const searchTagsStr = tagsInput.value.toLowerCase().trim();
  const searchTags = searchTagsStr ? searchTagsStr.split(/[\s,]+/).filter(t => t.length > 0) : [];
  const tagMode = tagModeSelect.value;
  
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const startTime = startTimeInput ? startTimeInput.value : '';
  const endTime = endTimeInput ? endTimeInput.value : '';
  
  const searchUser = userInput.value.toLowerCase().trim();

  const filters = {
    searchKeywords,
    searchMode,
    searchTags,
    tagMode,
    startDate, 
    endDate,
    startTime, 
    endTime,
    searchUser: searchUser || null,
    page: PAGINATION_SETTINGS.currentPage,
    itemsPerPage: PAGINATION_SETTINGS.ITEMS_PER_PAGE
  };

  try {
    const { totalResults, images } = await queryDatabase(filters);

    PAGINATION_SETTINGS.totalResults = totalResults;
    PAGINATION_SETTINGS.totalPages = Math.ceil(totalResults / PAGINATION_SETTINGS.ITEMS_PER_PAGE);
    
    await applyRender(images); 
  
  } catch (err) {
    console.error('Error performing search:', err);
    imageTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:red;">An error occurred during search.</td></tr>';
  }
}

async function updateRegisteredCount() {
    try {
        const count = await getRegisteredCount();
        registeredCountEl.textContent = count;
    } catch (e) {
        console.error('Could not get registered count:', e);
        registeredCountEl.textContent = 'N/A';
    }
}

async function initializeApp() {
    clearResults();

    const params = new URLSearchParams(window.location.search);
    const isAutoSearch = params.has('autoSearch');

    if (isAutoSearch) {
        if (params.has('user')) userInput.value = params.get('user');
        if (params.has('startDate')) startDateInput.value = params.get('startDate');
        if (params.has('startTime')) startTimeInput.value = params.get('startTime');
        if (params.has('endDate')) endDateInput.value = params.get('endDate');
        if (params.has('endTime')) endTimeInput.value = params.get('endTime');
    }

    // Run the scan using the Tesseract functions from HTML
    if (window.tesseractFunctions) {
        const processed = await window.tesseractFunctions.searchForImagesToScan(db);
        console.log(`Processed ${processed} new images`);
    }
    
    await updateRegisteredCount();
    performSearch(true);
}

// Event Listeners
clearFiltersBtn.addEventListener('click', () => {
  clearResults();
  window.history.replaceState({}, document.title, window.location.pathname);
});

const searchBtn = document.getElementById('searchBtn');
if (searchBtn) searchBtn.addEventListener('click', () => {
  performSearch(true);
});

['keywordsInput', 'tagsInput', 'startDate', 'endDate', 'userInput', 'startTime', 'endTime'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch(true);
    }
  });
});

// Initialize
initializeApp();

// Cleanup on window unload
window.addEventListener('beforeunload', () => {
    db.close();
});