interface Props {
  rootPath: string | null
  hasFile: boolean
  mode: 'doc' | 'diff'
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onOpenFolder: () => void
  onModeChange: (mode: 'doc' | 'diff') => void
  onRefreshDiff: () => void
}

export default function Toolbar({
  rootPath,
  hasFile,
  mode,
  sidebarOpen,
  onToggleSidebar,
  onOpenFolder,
  onModeChange,
  onRefreshDiff
}: Props): JSX.Element {
  return (
    <div className="toolbar">
      <button
        className="icon-btn"
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'サイドバーを隠す' : 'サイドバーを表示'}
      >
        ☰
      </button>
      <button onClick={onOpenFolder}>📂 フォルダを開く</button>
      <div className="toolbar-tabs">
        <button
          className={mode === 'doc' ? 'active' : ''}
          onClick={() => onModeChange('doc')}
          disabled={!hasFile}
        >
          表示
        </button>
        <button
          className={mode === 'diff' ? 'active' : ''}
          onClick={() => onModeChange('diff')}
          disabled={!hasFile}
          title="開いているファイルの git 差分を変更ハイライト付きで表示"
        >
          差分
        </button>
      </div>
      {mode === 'diff' && hasFile && (
        <button onClick={onRefreshDiff}>🔄 更新</button>
      )}
      <span className="toolbar-path" title={rootPath ?? ''}>
        {rootPath ?? 'フォルダ未選択'}
      </span>
    </div>
  )
}
