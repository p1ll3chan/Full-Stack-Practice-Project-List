import type { RichDoc, RichNode } from '../api/types'

export function richDocToText(doc: RichDoc | null | undefined): string {
  if (!doc) return ''
  const lines: string[] = []
  for (const node of doc.nodes) {
    if (node.type === 'list') {
      for (const item of node.items) lines.push(item.map((run) => run.text).join(''))
    } else {
      lines.push(node.runs.map((run) => run.text).join(''))
    }
  }
  return lines.join('\n')
}

export function textToRichDoc(text: string): RichDoc {
  const nodes: RichNode[] = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => ({ type: 'paragraph', align: 'auto', runs: [{ text: line }] }))
  return { nodes }
}

export function hasNonParagraphNodes(doc: RichDoc | null | undefined): boolean {
  return (doc?.nodes ?? []).some((node) => node.type !== 'paragraph')
}
