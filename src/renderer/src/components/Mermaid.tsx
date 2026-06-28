import { useContext, useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { attachEntitySelection } from '../lib/mermaidSelection'
import { ThemeContext } from '../lib/theme'

// 描画 ID 用の単調増加カウンタ（Math.random は使わない方針）。
let renderSeq = 0

interface Props {
  code: string
}

export default function Mermaid({ code }: Props): JSX.Element {
  const theme = useContext(ThemeContext)
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // テーマ変更時にも再初期化して図の配色を合わせる（dark/default を切替）。
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: theme === 'dark' ? 'dark' : 'default',
      er: { useMaxWidth: true }
    })
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let detach: (() => void) | null = null
    const id = `mermaid-${++renderSeq}`

    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (cancelled || !container) return
        container.innerHTML = svg
        setError(null)
        // 描画後に ER 図のテーブル名ダブルクリック選択を装着する。
        detach = attachEntitySelection(container)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
      })

    return () => {
      cancelled = true
      detach?.()
    }
  }, [code, theme])

  if (error) {
    return (
      <pre className="mermaid-error">
        Mermaid 描画エラー:{'\n'}
        {error}
      </pre>
    )
  }

  return <div className="mermaid-container" ref={containerRef} />
}
