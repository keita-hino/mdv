import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC,
  type MarkdownViewerApi,
  type OpenFolderResult,
  type TreeNode,
  type FileDiffResult,
  type FileStatusResult,
  type InitialTarget
} from '@shared/ipc'

const api: MarkdownViewerApi = {
  openFolder: (): Promise<OpenFolderResult | null> => ipcRenderer.invoke(IPC.openFolder),
  getTree: (root: string): Promise<TreeNode> => ipcRenderer.invoke(IPC.getTree, root),
  readFile: (path: string): Promise<string> => ipcRenderer.invoke(IPC.readFile, path),
  getFileDiff: (filePath: string): Promise<FileDiffResult> =>
    ipcRenderer.invoke(IPC.getFileDiff, filePath),
  getFileStatus: (filePath: string): Promise<FileStatusResult> =>
    ipcRenderer.invoke(IPC.getFileStatus, filePath),
  getInitialTarget: (): Promise<InitialTarget | null> => ipcRenderer.invoke(IPC.getInitialTarget),
  watchFile: (filePath: string | null): Promise<void> =>
    ipcRenderer.invoke(IPC.watchFile, filePath),
  onFileChanged: (callback: (filePath: string) => void): (() => void) => {
    const handler = (_e: unknown, filePath: string): void => callback(filePath)
    ipcRenderer.on(IPC.fileChanged, handler)
    return () => ipcRenderer.removeListener(IPC.fileChanged, handler)
  }
}

contextBridge.exposeInMainWorld('api', api)
