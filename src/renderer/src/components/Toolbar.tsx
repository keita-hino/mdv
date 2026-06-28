interface Props {
  hasFile: boolean
  hasChanges: boolean
  mode: 'doc' | 'diff'
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onToggleSidebar: () => void
  onModeChange: (mode: 'doc' | 'diff') => void
}

// 差分を表すアイコン（+ と - を上下に）。色はボタンの文字色に追従。
function DiffIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      >
        {/* plus */}
        <line x1="4" y1="2.5" x2="4" y2="7.5" />
        <line x1="1.5" y1="5" x2="6.5" y2="5" />
        {/* minus */}
        <line x1="9.5" y1="11" x2="14.5" y2="11" />
      </g>
    </svg>
  )
}

export default function Toolbar({
  hasFile,
  hasChanges,
  mode,
  sidebarOpen,
  theme,
  onToggleTheme,
  onToggleSidebar,
  onModeChange
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
        <button
          className={'diff-toggle' + (mode === 'diff' ? ' active' : '')}
          onClick={() => onModeChange(mode === 'diff' ? 'doc' : 'diff')}
          disabled={!hasFile}
          title="開いているファイルの git 差分を変更ハイライト付きで表示（再押下で通常表示）"
        >
          <DiffIcon />
          <span>差分</span>
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
