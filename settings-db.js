const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'settings.db');
const db = new sqlite3.Database(DB_PATH);
let cache = {};

function init() {
    // On first run, ensure the DB contains the known setting keys with empty-string values.
    const knownKeys = [
        'javaPath',
        'accountName',
        'accountUrl',
        'accountKey',
        'uploadAddress',
        'appFolder'
    ];

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS Settings (
                Setting TEXT PRIMARY KEY,
                Value TEXT NOT NULL
            )`, (err) => {
                if (err) return reject(err);

                db.all(`SELECT Setting, Value FROM Settings`, (err, rows) => {
                    if (err) return reject(err);
                    rows.forEach(r => {
                        try {
                            cache[r.Setting] = JSON.parse(r.Value);
                        } catch (e) {
                            cache[r.Setting] = r.Value;
                        }
                    });

                    // Ensure known keys exist in DB; if missing, insert empty string value
                    const insert = db.prepare(`INSERT OR IGNORE INTO Settings (Setting, Value) VALUES (?, ?)`);
                    knownKeys.forEach(k => {
                        if (cache[k] === undefined) {
                            insert.run(k, JSON.stringify(''));
                            cache[k] = '';
                        }
                    });
                    insert.finalize((err) => err ? reject(err) : resolve());
                });
            });
        });
    });
}

function get(key) {
    return cache[key];
}

function getAll() {
    return { ...cache };
}

function set(key, value) {
    return new Promise((resolve, reject) => {
        const vstr = JSON.stringify(value);
        db.run(`INSERT INTO Settings (Setting, Value) VALUES (?, ?) ON CONFLICT(Setting) DO UPDATE SET Value=excluded.Value`, [key, vstr], function(err) {
            if (err) return reject(err);
            cache[key] = value;
            resolve();
        });
    });
}

module.exports = { init, get, getAll, set, db };
