import { sql } from 'drizzle-orm'
import { timestamp } from 'drizzle-orm/pg-core'

export interface ContentBlock {
  id: string
  type: 'heading' | 'paragraph' | 'image' | 'list'
  content: string
}

export type RichTextAlign = 'auto' | 'left' | 'center' | 'right' | 'justify'

export interface RichTextRun {
  text: string
  bold?: boolean
  underline?: boolean
  foreground?: string
  background?: string
  href?: string
  target?: string
}

export interface RichParagraph {
  type: 'paragraph'
  align: RichTextAlign
  runs: RichTextRun[]
}

export interface RichHeading {
  type: 'heading'
  level: number
  align: RichTextAlign
  runs: RichTextRun[]
}

export interface RichList {
  type: 'list'
  ordered: boolean
  items: RichTextRun[][]
}

export type RichNode = RichParagraph | RichHeading | RichList

export interface RichDoc {
  nodes: RichNode[]
}

export function emptyRichDoc(): RichDoc {
  return { nodes: [] }
}

export type RichDocSource = Record<string, unknown>

export function createdAtColumn() {
  return timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}

export function updatedAtColumn() {
  return timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
}

export const pageSections = [
  'general',
  'about',
  'contact',
  'academics',
  'excellence',
  'faculty',
] as const

export type PageSection = (typeof pageSections)[number]

export const pageSectionList = sql.join(
  pageSections.map((s) => sql`${s}`),
  sql`, `,
)
