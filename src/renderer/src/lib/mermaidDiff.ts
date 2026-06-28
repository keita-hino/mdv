import { createContext } from 'react'

const FENCE = /^\s*(```|~~~)/
const MERMAID_FENCE = /^\s*(```|~~~)\s*mermaid\b/i

// テキスト中の ```mermaid ブロックの中身（フェンス除く）を出現順に取り出す。
export function extractMermaidBlocks(text: string): string[] {
  const blocks: string[] = []
  let inM = false
  let cur: string[] = []
  for (const line of text.split('\n')) {
    if (!inM) {
      if (MERMAID_FENCE.test(line)) {
        inM = true
        cur = []
      }
    } else if (FENCE.test(line)) {
      blocks.push(cur.join('\n'))
      inM = false
    } else {
      cur.push(line)
    }
  }
  if (inM) blocks.push(cur.join('\n'))
  return blocks
}

// 1つの mermaid ブロックの差分情報。
// changed*/removed* は描画対象の図に応じて使い分ける
// （変更後の図=changed を緑、変更前の図=removed を赤）。
export interface MermaidBlockDiff {
  changedEntities: string[]
  changedAttrs: Record<string, number[]>
  removedEntities: string[]
  removedAttrs: Record<string, number[]>
}

// 差分モードで、各 mermaid ソース(trim) -> 差分情報 を引くための Context。
// 通常表示では null（=ハイライトなし）。
export const MermaidDiffContext = createContext<Map<string, MermaidBlockDiff> | null>(null)

interface EntityInfo {
  attrs: string[] // エンティティ定義ブロック { ... } 内の属性行（出現順）
  rels: string[] // そのエンティティが関与するリレーション行
}

// erDiagram のソースを解析し、エンティティ名 -> 構成情報 を返す。
function parseEntities(code: string): Map<string, EntityInfo> {
  const map = new Map<string, EntityInfo>()
  const trimmed = code.trim()
  if (!/^erDiagram\b/.test(trimmed)) return map

  const ensure = (name: string): EntityInfo => {
    let e = map.get(name)
    if (!e) {
      e = { attrs: [], rels: [] }
      map.set(name, e)
    }
    return e
  }

  let current: string | null = null
  let depth = 0
  for (const raw of trimmed.split('\n')) {
    const line = raw.trim()
    if (!line || line === 'erDiagram') continue

    if (depth > 0) {
      if (line.includes('}')) {
        depth--
        current = null
      } else if (current) {
        ensure(current).attrs.push(line.replace(/\s+/g, ' '))
      }
      continue
    }

    const blockM = line.match(/^(\w+)\s*\{(.*)$/)
    if (blockM) {
      current = blockM[1]
      ensure(current)
      if (!blockM[2].includes('}')) depth++
      continue
    }

    const relM = line.match(/^(\w+)\s+\S*--\S*\s+(\w+)/)
    if (relM) {
      const norm = line.replace(/\s+/g, ' ')
      ensure(relM[1]).rels.push(norm)
      ensure(relM[2]).rels.push(norm)
    }
  }
  return map
}

function signature(info: EntityInfo): string {
  return JSON.stringify({ attrs: [...info.attrs].sort(), rels: [...info.rels].sort() })
}

// b の属性のうち a に無いものの描画インデックス(1始まり)。
function attrIndicesNotIn(a: string[], b: string[]): number[] {
  const set = new Set(a)
  const idx: number[] = []
  b.forEach((x, i) => {
    if (!set.has(x)) idx.push(i + 1)
  })
  return idx
}

// 旧/新ソースから、追加変更（new側=緑）と削除（old側=赤）の対象を算出する。
export function computeBlockDiff(oldCode: string, newCode: string): MermaidBlockDiff {
  const oldMap = parseEntities(oldCode)
  const newMap = parseEntities(newCode)
  const changedEntities: string[] = []
  const removedEntities: string[] = []
  const changedAttrs: Record<string, number[]> = {}
  const removedAttrs: Record<string, number[]> = {}

  // 追加・変更（変更後の図で緑にする）。
  for (const [name, info] of newMap) {
    const old = oldMap.get(name)
    if (!old || signature(old) !== signature(info)) changedEntities.push(name)
    if (!old) {
      if (info.attrs.length > 0) changedAttrs[name] = info.attrs.map((_, k) => k + 1)
    } else {
      const ci = attrIndicesNotIn(old.attrs, info.attrs)
      if (ci.length > 0) changedAttrs[name] = ci
    }
  }

  // 削除（変更前の図で赤にする。インデックスは old 側の描画順）。
  for (const [name, info] of oldMap) {
    const nw = newMap.get(name)
    if (!nw) {
      removedEntities.push(name)
      if (info.attrs.length > 0) removedAttrs[name] = info.attrs.map((_, k) => k + 1)
    } else {
      const ri = attrIndicesNotIn(nw.attrs, info.attrs)
      if (ri.length > 0) removedAttrs[name] = ri
    }
  }

  return { changedEntities, changedAttrs, removedEntities, removedAttrs }
}

export function blockHasDeletions(bd: MermaidBlockDiff): boolean {
  return bd.removedEntities.length > 0 || Object.keys(bd.removedAttrs).length > 0
}

// 変更前後テキストから、mermaid ソース(trim) -> 差分情報 のマップを作る。
// 変更後ブロックには緑(changed)、変更前ブロックには赤(removed) を割り当てる。
export function buildMermaidDiffMap(
  oldText: string,
  newText: string
): Map<string, MermaidBlockDiff> {
  const oldBlocks = extractMermaidBlocks(oldText)
  const newBlocks = extractMermaidBlocks(newText)
  const map = new Map<string, MermaidBlockDiff>()

  newBlocks.forEach((nb, i) => {
    const ob = oldBlocks[i] ?? ''
    const bd = computeBlockDiff(ob, nb)

    if (bd.changedEntities.length > 0 || Object.keys(bd.changedAttrs).length > 0) {
      map.set(nb.trim(), {
        changedEntities: bd.changedEntities,
        changedAttrs: bd.changedAttrs,
        removedEntities: [],
        removedAttrs: {}
      })
    }
    // 削除がある時のみ変更前の図を描画するので、その時だけ old キーを登録。
    if (blockHasDeletions(bd)) {
      map.set(ob.trim(), {
        changedEntities: [],
        changedAttrs: {},
        removedEntities: bd.removedEntities,
        removedAttrs: bd.removedAttrs
      })
    }
  })

  return map
}
