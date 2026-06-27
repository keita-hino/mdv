import { statSync } from 'fs'
import { resolve, dirname } from 'path'
import { ipcMain } from 'electron'
import { IPC, type InitialTarget } from '@shared/ipc'
import { allowRoot } from './fs'

// argv から `--open=<path>` を取り出す。
export function extractOpenArg(argv: string[]): string | null {
  const arg = argv.find((a) => a.startsWith('--open='))
  if (!arg) return null
  const value = arg.slice('--open='.length)
  return value.length > 0 ? value : null
}

// 与えられたパスを初期ターゲットへ解決する（純粋ロジック）。
// isDirectory はファイルシステム判定の結果を注入する（テスト容易性のため）。
export function resolveInitialTarget(rawPath: string, isDirectory: boolean): InitialTarget {
  const abs = resolve(rawPath)
  if (isDirectory) {
    return { root: abs, file: null }
  }
  return { root: dirname(abs), file: abs }
}

// CLI 引数から初期ターゲットを算出する。存在しない/未指定なら null。
function computeInitialTarget(argv: string[]): InitialTarget | null {
  const raw = extractOpenArg(argv)
  if (!raw) return null
  const abs = resolve(raw)
  let isDir: boolean
  try {
    isDir = statSync(abs).isDirectory()
  } catch {
    // 存在しないパスは無視する。
    return null
  }
  const target = resolveInitialTarget(abs, isDir)
  allowRoot(target.root)
  return target
}

export function registerAppHandlers(argv: string[]): void {
  const initialTarget = computeInitialTarget(argv)
  ipcMain.handle(IPC.getInitialTarget, async (): Promise<InitialTarget | null> => initialTarget)
}
