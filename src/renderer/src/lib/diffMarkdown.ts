import { diffLines } from 'diff'

// 変更前後のテキストから、レンダリング用に変更ハイライトを織り込んだ
// 単一の Markdown 文字列を組み立てる。
//
// 方針:
// - 行単位の差分を取る。
// - 追加行は内容を <ins class="diff-ins"> で、削除行は <del class="diff-del"> で囲む。
// - 見出し/リスト等のブロック記法（先頭の "# " "- " 等）は囲みの外に残し、
//   ブロック構造を保ったまま中身だけをハイライトする。
// - コードフェンス内は HTML が描画されないため、ハイライトは付けず素のまま出す
//   （削除されたコード行はブロックを壊さないよう省略する）。

// 先頭のブロック記法（見出し/箇条書き/番号/引用）と本文を分離する。
const LEADING = /^(\s*(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s+)?)([\s\S]*)$/
const FENCE = /^\s*(```|~~~)/

function wrapLine(line: string, kind: 'ins' | 'del'): string {
  const m = LEADING.exec(line)
  const lead = m ? m[1] : ''
  const content = m ? m[2] : line
  // 空行はハイライトせずそのまま（ブロック区切りを保つ）。
  if (content.trim() === '') return lead
  return `${lead}<${kind} class="diff-${kind}">${content}</${kind}>`
}

function splitLines(value: string): string[] {
  const lines = value.split('\n')
  // 末尾の \n による空要素を取り除く。
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

export function buildDiffMarkdown(oldText: string, newText: string): string {
  const changes = diffLines(oldText, newText)
  const out: string[] = []
  let inFence = false

  for (const part of changes) {
    for (const line of splitLines(part.value)) {
      const isFence = FENCE.test(line)

      if (part.removed) {
        // コードフェンス内の削除行はブロックを壊すため省略する。
        if (!inFence) out.push(wrapLine(line, 'del'))
        continue
      }

      // 追加行 or 変更なし行（どちらも新ドキュメントのフェンス状態に寄与する）。
      if (inFence) {
        out.push(line)
        if (isFence) inFence = false
        continue
      }
      if (isFence) {
        out.push(line)
        inFence = true
        continue
      }
      out.push(part.added ? wrapLine(line, 'ins') : line)
    }
  }

  return out.join('\n')
}
