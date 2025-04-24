const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'bookmarks.db'));

//Tabelle beim Start erstellen (wenn nicht vorhanden)
db.prepare(`
  CREATE TABLE IF NOT EXISTS bookmarks (
    key TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    time REAL NOT NULL
  )
`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  content TEXT
)`).run();

//Bookmark speichern oder aktualisieren
function saveBookmark(key, url, title, time) {
  db.prepare(`
    INSERT OR REPLACE INTO bookmarks (key, url, title, time)
    VALUES (?, ?, ?, ?)
  `).run(key, url, title, time);
}


//Alle Bookmarks laden
function loadBookmarks() {
  return db.prepare(`SELECT * FROM bookmarks`).all();
}

//Alle Bookmarks löschen
function clearBookmarks() {
  db.prepare(`DELETE FROM bookmarks`).run();
}

function deleteBookmark(key) {
  db.prepare('DELETE FROM bookmarks WHERE key = ?').run(key);
}

function saveNotes(content) {
  db.prepare(`INSERT OR REPLACE INTO notes (id, content) VALUES (1, ?)`).run(content);
}

function loadNotes() {
  const row = db.prepare(`SELECT content FROM notes WHERE id = 1`).get();
  return row ? row.content : '';
}


//Funktionen exportieren
module.exports = {
  saveBookmark,
  loadBookmarks,
  clearBookmarks,
  deleteBookmark,
  saveNotes,
  loadNotes
};