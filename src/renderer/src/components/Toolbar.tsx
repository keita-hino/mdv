interface Props {
  hasFile: boolean
  mode: 'doc' | 'diff'
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onToggleSidebar: () => void
  onModeChange: (mode: 'doc' | 'diff') => void
  onRefreshDiff: () => void
}

export default function Toolbar({
  hasFile,
  mode,
  sidebarOpen,
  theme,
  onToggleTheme,
  onToggleSidebar,
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
      <button
        className="icon-btn theme-btn"
        onClick={onToggleTheme}
        title={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
      >
        {theme === 'dark' ? '☀' : '☾'}
      </button>
    </div>
  )
}
