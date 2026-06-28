interface Props {
  hasFile: boolean
  hasChanges: boolean
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
  hasChanges,
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
      <div className="toolbar-right">
        {mode === 'diff' && hasFile && <button onClick={onRefreshDiff}>🔄 更新</button>}
        <button
          className={'diff-check' + (mode === 'diff' ? ' active' : '')}
          onClick={() => onModeChange(mode === 'diff' ? 'doc' : 'diff')}
          disabled={!hasFile}
          title="開いているファイルの git 差分を変更ハイライト付きで表示（再押下で通常表示）"
        >
          <span className="check-box">{mode === 'diff' ? '☑' : '☐'}</span> 差分
          {hasFile && hasChanges && <span className="change-dot" title="未コミットの変更あり" />}
        </button>
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </div>
  )
}
