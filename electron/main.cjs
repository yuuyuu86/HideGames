const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { execFile } = require('child_process')
const { promisify } = require('util')

let mainWindow
let hidden = false
let awayShortcut = 'CommandOrControl+Shift+H'
let pendingRoomCode = null
let brightnessBeforeAway = null
const execFileAsync = promisify(execFile)
const shortcutSettingsPath = () => path.join(app.getPath('userData'), 'hidegames-settings.json')
function loadAwayShortcut() { try { const saved = JSON.parse(fs.readFileSync(shortcutSettingsPath(), 'utf8')); return typeof saved.awayShortcut === 'string' && saved.awayShortcut ? saved.awayShortcut : awayShortcut } catch { return awayShortcut } }
function saveAwayShortcut() { try { fs.writeFileSync(shortcutSettingsPath(), JSON.stringify({ awayShortcut }), { mode: 0o600 }) } catch (error) { console.error('Could not save away shortcut:', error.message) } }
const send = (event) => mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.send(event)
function openRoomLink(url) { const code = typeof url === 'string' ? url.match(/^hidegames:\/\/room\/([A-Z0-9]{6})$/i)?.[1]?.toUpperCase() : null; if (!code) return; pendingRoomCode = code; send('room-link', code) }
function showWindow() { if (!mainWindow) return; mainWindow.show(); mainWindow.focus(); hidden = false; send('away-returned') }
function hideWindow() { if (!mainWindow) return; send('away-started'); mainWindow.hide(); hidden = true }
function toggleAway() { if (hidden || !mainWindow.isVisible()) showWindow(); else hideWindow() }
function createWindow() {
  mainWindow = new BrowserWindow({ width: 1440, height: 920, minWidth: 960, minHeight: 680, backgroundColor: '#08111e', titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } })
  mainWindow.loadURL(process.env.HIDEGAMES_DEV_URL || 'http://127.0.0.1:5173')
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => console.error('Renderer load failed:', code, description, url))
  mainWindow.webContents.on('console-message', details => console.error(`Renderer console [${details.level}] ${details.sourceId}:${details.lineNumber} ${details.message}`))
  mainWindow.webContents.on('render-process-gone', (_event, details) => console.error('Renderer process exited:', details.reason))
  mainWindow.webContents.once('did-finish-load', () => { if (pendingRoomCode) send('room-link', pendingRoomCode) })
}
app.on('open-url', (event, url) => { event.preventDefault(); openRoomLink(url) })
app.whenReady().then(() => { app.setAsDefaultProtocolClient('hidegames'); awayShortcut = loadAwayShortcut(); createWindow(); if (!globalShortcut.register(awayShortcut, toggleAway)) { awayShortcut = 'CommandOrControl+Shift+H'; globalShortcut.register(awayShortcut, toggleAway) } const url = process.argv.find(arg => arg.startsWith('hidegames://')); if (url) openRoomLink(url); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() }) })
ipcMain.handle('hide-window', hideWindow)
ipcMain.handle('show-window', showWindow)
// Native brightness control differs across operating systems and external displays.
// Keep the explicit raise/restore protocol so a supported adapter can preserve the
// original level without changing the away-state contract in the renderer.
async function setDisplayBrightness(value, restore = false) {
  if (process.platform === 'win32') {
    try {
      if (restore) {
        if (brightnessBeforeAway === null) return { supported: true }
        await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$ErrorActionPreference = 'Stop'; (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${brightnessBeforeAway})`])
        brightnessBeforeAway = null
        return { supported: true }
      }
      if (brightnessBeforeAway === null) {
        const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "$ErrorActionPreference = 'Stop'; (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness"])
        const current = Number([...stdout.matchAll(/\d+/g)].map(match => Number(match[0])).at(-1))
        if (!Number.isFinite(current)) return { supported: false, message: '現在の明るさを取得できませんでした' }
        brightnessBeforeAway = current
      }
      const next = Math.max(1, Math.min(100, Math.round(Number(value))))
      await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$ErrorActionPreference = 'Stop'; (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${next})`])
      return { supported: true }
    } catch {
      return { supported: false, message: 'このWindowsディスプレイはWMIの明るさ制御に対応していません' }
    }
  }
  if (process.platform !== 'darwin') return { supported: false, message: 'このOSの物理ディスプレイ制御には未対応です' }
  try {
    if (restore) {
      if (brightnessBeforeAway === null) return { supported: true }
      await execFileAsync('ddcctl', ['-d', '1', '-b', String(brightnessBeforeAway)])
      brightnessBeforeAway = null
      return { supported: true }
    }
    if (brightnessBeforeAway === null) {
      const { stdout } = await execFileAsync('ddcctl', ['-d', '1', '-g', 'b'])
      const values = [...stdout.matchAll(/\d+/g)].map(match => Number(match[0]))
      const current = values.at(-1)
      if (!Number.isFinite(current)) return { supported: false, message: '現在の明るさを取得できませんでした' }
      brightnessBeforeAway = current
    }
    const next = Math.max(1, Math.min(100, Math.round(Number(value))))
    await execFileAsync('ddcctl', ['-d', '1', '-b', String(next)])
    return { supported: true }
  } catch (error) {
    if (error?.code === 'ENOENT') return { supported: false, message: 'ddcctl が見つかりません。対応モニターでは brew install ddcctl を実行してください' }
    return { supported: false, message: 'このディスプレイはDDC/CIの明るさ制御に対応していません' }
  }
}
ipcMain.handle('set-window-brightness', (_event, value, restore = false) => setDisplayBrightness(value, restore))
ipcMain.handle('set-away-shortcut', (_event, accelerator) => {
  if (typeof accelerator !== 'string' || !accelerator.trim()) return { ok: false, message: 'キーを入力してください' }
  const next = accelerator.replace(/Ctrl/gi, 'CommandOrControl').replace(/\s*\+\s*/g, '+')
  globalShortcut.unregister(awayShortcut)
  if (!globalShortcut.register(next, toggleAway)) { globalShortcut.register(awayShortcut, toggleAway); return { ok: false, message: 'このキーは他のアプリまたはOSで使用されています' } }
  awayShortcut = next
  saveAwayShortcut()
  return { ok: true, accelerator: awayShortcut }
})
app.on('will-quit', () => globalShortcut.unregisterAll())
