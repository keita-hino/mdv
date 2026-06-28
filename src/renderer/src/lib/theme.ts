import { createContext } from 'react'

export type Theme = 'light' | 'dark'

export const DEFAULT_THEME: Theme = 'dark'

// 既定をダークへ変更したため、旧キー(:theme)の保存値を無視するようキーを更新。
// これにより既存環境でも新しい既定が確実に効き、以後の手動切替は保持される。
export const STORAGE_KEY = 'markdown-viewer:theme:v2'

// Mermaid など描画系がテーマを参照するための Context。
export const ThemeContext = createContext<Theme>(DEFAULT_THEME)

export function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* localStorage 不可時は既定値 */
  }
  return DEFAULT_THEME
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* noop */
  }
}
