import { diffLines } from 'diff'
import { extractMermaidBlocks, computeBlockDiff, blockHasDeletions } from './mermaidDiff'

// 変更前後のテキストから、レンダリング用に変更ハイライトを織り込んだ
// 単一の Markdown 文字列を組み立てる。
//
// 方針:
// - 行単位の差分を取り、追加行は <ins>、削除行は <del> で囲む（ブロック記法は維持）。
// - コードフェンス内は HTML が描画されないため素のまま出す（削除行は省略）。
// - mermaid フェンスは「変更後の図」を描画する。削除があった場合は「変更前(HEAD)の図」を
//   上に併記し、削除を赤で示す（差分は図上の色で表現するためソース差分は出さない）。

const LEADING = /^(\s*(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s+)?)([\s\S]*)$/
const FENCE = /^\s*(```|~~~)/
const MERMAID_FENCE = /^\s*(```|~~~)\s*mermaid\b/i

function wrapLine(line: string, kind: 'ins' | 'del'): string {
  const m = LEADING.exec(line)
  const lead = m ? m[1] : ''
  const content = m ? m[2] : line
  if (content.trim() === '') return lead
  return `${lead}<${kind} class="diff-${kind}">${content}</${kind}>`
}

function splitLines(value: string): string[] {
  const lines = value.split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

export function buildDiffMarkdown(oldText: string, newText: string): string {
  const changes = diffLines(oldText, newText)
  const oldMermaid = extractMermaidBlocks(oldText)
  const newMermaid = extractMermaidBlocks(newText)
  const out: string[] = []

  let inFence = false
  let fenceIsMermaid = false
  let mermaidIndex = -1
  let curOld = ''
  let curNew = ''

  for (const part of changes) {
    for (const line of splitLines(part.value)) {
      const isFence = FENCE.test(line)

      if (part.removed) {
        if (!inFence) out.push(wrapLine(line, 'del'))
        continue
      }

      // 追加行 or 変更なし行（どちらも新ドキュメントを構成する）。
      if (inFence) {
        out.push(line)
        if (isFence) {
          inFence = false
          fenceIsMermaid = false
        }
        continue
      }

      if (isFence) {
        inFence = true
        if (MERMAID_FENCE.test(line)) {
          fenceIsMermaid = true
          mermaidIndex++
          curOld = oldMermaid[mermaidIndex] ?? ''
          curNew = newMermaid[mermaidIndex] ?? ''
          // 削除があれば「変更前(HEAD)の図」を先に出す（削除を赤で示す）。
          if (blockHasDeletions(computeBlockDiff(curOld, curNew))) {
            out.push('', '_変更前 (HEAD):_', '```mermaid', ...splitLines(curOld), '```', '', '_変更後:_')
          }
        }
        out.push(line) // 変更後の mermaid フェンス開始（または通常のコードフェンス）
        continue
      }

      out.push(part.added ? wrapLine(line, 'ins') : line)
    }
  }

  return out.join('\n')
}
