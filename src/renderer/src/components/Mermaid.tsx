import { useContext, useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { attachEntitySelection } from '../lib/mermaidSelection'
import { ThemeContext } from '../lib/theme'
import { MermaidDiffContext } from '../lib/mermaidDiff'

// 描画 ID 用の単調増加カウンタ（Math.random は使わない方針）。
let renderSeq = 0

const MIN_SCALE = 0.3
const MAX_SCALE = 8

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

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
  const zoomRef = useRef<HTMLDivElement>(null)
  // 図の基準サイズ（viewBox）と現在の拡大率。ズームは DOM 直接操作で行う。
  const baseRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  const scaleRef = useRef(1)
  const [error, setError] = useState<string | null>(null)

  // 拡大率に応じてズーム用 div の幅を更新する（svg は width:100% で追従）。
  function applyScale(): void {
    const zoom = zoomRef.current
    const { w } = baseRef.current
    if (!zoom || !w) return
    zoom.style.width = `${w * scaleRef.current}px`
  }

  useEffect(() => {
    // テーマ変更時にも再初期化して図の配色を合わせる（dark/default を切替）。
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: theme === 'dark' ? 'dark' : 'default',
      er: { useMaxWidth: true }
    })
    const zoom = zoomRef.current
    if (!zoom) return

    let cancelled = false
    let detach: (() => void) | null = null
    const id = `mermaid-${++renderSeq}`

    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (cancelled || !zoom) return
        zoom.innerHTML = svg
        setError(null)

        // 基準サイズを viewBox から取得し、拡大率を初期化する。
        const svgEl = zoom.querySelector('svg')
        const vb = svgEl?.viewBox?.baseVal
        baseRef.current = { w: vb?.width || svgEl?.clientWidth || 800, h: vb?.height || 600 }
        scaleRef.current = 1
        applyScale()

        // 描画後に ER 図のテーブル名ダブルクリック選択を装着する。
        detach = attachEntitySelection(zoom)
        // 差分モード: 変更後の図は緑（追加/変更）、変更前の図は赤（削除）で強調。
        const blockDiff = diffMap?.get(code.trim())
        if (blockDiff) {
          highlightEntities(zoom, blockDiff.changedEntities, 'mv-entity-changed')
          highlightAttrs(zoom, blockDiff.changedAttrs, 'mv-attr-changed')
          highlightEntities(zoom, blockDiff.removedEntities, 'mv-entity-removed')
          highlightAttrs(zoom, blockDiff.removedAttrs, 'mv-attr-removed')
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

  // トラックパッドのピンチ（ctrl+wheel）で拡大縮小。カーソル位置を基準に保つ。
  useEffect(() => {
    const container = containerRef.current
    const zoom = zoomRef.current
    if (!container || !zoom) return

    const onWheel = (e: WheelEvent): void => {
      if (!e.ctrlKey) return // 通常スクロールはそのまま
      e.preventDefault()
      const rect = container.getBoundingClientRect()
      const offX = e.clientX - rect.left
      const offY = e.clientY - rect.top
      const oldW = zoom.offsetWidth || 1
      const oldH = zoom.offsetHeight || 1
      const rx = (container.scrollLeft + offX) / oldW
      const ry = (container.scrollTop + offY) / oldH

      const next = clamp(scaleRef.current * Math.exp(-e.deltaY * 0.01), MIN_SCALE, MAX_SCALE)
      if (next === scaleRef.current) return
      scaleRef.current = next
      applyScale()

      // カーソル下の点が動かないようスクロール位置を補正。
      container.scrollLeft = rx * zoom.offsetWidth - offX
      container.scrollTop = ry * zoom.offsetHeight - offY
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [])

  if (error) {
    return (
      <pre className="mermaid-error">
        Mermaid 描画エラー:{'\n'}
        {error}
      </pre>
    )
  }

  return (
    <div className="mermaid-container" ref={containerRef}>
      <div className="mermaid-zoom" ref={zoomRef} />
    </div>
  )
}
