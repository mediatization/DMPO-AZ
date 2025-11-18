// REMOVED: import { TAGS, IMAGES } from './imageData.js';

// Simple UI renderer for the prototype. Now queries the DB.

const keywordsInput = document.getElementById('keywordsInput');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const userInput = document.getElementById('userInput');
const keywordModeSelect = document.getElementById('keywordMode');
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

let hasSearched = false; // whether user has performed an explicit search

// Expose functions to the global script block in HTML
window.performSearch = performSearch;
window.updateRegisteredCount = updateRegisteredCount;

function makeThumbnailCell(image) {
  const td = document.createElement('td');
  const img = document.createElement('img');
  img.className = 'thumb';
  img.alt = `${image.filename} thumbnail`;
  // MODIFIED: Use 'file://' protocol for local file paths
  img.src = 'file://' + image.thumbnail; 
  img.addEventListener('click', () => {
    // Open dedicated image detail page
    const url = new URL('./imageDetail.html', window.location.href);
    url.searchParams.set('id', image.id);
    window.location.href = url.toString();
  });
  td.appendChild(img);
  return td;
}

// Function to render robust pagination controls (No changes needed)
function renderPagination() {
  const { currentPage, totalPages, totalResults } = PAGINATION_SETTINGS;
  paginationControlsEl.innerHTML = '';
  
  if (totalPages <= 1) { 
    paginationControlsEl.style.display = 'none';
    return;
  }
  
  paginationControlsEl.style.display = 'flex';

  // Info Text: Showing X to Y of Z
  const start = (currentPage - 1) * PAGINATION_SETTINGS.ITEMS_PER_PAGE + 1;
  const end = Math.min(currentPage * PAGINATION_SETTINGS.ITEMS_PER_PAGE, totalResults);
  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `Showing ${start}-${end} of ${totalResults} results`;
  paginationControlsEl.appendChild(info);

  // Previous Button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.textContent = '← Previous';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => changePage(currentPage - 1));
  paginationControlsEl.appendChild(prevBtn);

  // Page buttons
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
  
  // Next Button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.textContent = 'Next →';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => changePage(currentPage + 1));
  paginationControlsEl.appendChild(nextBtn);
}

// Function to change page and trigger a re-render
function changePage(page) {
  if (page < 1 || page > PAGINATION_SETTINGS.totalPages || page === PAGINATION_SETTINGS.currentPage) {
    return;
  }
  PAGINATION_SETTINGS.currentPage = page;
  // Re-run the search (async) to get new page
  performSearch(false);
  document.querySelector('.table-wrap').scrollTop = 0;
}

// MODIFIED: applyRender now just renders the paged images it's given
function applyRender(pageImages) {
  // 1. Render table rows
  imageTableBody.innerHTML = '';
  if (pageImages.length === 0) {
    const row = imageTableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.textContent = hasSearched ? 'No images match the criteria.' : 'Click Search to view results.';
    cell.style.textAlign = 'center';
    cell.style.padding = '20px';
  } else {
    pageImages.forEach(image => {
      const row = imageTableBody.insertRow();
      // Defensive: always create exactly 5 cells in order
      // 1. Preview
      const thumbCell = row.insertCell();
      const img = document.createElement('img');
      img.className = 'thumb';
      img.alt = `${image.filename} thumbnail`;
      img.src = 'file://' + image.thumbnail;
      img.addEventListener('click', () => {
        const url = new URL('./imageDetail.html', window.location.href);
        url.searchParams.set('id', image.id);
        window.location.href = url.toString();
      });
      thumbCell.appendChild(img);

      // 2. Timestamp
      const dateCell = row.insertCell();
      dateCell.textContent = image.date || '';

      // 3. User
      const userCell = row.insertCell();
      userCell.textContent = image.user || '';

      // 4. Keywords
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

      // 5. Tags
      const tagsCell = row.insertCell();
      tagsCell.className = 'tags-cell';
      const tagsFlex = document.createElement('div');
      tagsFlex.className = 'tags-flex';
      (Array.isArray(image.tags) ? image.tags : []).forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag-chip manual-tag';
        span.textContent = tag;
        tagsFlex.appendChild(span);
      });
      tagsCell.appendChild(tagsFlex);

      // Defensive: ensure row has exactly 5 cells
      while (row.cells.length < 5) {
        row.insertCell();
      }
      while (row.cells.length > 5) {
        row.deleteCell(-1);
      }
    });
  }

  // 2. Update UI counts and render pagination
  resultsCountEl.textContent = PAGINATION_SETTINGS.totalResults;
  renderPagination();
}

