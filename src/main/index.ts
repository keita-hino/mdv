import { join } from 'path'
import { app, shell, BrowserWindow } from 'electron'
import { registerFsHandlers } from './ipc/fs'
import { registerGitHandlers } from './ipc/git'
import { registerAppHandlers } from './ipc/app'
import { registerWatchHandlers } from './ipc/watch'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    title: 'Markdown Viewer',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  // 外部リンクは既定ブラウザで開く（アプリ内ナビゲーションは禁止）。
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerFsHandlers()
  registerGitHandlers()
  registerAppHandlers(process.argv)
  registerWatchHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
