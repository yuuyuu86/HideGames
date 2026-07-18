const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('hideGamesDesktop', {
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  setBrightness: (value, restore = false) => ipcRenderer.invoke('set-window-brightness', value, restore),
  setAwayShortcut: (accelerator) => ipcRenderer.invoke('set-away-shortcut', accelerator),
  onAwayStarted: (callback) => { const listener = () => callback(); ipcRenderer.on('away-started', listener); return () => ipcRenderer.removeListener('away-started', listener) },
  onAwayReturned: (callback) => { const listener = () => callback(); ipcRenderer.on('away-returned', listener); return () => ipcRenderer.removeListener('away-returned', listener) },
  onRoomLink: (callback) => { const listener = (_event, code) => callback(code); ipcRenderer.on('room-link', listener); return () => ipcRenderer.removeListener('room-link', listener) },
})
