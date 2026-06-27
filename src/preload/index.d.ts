import type { MarkdownViewerApi } from '@shared/ipc'

declare global {
  interface Window {
    api: MarkdownViewerApi
  }
}

export {}
