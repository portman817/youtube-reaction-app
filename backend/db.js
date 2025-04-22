const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'bookmarks.db'));

//Tabelle beim Start erstellen (wenn nicht vorhanden)
db.prepare(`
  CREATE TABLE IF NOT EXISTS bookmarks (
    key TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    time REAL NOT NULL
  )
`).run();

//Bookmark speichern oder aktualisieren
function saveBookmark(key, url, time) {
  db.prepare(`
    INSERT OR REPLACE INTO bookmarks (key, url, time)
    VALUES (?, ?, ?)
  `).run(key, url, time);
}

//Alle Bookmarks laden
function loadBookmarks() {
  return db.prepare(`SELECT * FROM bookmarks`).all();
}

//Alle Bookmarks löschen
function clearBookmarks() {
  db.prepare('DELETE FROM bookmarks').run();
}

//Funktionen exportieren
module.exports = {
  saveBookmark,
  loadBookmarks,
  clearBookmarks
};
