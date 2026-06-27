// ★最重要モジュール
// Mermaid ER 図のエンティティ名（テーブル名）をダブルクリックしたとき、
// そのテキストを選択状態にして、ユーザーが手動で Cmd+C コピーできるようにする。
//
// SVG <text> のネイティブなドラッグ選択は不安定なため、dblclick を捕まえて
// Range/Selection API でプログラム的に選択範囲を構築する。

// エンティティ名（タイトル）テキストを特定するためのセレクタ。
// 上から順に試し、最初にマッチしたものを採用する（mermaid バージョン差の保険）。
const ENTITY_TITLE_SELECTORS = [
  'text.entityLabel', // mermaid v10 classic: エンティティ名（※属性セルも同クラス）
  '[id^="text-entity-"]', // id プレフィックスのフォールバック
  'g.entity text.label' // v11 新描画器の保険
]

// mermaid v10.9 では属性セルも text.entityLabel を持つが、
// 属性セルの id には "-attr-" が含まれる（例: text-entity-CUSTOMER-<uuid>-attr-1-name）。
// テーブル名（タイトル）の id は "text-entity-<name>-<uuid>" で "-attr-" を含まない。
const ATTR_ID_MARKER = '-attr-'

const HIGHLIGHT_CLASS = 'mv-entity-selected'

// 要件は「テーブル名」の選択。属性セル（カラム名/型/キー）は除外する。
function isEntityTitle(el: Element): boolean {
  const matchesSelector = ENTITY_TITLE_SELECTORS.some((sel) => {
    try {
      return el.matches(sel)
    } catch {
      return false
    }
  })
  if (!matchesSelector) return false
  // 属性セルを除外する。
  return !(el.id || '').includes(ATTR_ID_MARKER)
}

// クリックされたノードから祖先方向へ辿り、エンティティ名テキスト要素を探す。
// SVG 生ノードでは closest() が不安定なため手動で親を辿る。
function findEntityTitle(start: Element | null, boundary: Element): Element | null {
  let el: Element | null = start
  while (el && el !== boundary) {
    if (isEntityTitle(el)) return el
    el = el.parentElement
  }
  return null
}

// テキストノードを実際に保持している最深要素を返す。
// htmlLabels / tspan / foreignObject でラップされた場合に正しい範囲を選べるようにする。
function findInnermostTextHost(el: Element): Node {
  // foreignObject 内の HTML（div/span）パターン
  const htmlText = el.querySelector?.('div, span, p')
  if (htmlText && htmlText.firstChild?.nodeType === Node.TEXT_NODE) {
    return htmlText
  }
  // SVG tspan パターン
  const tspan = el.querySelector?.('tspan')
  if (tspan) return tspan
  return el
}

function clearHighlight(container: Element): void {
  container.querySelectorAll('.' + HIGHLIGHT_CLASS).forEach((n) => n.classList.remove(HIGHLIGHT_CLASS))
}

// エンティティ名に対応する箱（rect）へハイライト用クラスを付け、視覚フィードバックを与える。
function highlightEntityBox(titleEl: Element): void {
  const group = titleEl.closest('g[id^="entity-"]') ?? titleEl.parentElement
  const box =
    group?.querySelector?.('rect.entityBox') ??
    group?.querySelector?.('rect') ??
    (titleEl.previousElementSibling?.tagName.toLowerCase() === 'rect'
      ? titleEl.previousElementSibling
      : null)
  box?.classList.add(HIGHLIGHT_CLASS)
}

// 指定したエンティティ名テキストを選択状態にする。
export function selectTextElement(titleEl: Element): string {
  const target = findInnermostTextHost(titleEl)
  const sel = window.getSelection()
  if (!sel) return titleEl.textContent?.trim() ?? ''

  const range = document.createRange()
  range.selectNodeContents(target)
  sel.removeAllRanges()
  sel.addRange(range)

  return titleEl.textContent?.trim() ?? ''
}

export interface SelectionOptions {
  // 選択と同時にクリップボードへ書き込むか（既定 false = 選択のみ・手動コピー）。
  copyOnSelect?: boolean
  // 選択時のコールバック（トースト表示など）。
  onSelect?: (text: string) => void
}

// container 配下の Mermaid SVG にダブルクリック選択を装着する。
// 戻り値は後始末用のクリーンアップ関数。
export function attachEntitySelection(
  container: HTMLElement,
  options: SelectionOptions = {}
): () => void {
  const onDblClick = (event: MouseEvent): void => {
    const titleEl = findEntityTitle(event.target as Element | null, container)
    if (!titleEl) return

    // ブラウザ既定の部分選択が、こちらの選択を上書きするのを防ぐ。
    event.preventDefault()

    clearHighlight(container)
    const text = selectTextElement(titleEl)
    highlightEntityBox(titleEl)

    if (options.copyOnSelect && text) {
      // dblclick はユーザー操作なのでクリップボード書き込みが許可される。
      navigator.clipboard?.writeText(text).catch(() => {})
    }
    options.onSelect?.(text)
  }

  // 他所をクリックしたらハイライトを消す。
  const onClick = (event: MouseEvent): void => {
    if (!findEntityTitle(event.target as Element | null, container)) {
      clearHighlight(container)
    }
  }

  container.addEventListener('dblclick', onDblClick)
  container.addEventListener('click', onClick)

  return () => {
    container.removeEventListener('dblclick', onDblClick)
    container.removeEventListener('click', onClick)
  }
}
