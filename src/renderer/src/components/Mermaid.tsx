import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { attachEntitySelection } from '../lib/mermaidSelection'

let initialized = false
function initMermaid(): void {
  if (initialized) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'default',
    er: { useMaxWidth: true }
  })
  initialized = true
}

// 描画 ID 用の単調増加カウンタ（Math.random は使わない方針）。
let renderSeq = 0

interface Props {
  code: string
}

export default function Mermaid({ code }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initMermaid()
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
  }, [code])

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
