import type { RichDoc, RichNode, RichTextAlign, RichTextRun } from '../db/schema.js'

export interface RichTextIssue {
  kind: 'invalid-document' | 'unsupported-node' | 'unsupported-decoration'
  message: string
}

export interface RichTextResult {
  doc: RichDoc
  issues: RichTextIssue[]
}

const ALIGNMENTS: Record<string, RichTextAlign> = {
  AUTO: 'auto',
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
  JUSTIFY: 'justify',
}

interface WixDecoration {
  type?: unknown
  colorData?: unknown
  linkData?: unknown
}

interface WixNode {
  type?: unknown
  nodes?: unknown
  textData?: unknown
  paragraphData?: unknown
  headingData?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readAlignment(value: unknown): RichTextAlign {
  if (!isRecord(value)) return 'auto'
  const style = isRecord(value.textStyle) ? value.textStyle : undefined
  const alignment = style?.textAlignment
  if (typeof alignment === 'string' && alignment in ALIGNMENTS) {
    return ALIGNMENTS[alignment]
  }
  return 'auto'
}

function readTarget(target: unknown): string | undefined {
  if (typeof target !== 'string' || target === '') return undefined
  const upper = target.toUpperCase()
  if (upper === 'BLANK') return '_blank'
  if (upper === 'SELF') return '_self'
  return target
}

function applyDecoration(
  run: RichTextRun,
  decoration: WixDecoration,
  issues: RichTextIssue[],
): void {
  if (typeof decoration.type !== 'string') return
  switch (decoration.type) {
    case 'BOLD':
      run.bold = true
      return
    case 'UNDERLINE':
      run.underline = true
      return
    case 'COLOR': {
      const color = decoration.colorData
      if (isRecord(color)) {
        if (typeof color.foreground === 'string') run.foreground = color.foreground
        if (typeof color.background === 'string') run.background = color.background
      }
      return
    }
    case 'LINK': {
      const linkData = decoration.linkData
      const link = isRecord(linkData) && isRecord(linkData.link) ? linkData.link : undefined
      if (link && typeof link.url === 'string' && link.url !== '') {
        run.href = link.url
        const target = readTarget(link.target)
        if (target) run.target = target
      }
      return
    }
    default:
      issues.push({
        kind: 'unsupported-decoration',
        message: `decoration type "${decoration.type}" was dropped`,
      })
  }
}

function collectRuns(nodes: unknown, issues: RichTextIssue[]): RichTextRun[] {
  const runs: RichTextRun[] = []
  if (!Array.isArray(nodes)) return runs
  for (const child of nodes) {
    if (!isRecord(child)) continue
    if (child.type === 'TEXT') {
      const textData = isRecord(child.textData) ? child.textData : {}
      const text = typeof textData.text === 'string' ? textData.text : ''
      const run: RichTextRun = { text }
      const decorations = Array.isArray(textData.decorations) ? textData.decorations : []
      for (const decoration of decorations) {
        if (isRecord(decoration)) applyDecoration(run, decoration as WixDecoration, issues)
      }
      runs.push(run)
      continue
    }
    if (Array.isArray(child.nodes)) runs.push(...collectRuns(child.nodes, issues))
  }
  return runs
}

function convertNode(node: WixNode, issues: RichTextIssue[]): RichNode | undefined {
  switch (node.type) {
    case 'PARAGRAPH':
      return {
        type: 'paragraph',
        align: readAlignment(node.paragraphData),
        runs: collectRuns(node.nodes, issues),
      }
    case 'HEADING': {
      const headingData = isRecord(node.headingData) ? node.headingData : {}
      const rawLevel = headingData.level
      const level =
        typeof rawLevel === 'number' && Number.isInteger(rawLevel)
          ? Math.min(Math.max(rawLevel, 1), 6)
          : 4
      return {
        type: 'heading',
        level,
        align: readAlignment(headingData),
        runs: collectRuns(node.nodes, issues),
      }
    }
    case 'BULLETED_LIST': {
      const items: RichTextRun[][] = []
      const children = Array.isArray(node.nodes) ? node.nodes : []
      for (const child of children) {
        if (!isRecord(child) || child.type !== 'LIST_ITEM') {
          issues.push({ kind: 'unsupported-node', message: 'non LIST_ITEM child of BULLETED_LIST dropped' })
          continue
        }
        items.push(collectRuns(child.nodes, issues))
      }
      return { type: 'list', ordered: false, items }
    }
    case 'TEXT':
      return { type: 'paragraph', align: 'auto', runs: collectRuns([node], issues) }
    default:
      issues.push({
        kind: 'unsupported-node',
        message: `node type "${String(node.type)}" was dropped`,
      })
      return undefined
  }
}

export function parseWixRichText(value: unknown): RichTextResult {
  const issues: RichTextIssue[] = []
  if (value === null || value === undefined || value === '') {
    return { doc: { nodes: [] }, issues }
  }

  let documentValue: unknown = value
  if (typeof value === 'string') {
    try {
      documentValue = JSON.parse(value)
    } catch {
      issues.push({ kind: 'invalid-document', message: 'value is not valid JSON' })
      return { doc: { nodes: [] }, issues }
    }
  }

  if (!isRecord(documentValue) || !Array.isArray(documentValue.nodes)) {
    issues.push({ kind: 'invalid-document', message: 'document has no nodes array' })
    return { doc: { nodes: [] }, issues }
  }

  const nodes: RichNode[] = []
  for (const node of documentValue.nodes) {
    if (!isRecord(node)) {
      issues.push({ kind: 'unsupported-node', message: 'non-object node dropped' })
      continue
    }
    const converted = convertNode(node as WixNode, issues)
    if (converted) nodes.push(converted)
  }
  return { doc: { nodes }, issues }
}

export function richTextToPlain(doc: RichDoc): string {
  const parts: string[] = []
  for (const node of doc.nodes) {
    if (node.type === 'list') {
      for (const item of node.items) parts.push(item.map((run) => run.text).join(''))
    } else {
      parts.push(node.runs.map((run) => run.text).join(''))
    }
  }
  return parts.join('\n').trim()
}
