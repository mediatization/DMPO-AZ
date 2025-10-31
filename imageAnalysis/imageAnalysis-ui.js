import { TAGS, IMAGES } from './imageData.js';

// Simple UI renderer for the prototype. Filtering logic will be implemented after layout approval.

const keywordsInput = document.getElementById('keywordsInput');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const userInput = document.getElementById('userInput');
// tags removed from left panel; keywordMode select toggles AND/OR behavior
const keywordModeSelect = document.getElementById('keywordMode');
const imageTableBody = document.getElementById('imageTableBody');
const clearFiltersBtn = document.getElementById('clearFilters');
const registeredCountEl = document.getElementById('registeredCount');
const resultsCountEl = document.getElementById('resultsCount');
const paginationControlsEl = document.getElementById('paginationControls');

// NEW: Pagination State
const PAGINATION_SETTINGS = {
  ITEMS_PER_PAGE: 10,
  currentPage: 1,
  totalResults: 0,
  totalPages: 0,
};

let hasSearched = false; // whether user has performed an explicit search

function renderTagList() {
  // removed: tags list is no longer part of search panel (keywords input is used)
}

function makeThumbnailCell(image) {
  const td = document.createElement('td');
  const img = document.createElement('img');
  img.className = 'thumb';
  img.alt = `${image.filename} thumbnail`;
  img.src = image.thumbnail;
  img.addEventListener('click', () => {
    // Open dedicated image detail page to compartmentalize future per-image features
    const url = new URL('./imageDetail.html', window.location.href);
    url.searchParams.set('id', image.id);
    window.location.href = url.toString();
  });
  td.appendChild(img);
  return td;
}

// Function to render robust pagination controls
function renderPagination() {
  const { currentPage, totalPages, totalResults } = PAGINATION_SETTINGS;
  paginationControlsEl.innerHTML = '';
  
  if (totalPages <= 1) { // Only show controls if more than one page exists
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

  // Page buttons (render up to 5 around the current one)
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  // Re-adjust start page if range is too small (e.g., near the end)
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
  // Re-run the search to apply filtering and pagination
  performSearch(false);
  // Scroll table back to the top for better UX
  document.querySelector('.table-wrap').scrollTop = 0;
}

// Function to update the table body
function applyRender(images) {
  // 1. Update total results count and page info
  PAGINATION_SETTINGS.totalResults = images.length;
  PAGINATION_SETTINGS.totalPages = Math.ceil(images.length / PAGINATION_SETTINGS.ITEMS_PER_PAGE);

  // Ensure current page is valid after filtering
  if (PAGINATION_SETTINGS.currentPage > PAGINATION_SETTINGS.totalPages) {
    PAGINATION_SETTINGS.currentPage = Math.max(1, PAGINATION_SETTINGS.totalPages);
  }

  // 2. Calculate slice indices for the current page
  const start = (PAGINATION_SETTINGS.currentPage - 1) * PAGINATION_SETTINGS.ITEMS_PER_PAGE;
  const end = start + PAGINATION_SETTINGS.ITEMS_PER_PAGE;
  const pageImages = images.slice(start, end);

  // 3. Render table rows (only for the current page)
  imageTableBody.innerHTML = '';
  if (pageImages.length === 0) {
    // If no results, show a message
    const row = imageTableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.textContent = hasSearched ? 'No images match the criteria.' : 'Click Search to view results.';
    cell.style.textAlign = 'center';
    cell.style.padding = '20px';
  } else {
    pageImages.forEach(image => {
      const row = imageTableBody.insertRow();
      row.appendChild(makeThumbnailCell(image));
      row.insertCell().textContent = image.date;
      row.insertCell().textContent = image.user;
      
      const keywordsCell = row.insertCell();
      keywordsCell.className = 'tags-cell';
      image.keywords.forEach(keyword => {
        const span = document.createElement('span');
        span.className = 'tag-chip';
        span.textContent = keyword;
        keywordsCell.appendChild(span);
      });
    });
  }
  
  // 4. Update UI counts and render pagination
  resultsCountEl.textContent = images.length;
  renderPagination();
}

// Function to clear all filters and results
function clearResults() {
  // Reset pagination state
  PAGINATION_SETTINGS.currentPage = 1;
  PAGINATION_SETTINGS.totalResults = 0;

  keywordsInput.value = '';
  startDateInput.value = '';
  endDateInput.value = '';
  userInput.value = '';

  resultsCountEl.textContent = 0;
  imageTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#6b7280;">Click Search to view results.</td></tr>';
  paginationControlsEl.style.display = 'none'; // Hide pagination
  hasSearched = false;
}

// Function to perform filtering and rendering
function performSearch(resetPage = true) {
  if (resetPage) {
    PAGINATION_SETTINGS.currentPage = 1; // Always reset to page 1 for a new search
    hasSearched = true;
  }

  const searchKeywordsStr = keywordsInput.value.toLowerCase().trim();
  const searchKeywords = searchKeywordsStr ? searchKeywordsStr.split(/[\s,]+/).filter(k => k.length > 0) : [];
  const searchMode = keywordModeSelect.value;
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const searchUser = userInput.value.toLowerCase().trim();

  const filteredImages = IMAGES.filter(image => {
    // Filter by Date
    if (startDate && image.date < startDate) return false;
    if (endDate && image.date > endDate) return false;

    // Filter by User
    if (searchUser && image.user.toLowerCase() !== searchUser) return false;

    // Filter by Keywords (OCR)
    if (searchKeywords.length > 0) {
      const imgKeywords = image.keywords.map(k => k.toLowerCase());

      if (searchMode === 'AND') {
        // AND: all search keywords must be present
        for (const k of searchKeywords) {
          if (!imgKeywords.includes(k)) return false;
        }
      } else {
        // OR: at least one search keyword must be present
        let any = false;
        for (const k of searchKeywords) {
          if (imgKeywords.includes(k)) { any = true; break; }
        }
        if (!any) return false;
      }
    }

    return true;
  });

  applyRender(filteredImages);
}

clearFiltersBtn.addEventListener('click', () => {
  clearResults();
});

// Search is explicit via button
const searchBtn = document.getElementById('searchBtn');
if (searchBtn) searchBtn.addEventListener('click', () => {
  performSearch(true);
});

// Allow Enter to trigger Search when focused in text inputs
['keywordsInput', 'startDate', 'endDate', 'userInput'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch(true);
    }
  });
});

// Initialize UI
registeredCountEl.textContent = IMAGES.length;
clearResults(); // Start with empty results and 'Click Search' message