import { promises as fs } from 'fs'
import { join, basename } from 'path'
import type { TreeNode } from '@shared/ipc'

const IGNORED_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'out', '.cache'])
const MD_EXT = /\.(md|markdown)$/i

// ディレクトリを再帰的に走査し、フォルダと .md/.markdown のみを残したツリーを返す。
// 中身に Markdown を一切含まない空フォルダは除外する。
export async function buildTree(root: string): Promise<TreeNode> {
  const node: TreeNode = {
    name: basename(root) || root,
    path: root,
    type: 'dir',
    children: await walk(root)
  }
  return node
}

async function walk(dir: string): Promise<TreeNode[]> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const dirs: TreeNode[] = []
  const files: TreeNode[] = []

  for (const entry of entries) {
    const name = entry.name
    const fullPath = join(dir, name)

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(name) || name.startsWith('.')) continue
      const children = await walk(fullPath)
      if (children.length > 0) {
        dirs.push({ name, path: fullPath, type: 'dir', children })
      }
    } else if (entry.isFile()) {
      if (name.startsWith('.')) continue
      if (MD_EXT.test(name)) {
        files.push({ name, path: fullPath, type: 'file' })
      }
    }
  }

  const byName = (a: TreeNode, b: TreeNode): number => a.name.localeCompare(b.name)
  dirs.sort(byName)
  files.sort(byName)
  // フォルダを先、ファイルを後に並べる。
  return [...dirs, ...files]
}
