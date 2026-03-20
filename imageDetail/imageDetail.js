// imageDetail/imageDetail.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('imgDb');

// Helper functions
function qs(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

async function findImageById(id) {
    const query = "SELECT * FROM Images WHERE id = ?";
    return new Promise((resolve, reject) => {
        db.get(query, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function getImageWords(imageId) {
    return new Promise((res, rej) => {
        db.all(`SELECT word
                FROM ImageWords 
                WHERE imgId = ?`,
            [imageId],
            (err, rows) => {
                if (err) {
                    rej(err);
                } else {
                    res(rows.map(row => row.word));
                }
            }
        );
    });
}

function renderMetadata(image, keywords) {
    // this is not really readable by humans. might be worth refactoring
    // for readability.
    const dl = document.getElementById('metaList');
    dl.innerHTML = '';
    function add(k, v) {
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        dd.textContent = v;
        dl.appendChild(dt);
        dl.appendChild(dd);
    }

    add('ID', image.id);
    add('Filename', image.filename || image.imgPath.split(/[\\/]/).pop());
    add('Full Path', image.imgPath);

    let formattedDate = image.date;
    if (image.date) {
        const d = new Date(image.date);
        if (!isNaN(d)) {
            formattedDate = d.toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        }
    }
    add('Date', formattedDate);
    add('User', image.user || '—');
    add('Keywords', keywords.join(', '));
}

// Image zoom handling
let currentScale = 0.4;
const fullImageEl = document.getElementById('fullImage');
const zoomLevelEl = document.getElementById('zoomLevel');

function setScale(s) {
    currentScale = Math.max(0.1, Math.min(5, s));
    fullImageEl.style.width = Math.round(currentScale * 100) + '%';
    fullImageEl.style.height = 'auto';
    zoomLevelEl.textContent = Math.round(currentScale * 100) + '%';
}

function setupZoomControls() {
    document.getElementById('zoomInBtn').addEventListener('click', () => setScale(currentScale + 0.2));
    document.getElementById('zoomOutBtn').addEventListener('click', () => setScale(currentScale - 0.2));
    document.getElementById('zoomResetBtn').addEventListener('click', () => setScale(0.4));
}

// Main load function
async function loadDetail() {
    const id = qs('id');
    if (!id) {
        document.getElementById('title').textContent = 'No ID provided';
        return;
    }

    try {
        const image = await findImageById(id);
        const keywords = await getImageWords(id);
        console.log(keywords);
        if (!image || !keywords) {
            document.getElementById('title').textContent = 'Image not found';
        } else {
            const fname = image.filename || image.imgPath.split(/[\\/]/).pop();
            document.getElementById('title').textContent = fname;
            const fullImage = document.getElementById('fullImage');
            fullImage.src = 'file://' + image.imgPath;
            fullImage.alt = fname;
            renderMetadata(image, keywords);
            await renderTagsAndNotes(image);
            setScale(0.4);
            try { await loadAllTags(); } catch (e) {}
        }
    } catch (err) {
        console.error('Failed to load image:', err);
        document.getElementById('title').textContent = 'Error loading image';
    }
}

// Tags functions
async function getImageTags(imageId) {
    return new Promise((res, rej) => {
        db.all(`SELECT t.tag
                FROM ImageTags it, tags t 
                WHERE it.tagId = t.id AND it.imgId = ?`,
            [imageId],
            (err, rows) => {
                if (err) {
                    rej(err);
                } else {
                    res(rows.map(r => r.tag));
                }
            }
        );
    });
}

async function renderTagsAndNotes(image) {
    const tags = await getImageTags(image.id);
    const tagsContainer = document.getElementById('tagsContainer');
    tagsContainer.innerHTML = '';

    tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag';
        btn.textContent = tag + ' ×';
        btn.setAttribute('aria-label', `Remove tag ${tag}`);
        btn.addEventListener('click', async () => {
            await removeTag(image.id, tag);
        });
        tagsContainer.appendChild(btn);
    });

    const notesBox = document.getElementById('notesBox');
    notesBox.value = image.notes || '';
}

/*
    DEBUG:
    this is the function that queries that database for all of the relevant tags, and adds them
    as selectable options in the input field's dropdown list.
*/
async function loadAllTags() {
    const rows = await new Promise((res, rej) => {
        db.all(`SELECT tag FROM Tags`, [], (err, rows) => err ? rej(err) : res(rows));
    });

    const tags = rows.map(r => r.tag);
    const list = document.getElementById('tagsList');
    list.innerHTML = '';

    tags.sort().forEach(tag => {
        const opt = document.createElement('option');
        opt.value = tag;
        list.appendChild(opt);
    });
}

async function getTagId(tag) {
    const rows = await new Promise((res, rej) => {
        db.all(`SELECT id FROM Tags WHERE tag = ?`, [tag], (err, rows) => err ? rej(err) : res(rows));
    });

    if (rows.length === 0) {
        return await new Promise((resolve, reject) => {
            db.run(`INSERT INTO Tags (tag) VALUES (?)`, [tag], function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    return rows[0].id;
}

async function addTag(id, newTag) {
    if (!newTag) return;
    newTag = String(newTag).trim();
    if (newTag.indexOf(' ') !== -1) return;
    newTag = newTag.toLowerCase();

    const tags = await getImageTags(id);
    if (tags.includes(newTag)) return;

    const tagId = await getTagId(newTag);
    await new Promise((resolve, reject) => {
        db.run(`INSERT INTO ImageTags (imgId, tagId) VALUES (?, ?)`, [id, tagId], function (err) {
            if (err) reject(err);
            else resolve();
        });
    });

    tags.push(newTag);
    const row = await findImageById(id);
    await renderTagsAndNotes(Object.assign({}, row, { tags: JSON.stringify(tags) }));
    await loadAllTags();
}

async function removeTag(id, tagToRemove) {
    const tagId = await getTagId(tagToRemove);
    await new Promise((resolve, reject) => {
        db.run(`DELETE FROM ImageTags WHERE imgId = ? AND tagId = ?`, [id, tagId],
            function (err) {
                if (err) reject(err);
                else resolve();
            });
    });

    const row = await findImageById(id);
    let tags = await getImageTags(id);
    tags = tags.filter(t => t !== tagToRemove);
    await renderTagsAndNotes(Object.assign({}, row, { tags: JSON.stringify(tags) }));
    await loadAllTags();
}

// Notes functions
let notesTimer = null;

async function saveNotesToDb(id, notesText) {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE Images SET notes = ? WHERE id = ?`, [String(notesText || ''), id], function (err) {
            if (err) reject(err);
            else resolve();
        });
    });
}

function setupTagAndNotesHandlers() {
    const addBtn = document.getElementById('addTagBtn');
    const tagInput = document.getElementById('tagInput');
    const notesBox = document.getElementById('notesBox');
    const notesStatus = document.getElementById('notesStatus');
    const id = qs('id');
    if (!id) return;

    addBtn.addEventListener('click', async () => {
        const t = tagInput.value.trim();
        if (!t) return;
        await addTag(id, t);
        tagInput.value = '';
        tagInput.focus();
    });

    loadAllTags().catch(err => console.error('Could not load tag list:', err));

    tagInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addBtn.click();
        }
    });

    notesBox.addEventListener('input', () => {
        notesStatus.textContent = 'Saving...';
        if (notesTimer) clearTimeout(notesTimer);
        notesTimer = setTimeout(async () => {
            try {
                await saveNotesToDb(id, notesBox.value);
                notesStatus.textContent = 'Auto-saved';
            } catch (err) {
                console.error('Failed to save notes:', err);
                notesStatus.textContent = 'Save failed';
            }
        }, 700);
    });
}

// Initialize everything when DOM is ready
function initialize() {
    setupZoomControls();
    loadDetail();
    setupTagAndNotesHandlers();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}