const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveBookmark: (key, url, time) => ipcRenderer.send('save-bookmark', { key, url, time }),
  loadBookmarks: () => ipcRenderer.invoke('load-bookmarks'),
  clearBookmarks: () => ipcRenderer.send('clear-bookmarks')
  
});
