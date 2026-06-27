import { watchFile, unwatchFile } from 'fs'
import { resolve } from 'path'
import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { IPC } from '@shared/ipc'

// 現在監視中のファイル（同時に1つだけ＝開いているファイル）。
let watched: string | null = null
let listener: ((curr: { mtimeMs: number }, prev: { mtimeMs: number }) => void) | null = null

function stopWatching(): void {
  if (watched && listener) {
    unwatchFile(watched, listener)
  }
  watched = null
  listener = null
}

export function registerWatchHandlers(): void {
  ipcMain.handle(
    IPC.watchFile,
    async (event: IpcMainInvokeEvent, filePath: string | null): Promise<void> => {
      stopWatching()
      if (!filePath) return

      const abs = resolve(filePath)
      watched = abs
      // fs.watchFile はポーリング監視。rename を伴うアトミック保存にも追従し、
      // エディタ/エージェントによる書き換えを取りこぼしにくい。
      listener = (curr, prev): void => {
        // mtime が変わった（=内容更新）ときのみ通知。削除時(mtimeMs=0)も通知する。
        if (curr.mtimeMs !== prev.mtimeMs && watched === abs) {
          if (!event.sender.isDestroyed()) {
            event.sender.send(IPC.fileChanged, abs)
          }
        }
      }
      watchFile(abs, { interval: 400 }, listener)
    }
  )
}
