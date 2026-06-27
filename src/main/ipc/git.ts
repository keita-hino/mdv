import { promises as fs } from 'fs'
import { resolve, dirname, relative } from 'path'
import { ipcMain } from 'electron'
import { simpleGit } from 'simple-git'
import { IPC, type FileDiffResult } from '@shared/ipc'

// 開いている単一ファイルの「HEAD時点の内容」と「現在の内容」を取得する。
// レンダラ側でこの2つを比較し、レンダリングに変更ハイライトを付与する。
export function registerGitHandlers(): void {
  ipcMain.handle(IPC.getFileDiff, async (_e, filePath: string): Promise<FileDiffResult> => {
    // /tmp -> /private/tmp のようなシンボリックリンクを解決し、
    // git の --show-toplevel（実パス）と相対パス計算がずれないようにする。
    let absFile = resolve(filePath)
    try {
      absFile = await fs.realpath(absFile)
    } catch {
      // realpath 失敗時はそのまま使う。
    }
    const git = simpleGit({ baseDir: dirname(absFile) })

    let isRepo = false
    try {
      isRepo = await git.checkIsRepo()
    } catch {
      isRepo = false
    }

    // 現在（作業ツリー）の内容は常に読める。
    const newText = await fs.readFile(absFile, 'utf-8')

    if (!isRepo) {
      return { isRepo: false, oldText: '', newText, status: 'unchanged' }
    }

    // リポジトリのトップを求め、そこからの相対パスで HEAD の内容を取得する。
    const topLevel = (await git.revparse(['--show-toplevel'])).trim()
    const relPath = relative(topLevel, absFile).split('\\').join('/')

    let oldText = ''
    let existsInHead = true
    try {
      oldText = await git.show([`HEAD:${relPath}`])
    } catch {
      // HEAD に存在しない（新規ファイル / 未追跡）。
      existsInHead = false
      oldText = ''
    }

    let status: FileDiffResult['status']
    if (!existsInHead) {
      status = 'added'
    } else if (oldText === newText) {
      status = 'unchanged'
    } else {
      status = 'modified'
    }

    return { isRepo: true, oldText, newText, status }
  })
}
