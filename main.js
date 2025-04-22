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
ipcMain.on('save-bookmark', (event, { key, url, time }) => {
  saveBookmark(key, url, time);
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

app.whenReady().then(() => {
  createWindow();
});
