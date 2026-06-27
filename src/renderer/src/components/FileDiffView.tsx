import { useEffect, useMemo, useState } from 'react'
import type { FileDiffResult } from '@shared/ipc'
import MarkdownView from './MarkdownView'
import { buildDiffMarkdown } from '../lib/diffMarkdown'

interface Props {
  filePath: string
  // 親が更新ボタンを押すたびに増えるキー。再取得のトリガ。
  refreshKey: number
}

// 開いている単一ファイルの git 差分を、レンダリングに変更ハイライト付きで表示する。
export default function FileDiffView({ filePath, refreshKey }: Props): JSX.Element {
  const [diff, setDiff] = useState<FileDiffResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setDiff(null)
    setError(null)
    window.api
      .getFileDiff(filePath)
      .then((d) => {
        if (!cancelled) setDiff(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [filePath, refreshKey])

  const diffMarkdown = useMemo(
    () => (diff && diff.status !== 'unchanged' ? buildDiffMarkdown(diff.oldText, diff.newText) : ''),
    [diff]
  )

  if (error) {
    return <div className="content-pane error">差分の取得に失敗しました: {error}</div>
  }
  if (!diff) {
    return <div className="content-pane">読み込み中...</div>
  }
  if (!diff.isRepo) {
    return (
      <div className="content-pane">
        <div className="diff-note">このファイルは git リポジトリ内にありません。</div>
        <MarkdownView content={diff.newText} />
      </div>
    )
  }
  if (diff.status === 'unchanged') {
    return (
      <div className="content-pane">
        <div className="diff-note">HEAD からの変更はありません。</div>
        <MarkdownView content={diff.newText} />
      </div>
    )
  }

  return (
    <div className="content-pane">
      <div className="diff-note">
        {diff.status === 'added' ? '新規ファイル（全体が追加）' : 'HEAD との差分'}
        <span className="diff-legend">
          <ins className="diff-ins">追加</ins> / <del className="diff-del">削除</del>
        </span>
      </div>
      <MarkdownView content={diffMarkdown} allowRaw />
    </div>
  )
}
