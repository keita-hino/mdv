import ReactMarkdown from 'react-markdown'
import type { PluggableList } from 'unified'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { markdownComponents } from '../lib/markdownComponents'

interface Props {
  content: string
  // 差分表示の <ins>/<del> を描画するため、生 HTML を有効にする。
  allowRaw?: boolean
}

const HIGHLIGHT: PluggableList[number] = [rehypeHighlight, { detect: true, ignoreMissing: true }]

// Markdown レンダリングの共通パイプライン。差分表示もこれを再利用する。
export default function MarkdownView({ content, allowRaw = false }: Props): JSX.Element {
  // allowRaw 時は rehype-raw を先に通してから highlight をかける。
  const rehypePlugins: PluggableList = allowRaw ? [rehypeRaw, HIGHLIGHT] : [HIGHLIGHT]

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
