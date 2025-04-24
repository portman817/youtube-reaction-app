const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { saveBookmark, loadBookmarks } = require('./backend/db');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
}

// Bookmark speichern
ipcMain.on('save-bookmark', (event, { key, url, title, time }) => {
  saveBookmark(key, url, title, time);
});

//Alle Bookmarks laden
ipcMain.handle('load-bookmarks', () => {
  return loadBookmarks();
});

//Bookmarks löschen
ipcMain.on('clear-bookmarks', () => {
  const db = require('./backend/db');
  db.clearBookmarks(); // Aufruf der Methode aus backend/db.js
});

ipcMain.on('delete-bookmark', (event, key) => {
  const db = require('./backend/db');
  db.deleteBookmark(key);
});

ipcMain.on('save-notes', (event, text) => {
  const db = require('./backend/db');
  db.saveNotes(text);
});

ipcMain.handle('load-notes', () => {
  const db = require('./backend/db');
  return db.loadNotes();
});



app.whenReady().then(() => {
  createWindow();
});
