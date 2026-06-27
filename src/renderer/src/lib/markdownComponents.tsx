import type { Components } from 'react-markdown'
import Mermaid from '../components/Mermaid'

// react-markdown の code レンダラを上書きし、
// ```mermaid を <Mermaid> に振り分け、それ以外は rehype-highlight に任せる。
export const markdownComponents: Components = {
  code(props) {
    const { className, children, ...rest } = props
    const match = /language-(\w+)/.exec(className || '')
    const lang = match?.[1]

    if (lang === 'mermaid') {
      const code = String(children).replace(/\n$/, '')
      return <Mermaid code={code} />
    }

    return (
      <code className={className} {...rest}>
        {children}
      </code>
    )
  }
}
