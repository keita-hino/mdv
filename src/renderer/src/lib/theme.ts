import { createContext } from 'react'

export type Theme = 'light' | 'dark'

export const STORAGE_KEY = 'markdown-viewer:theme'

// Mermaid など描画系がテーマを参照するための Context。
export const ThemeContext = createContext<Theme>('light')

export function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* localStorage 不可時は既定値 */
  }
  return 'light'
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* noop */
  }
}
