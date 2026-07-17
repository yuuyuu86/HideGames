const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron')
const path = require('path')

let mainWindow
let hidden = false
let awayShortcut = 'CommandOrControl+Shift+H'
let pendingRoomCode = null
const send = (event) => mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.send(event)
function openRoomLink(url) { const code = typeof url === 'string' ? url.match(/^hidegames:\/\/room\/([A-Z0-9]{6})$/i)?.[1]?.toUpperCase() : null; if (!code) return; pendingRoomCode = code; send('room-link', code) }
function showWindow() { if (!mainWindow) return; mainWindow.show(); mainWindow.focus(); hidden = false; send('away-returned') }
function hideWindow() { if (!mainWindow) return; send('away-started'); mainWindow.hide(); hidden = true }
function toggleAway() { if (hidden || !mainWindow.isVisible()) showWindow(); else hideWindow() }
function createWindow() {
  mainWindow = new BrowserWindow({ width: 1440, height: 920, minWidth: 960, minHeight: 680, backgroundColor: '#08111e', titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } })
  mainWindow.loadURL(process.env.HIDEGAMES_DEV_URL || 'http://127.0.0.1:5173')
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => console.error('Renderer load failed:', code, description, url))
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => console.error(`Renderer console [${level}] ${sourceId}:${line} ${message}`))
  mainWindow.webContents.on('render-process-gone', (_event, details) => console.error('Renderer process exited:', details.reason))
  mainWindow.webContents.once('did-finish-load', () => { if (pendingRoomCode) send('room-link', pendingRoomCode) })
}
app.on('open-url', (event, url) => { event.preventDefault(); openRoomLink(url) })
app.whenReady().then(() => { app.setAsDefaultProtocolClient('hidegames'); createWindow(); globalShortcut.register(awayShortcut, toggleAway); const url = process.argv.find(arg => arg.startsWith('hidegames://')); if (url) openRoomLink(url); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() }) })
ipcMain.handle('hide-window', hideWindow)
ipcMain.handle('show-window', showWindow)
ipcMain.handle('set-window-brightness', () => ({ supported: false }))
ipcMain.handle('set-away-shortcut', (_event, accelerator) => {
  if (typeof accelerator !== 'string' || !accelerator.trim()) return { ok: false, message: 'キーを入力してください' }
  const next = accelerator.replace(/Ctrl/gi, 'CommandOrControl').replace(/\s*\+\s*/g, '+')
  globalShortcut.unregister(awayShortcut)
  if (!globalShortcut.register(next, toggleAway)) { globalShortcut.register(awayShortcut, toggleAway); return { ok: false, message: 'このキーは他のアプリまたはOSで使用されています' } }
  awayShortcut = next
  return { ok: true, accelerator: awayShortcut }
})
app.on('will-quit', () => globalShortcut.unregisterAll())
