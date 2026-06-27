import { promises as fs } from 'fs'
import { resolve, relative, isAbsolute } from 'path'
import { dialog, ipcMain, BrowserWindow } from 'electron'
import { IPC, type OpenFolderResult, type TreeNode } from '@shared/ipc'
import { buildTree } from '../fileTree'

// renderer から開いたフォルダの集合。file:read / tree:get のパス検証に使う。
const allowedRoots = new Set<string>()

// CLI 起動時の初期ルートなど、外部から許可ルートを登録する。
export function allowRoot(root: string): void {
  allowedRoots.add(resolve(root))
}

function isInsideAllowedRoot(target: string): boolean {
  const resolved = resolve(target)
  for (const root of allowedRoots) {
    const rel = relative(root, resolved)
    if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) {
      return true
    }
  }
  return false
}

export function registerFsHandlers(): void {
  ipcMain.handle(IPC.openFolder, async (): Promise<OpenFolderResult | null> => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const result = win
      ? await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] })

    if (result.canceled || result.filePaths.length === 0) return null
    const root = resolve(result.filePaths[0])
    allowedRoots.add(root)
    return { path: root }
  })

  ipcMain.handle(IPC.getTree, async (_e, root: string): Promise<TreeNode> => {
    const resolved = resolve(root)
    // 明示的に開いたルートのみ走査を許可する。
    allowedRoots.add(resolved)
    return buildTree(resolved)
  })

  ipcMain.handle(IPC.readFile, async (_e, filePath: string): Promise<string> => {
    if (!isInsideAllowedRoot(filePath)) {
      throw new Error('許可されたフォルダ外のファイルにはアクセスできません')
    }
    return fs.readFile(resolve(filePath), 'utf-8')
  })
}
