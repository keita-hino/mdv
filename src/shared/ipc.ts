// main / preload / renderer の3プロセスで共有する IPC 契約の単一ソース。

export const IPC = {
  openFolder: 'dialog:openFolder',
  getTree: 'tree:get',
  readFile: 'file:read',
  getFileDiff: 'git:fileDiff',
  getFileStatus: 'git:fileStatus',
  getInitialTarget: 'app:getInitialTarget',
  watchFile: 'watch:file',
  // main -> renderer のイベント（ファイル更新通知）。
  fileChanged: 'file:changed'
} as const

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: TreeNode[]
}

export interface OpenFolderResult {
  path: string
}

// 開いている単一ファイルの git 差分（変更前後の内容）。
// 変更前後を比較してレンダリングに変更ハイライトを付けるために使う。
export interface FileDiffResult {
  isRepo: boolean
  // HEAD 時点の内容（新規ファイルなら空文字）。
  oldText: string
  // 作業ツリー（現在）の内容。
  newText: string
  // 'added' = HEAD に無い新規 / 'modified' = 変更あり / 'unchanged' = 差分なし
  status: 'added' | 'modified' | 'unchanged'
}

// ヘッダーの変更ドット用の軽量なファイル状態（内容は読まない）。
export interface FileStatusResult {
  isRepo: boolean
  hasChanges: boolean
}

// CLI（markdown <path>）で指定された初期表示対象。
// ファイル指定時は root=親ディレクトリ / file=そのファイル、
// フォルダ指定時は root=そのフォルダ / file=null。
export interface InitialTarget {
  root: string
  file: string | null
}

// preload が contextBridge で公開する API の型。renderer / preload 双方が参照する。
export interface MarkdownViewerApi {
  openFolder(): Promise<OpenFolderResult | null>
  getTree(root: string): Promise<TreeNode>
  readFile(path: string): Promise<string>
  getFileDiff(filePath: string): Promise<FileDiffResult>
  getFileStatus(filePath: string): Promise<FileStatusResult>
  getInitialTarget(): Promise<InitialTarget | null>
  // 指定ファイルの更新監視を開始する（null で監視解除）。
  watchFile(filePath: string | null): Promise<void>
  // ファイル更新時に呼ばれるコールバックを登録する。戻り値で解除。
  onFileChanged(callback: (filePath: string) => void): () => void
}
