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

function makeDateCell(image) {
  const td = document.createElement('td');
  td.textContent = image.date;
  return td;
}

function makeKeywordsCell(image) {
  const td = document.createElement('td');
  td.className = 'tags-cell';
  const kws = image.keywords || image.tags || [];
  for (const t of kws) {
    const span = document.createElement('span');
    span.className = 'tag-chip';
    span.textContent = t;
    td.appendChild(span);
  }
  return td;
}

function makeUserCell(image) {
  const td = document.createElement('td');
  td.textContent = image.user || '—';
  return td;
}

function renderTable(images) {
  imageTableBody.innerHTML = '';
  for (const img of images) {
    const tr = document.createElement('tr');
    tr.appendChild(makeThumbnailCell(img));
    tr.appendChild(makeDateCell(img));
    tr.appendChild(makeUserCell(img));
    tr.appendChild(makeKeywordsCell(img));
    imageTableBody.appendChild(tr);
  }
}

// No modal is used; previews open on a separate page. (Related modal DOM was removed.)

function hasSearchCriteria() {
  return (keywordsInput && keywordsInput.value && keywordsInput.value.trim() !== '')
    || (startDateInput && startDateInput.value)
    || (endDateInput && endDateInput.value)
    || (userInput && userInput.value && userInput.value.trim() !== '')
    || (activeTags && activeTags.size > 0);
}

function applyRender(images) {
  renderTable(images);
  if (registeredCountEl) registeredCountEl.textContent = IMAGES.length;
  if (resultsCountEl) resultsCountEl.textContent = images.length;
}

function clearResults() {
  hasSearched = false;
  imageTableBody.innerHTML = '';
  if (registeredCountEl) registeredCountEl.textContent = IMAGES.length;
  if (resultsCountEl) resultsCountEl.textContent = 0;
}

function performSearch() {
  // Explicit search action. Even if no criteria are provided, Search will show all images.
  hasSearched = true;
  // Build search criteria
  const rawKeywords = (keywordsInput && keywordsInput.value) ? keywordsInput.value : '';
  const typed = rawKeywords.split(/[\s,]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  const searchKeywords = typed; // keywords come only from typed input

  const start = startDateInput && startDateInput.value ? startDateInput.value : null;
  const end = endDateInput && endDateInput.value ? endDateInput.value : null;
  const userQ = userInput && userInput.value ? userInput.value.trim().toLowerCase() : '';

  // If no criteria provided (all blank) we show all images
  const noCriteria = searchKeywords.length === 0 && !start && !end && !userQ;
  let imagesToShow = IMAGES;
  if (!noCriteria) {
    imagesToShow = IMAGES.filter(img => {
      // date filter (inclusive)
      if (start) {
        if (!img.date || img.date < start) return false;
      }
      if (end) {
        if (!img.date || img.date > end) return false;
      }

      // user filter (case-insensitive substring)
      if (userQ) {
        const u = (img.user || '').toLowerCase();
        if (!u.includes(userQ)) return false;
      }

      // keywords/tags combined
      if (searchKeywords.length > 0) {
        const imgKeywords = (img.keywords || img.tags || []).map(s => s.toLowerCase());
        const mode = (keywordModeSelect && keywordModeSelect.value) ? keywordModeSelect.value : 'AND';
        if (mode === 'AND') {
          // every search keyword must be in imgKeywords
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
  }

  applyRender(imagesToShow);
}

clearFiltersBtn.addEventListener('click', () => {
  // no tag chips; just clear inputs
  keywordsInput.value = '';
  startDateInput.value = '';
  endDateInput.value = '';
  userInput.value = '';
  clearResults();
});

// Search is explicit via button
const searchBtn = document.getElementById('searchBtn');
if (searchBtn) searchBtn.addEventListener('click', () => {
  performSearch();
});

// Allow Enter to trigger Search when focused in text inputs
['keywordsInput', 'startDate', 'endDate', 'userInput'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  });
});

// Initialize UI
renderTagList();
// Start with empty results until Search is clicked
// Ensure Registered count is visible immediately
if (registeredCountEl) registeredCountEl.textContent = IMAGES.length;
clearResults();

// Note: filtering (keywords + date range + user + selected keywords) will be implemented next.
