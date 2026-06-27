import { useState } from 'react'
import type { TreeNode } from '@shared/ipc'

interface Props {
  node: TreeNode
  selectedPath: string | null
  onSelect: (node: TreeNode) => void
  depth?: number
}

export default function FileTree({ node, selectedPath, onSelect, depth = 0 }: Props): JSX.Element {
  const [open, setOpen] = useState(depth < 1)

  if (node.type === 'file') {
    const isSelected = node.path === selectedPath
    return (
      <div
        className={'tree-item file' + (isSelected ? ' selected' : '')}
        style={{ paddingLeft: depth * 14 + 8 }}
        onClick={() => onSelect(node)}
        title={node.path}
      >
        <span className="tree-icon">📄</span>
        {node.name}
      </div>
    )
  }

  return (
    <div>
      <div
        className="tree-item dir"
        style={{ paddingLeft: depth * 14 + 8 }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="tree-icon">{open ? '▾' : '▸'}</span>
        {node.name}
      </div>
      {open &&
        node.children?.map((child) => (
          <FileTree
            key={child.path}
            node={child}
            selectedPath={selectedPath}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}
