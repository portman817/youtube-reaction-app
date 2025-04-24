const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveBookmark: (key, url, title, time) => ipcRenderer.send('save-bookmark', { key, url, title, time }),
  loadBookmarks: () => ipcRenderer.invoke('load-bookmarks'),
  clearBookmarks: () => ipcRenderer.send('clear-bookmarks'),
  deleteBookmark: (key) => ipcRenderer.send('delete-bookmark', key),
  saveNotes: (text) => ipcRenderer.send('save-notes', text),
  loadNotes: () => ipcRenderer.invoke('load-notes')

});
