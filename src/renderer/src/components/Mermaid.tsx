import { useContext, useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { attachEntitySelection } from '../lib/mermaidSelection'
import { ThemeContext } from '../lib/theme'
import { MermaidDiffContext } from '../lib/mermaidDiff'

// 描画 ID 用の単調増加カウンタ（Math.random は使わない方針）。
let renderSeq = 0

// エンティティの箱に指定クラスを付与する（緑=変更/赤=削除）。
function highlightEntities(container: HTMLElement, names: string[], cls: string): void {
  const set = new Set(names)
  container.querySelectorAll('text.entityLabel').forEach((t) => {
    if ((t.id || '').includes('-attr-')) return
    if (!set.has((t.textContent || '').trim())) return
    const group = t.closest('g[id^="entity-"]') ?? t.parentElement
    const box = group?.querySelector('rect.entityBox') ?? group?.querySelector('rect')
    box?.classList.add(cls)
  })
}

// 属性（カラム）行に指定クラスを付与する。
// 属性セルの id は "...-attr-<N>-type|name|key"（N は出現順1始まり）。
function highlightAttrs(
  container: HTMLElement,
  attrs: Record<string, number[]>,
  cls: string
): void {
  for (const [name, indices] of Object.entries(attrs)) {
    const group = container.querySelector(`g[id^="entity-${name}-"]`)
    if (!group) continue
    for (const n of indices) {
      group.querySelectorAll(`[id*="-attr-${n}-"]`).forEach((el) => el.classList.add(cls))
    }
  }
}

interface Props {
  code: string
}

export default function Mermaid({ code }: Props): JSX.Element {
  const theme = useContext(ThemeContext)
  const diffMap = useContext(MermaidDiffContext)
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
        // 差分モード: 変更後の図は緑（追加/変更）、変更前の図は赤（削除）で強調。
        const blockDiff = diffMap?.get(code.trim())
        if (blockDiff) {
          highlightEntities(container, blockDiff.changedEntities, 'mv-entity-changed')
          highlightAttrs(container, blockDiff.changedAttrs, 'mv-attr-changed')
          highlightEntities(container, blockDiff.removedEntities, 'mv-entity-removed')
          highlightAttrs(container, blockDiff.removedAttrs, 'mv-attr-removed')
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
      })

    return () => {
      cancelled = true
      detach?.()
    }
  }, [code, theme, diffMap])

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
