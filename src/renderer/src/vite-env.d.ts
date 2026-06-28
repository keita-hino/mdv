/// <reference types="vite/client" />

// highlight.js テーマCSSを文字列として取り込むための宣言。
declare module '*.css?inline' {
  const css: string
  export default css
}
