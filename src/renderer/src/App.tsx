import { useCallback, useEffect, useRef, useState } from 'react'
import type { TreeNode } from '@shared/ipc'
import Toolbar from './components/Toolbar'
import FileTree from './components/FileTree'
import MarkdownView from './components/MarkdownView'
import FileDiffView from './components/FileDiffView'
import { ThemeContext, loadTheme, saveTheme, type Theme } from './lib/theme'
// highlight.js テーマはテーマに応じて差し替える（同時に1つだけ注入）。
import githubLight from 'highlight.js/styles/github.css?inline'
import githubDark from 'highlight.js/styles/github-dark.css?inline'

export default function App(): JSX.Element {
  const [rootPath, setRootPath] = useState<string | null>(null)
  const [tree, setTree] = useState<TreeNode | null>(null)
  const [selectedFile, setSelectedFile] = useState<TreeNode | null>(null)
  const [content, setContent] = useState<string>('')
  const [mode, setMode] = useState<'doc' | 'diff'>('doc')
  const [diffRefreshKey, setDiffRefreshKey] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [theme, setTheme] = useState<Theme>(loadTheme)

  // ファイル更新コールバック内で最新の選択ファイルを参照するための ref。
  const selectedRef = useRef<TreeNode | null>(null)
  selectedRef.current = selectedFile

  const loadFile = useCallback(async (path: string, name: string) => {
    setSelectedFile({ name, path, type: 'file' })
    setMode('doc')
    try {
      const text = await window.api.readFile(path)
      setContent(text)
    } catch (e) {
      setContent('ファイルの読み込みに失敗しました: ' + (e instanceof Error ? e.message : String(e)))
    }
  }, [])

  // ルート（と任意の初期ファイル）を読み込む共通処理。
  const loadRoot = useCallback(
    async (root: string, file: string | null) => {
      setRootPath(root)
      setSelectedFile(null)
      setContent('')
      setMode('doc')
      const t = await window.api.getTree(root)
      setTree(t)
      if (file) {
        await loadFile(file, file.split('/').pop() ?? file)
      }
    },
    [loadFile]
  )

  const openFolder = useCallback(async () => {
    const result = await window.api.openFolder()
    if (!result) return
    await loadRoot(result.path, null)
  }, [loadRoot])

  const selectFile = useCallback(
    async (node: TreeNode) => {
      if (node.type !== 'file') return
      await loadFile(node.path, node.name)
    },
    [loadFile]
  )

  // CLI（markdown <path>）で指定された初期ターゲットを起動時に開く。
  useEffect(() => {
    window.api.getInitialTarget().then((target) => {
      if (target) loadRoot(target.root, target.file)
    })
  }, [loadRoot])

  // テーマを適用する: data-theme 属性 + highlight.js テーマ差し替え + 永続化。
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    let styleEl = document.getElementById('hljs-theme') as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'hljs-theme'
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = theme === 'dark' ? githubDark : githubLight
    saveTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  // 選択中ファイルの更新監視を開始/切り替える（未選択なら解除）。
  useEffect(() => {
    window.api.watchFile(selectedFile?.path ?? null)
    return () => {
      window.api.watchFile(null)
    }
  }, [selectedFile])

  // ファイルが更新されたら、表示中の内容と差分を自動で再読込する。
  useEffect(() => {
    const unsubscribe = window.api.onFileChanged(async (changedPath) => {
      const current = selectedRef.current
      if (!current || current.path !== changedPath) return
      try {
        const text = await window.api.readFile(current.path)
        setContent(text)
      } catch {
        // 一時的に読めない場合（保存途中など）は次の通知で再取得される。
      }
      // 差分表示中なら再取得をトリガする。
      setDiffRefreshKey((k) => k + 1)
    })
    return unsubscribe
  }, [])

  // Cmd/Ctrl+O でフォルダを開く。
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        openFolder()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openFolder])

  return (
    <ThemeContext.Provider value={theme}>
    <div className="app">
      <Toolbar
        hasFile={!!selectedFile}
        mode={mode}
        sidebarOpen={sidebarOpen}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onModeChange={setMode}
        onRefreshDiff={() => setDiffRefreshKey((k) => k + 1)}
      />
      <div className="main">
        <aside className={'sidebar' + (sidebarOpen ? '' : ' collapsed')}>
          {tree ? (
            <FileTree node={tree} selectedPath={selectedFile?.path ?? null} onSelect={selectFile} />
          ) : (
            <div className="sidebar-empty">フォルダを開いてください</div>
          )}
        </aside>
        <main className="content">
          {selectedFile ? (
            mode === 'diff' ? (
              <FileDiffView filePath={selectedFile.path} refreshKey={diffRefreshKey} />
            ) : (
              <div className="content-pane">
                <MarkdownView content={content} />
              </div>
            )
          ) : (
            <div className="content-pane empty">
              <p>左のツリーから Markdown ファイルを選択してください。</p>
            </div>
          )}
        </main>
      </div>
    </div>
    </ThemeContext.Provider>
  )
}