// Function to clear all filters and results
function clearResults() {
  PAGINATION_SETTINGS.currentPage = 1;
  PAGINATION_SETTINGS.totalResults = 0;

  keywordsInput.value = '';
  document.getElementById('tagsInput').value = '';
  startDateInput.value = '';
  endDateInput.value = '';
  userInput.value = '';

  resultsCountEl.textContent = 0;
  imageTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#6b7280;">Click Search to view results.</td></tr>';
  paginationControlsEl.style.display = 'none';
  hasSearched = false;
}

// MODIFIED: performSearch is now async and calls the DB query
async function performSearch(resetPage = true) {
  if (resetPage) {
    PAGINATION_SETTINGS.currentPage = 1; 
    hasSearched = true;
  }

  // 1. Get filters from UI
  const searchKeywordsStr = keywordsInput.value.toLowerCase().trim();
  const searchKeywords = searchKeywordsStr ? searchKeywordsStr.split(/[\s,]+/).filter(k => k.length > 0) : [];
  const searchMode = keywordModeSelect.value;
  
  const searchTagsStr = document.getElementById('tagsInput').value.toLowerCase().trim();
  const searchTags = searchTagsStr ? searchTagsStr.split(/[\s,]+/).filter(t => t.length > 0) : [];
  const tagMode = document.getElementById('tagMode').value;
  
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const searchUser = userInput.value.toLowerCase().trim();

  // 2. Build filter object
  const filters = {
    searchKeywords,
    searchMode,
    searchTags,
    tagMode,
    startDate: startDate || null,
    endDate: endDate || null,
    searchUser: searchUser || null,
    page: PAGINATION_SETTINGS.currentPage,
    itemsPerPage: PAGINATION_SETTINGS.ITEMS_PER_PAGE
  };

  // 3. Call the global query function from the HTML script
  try {
    const { totalResults, images } = await window.queryDatabase(filters);

    // 4. Update pagination state
    PAGINATION_SETTINGS.totalResults = totalResults;
    PAGINATION_SETTINGS.totalPages = Math.ceil(totalResults / PAGINATION_SETTINGS.ITEMS_PER_PAGE);
    
    // 5. Render results (images is already the paged list)
    applyRender(images); 
  
  } catch (err) {
    console.error('Error performing search:', err);
    imageTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:red;">An error occurred during search.</td></tr>';
  }
}

clearFiltersBtn.addEventListener('click', () => {
  clearResults();
});

// Search is explicit via button
const searchBtn = document.getElementById('searchBtn');
if (searchBtn) searchBtn.addEventListener('click', () => {
  performSearch(true);
});

// Allow Enter to trigger Search (include tags input)
['keywordsInput', 'tagsInput', 'startDate', 'endDate', 'userInput'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch(true);
    }
  });
});

// NEW: Function to update the total registered count
async function updateRegisteredCount() {
    try {
        const count = await window.getRegisteredCount();
        registeredCountEl.textContent = count;
    } catch (e) {
        console.error('Could not get registered count:', e);
        registeredCountEl.textContent = 'N/A';
    }
}

async function initializeApp() {
    // Call the main init function from imageAnalysis.html
    if (window.runAppInitialization) {
        clearResults(); // Show "Click Search" message temporarily
        // This will now scan, update count, and run the first search
        await window.runAppInitialization(); 
    } else {
        // Fallback if the main script didn't load right
        console.error("Main initialization function not found.");
        await updateRegisteredCount();
        clearResults(); 
    }
}

initializeApp(); // Call the new async init function