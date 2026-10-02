import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import { media } from './media.js'
import { type ContentBlock, type RichDoc, createdAtColumn, updatedAtColumn } from './shared.js'

export const pages = pgTable(
  'pages',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    title: varchar('title', { length: 255 }).notNull(),
    section: varchar('section', { length: 50 }).notNull().default('general'),
    blocks: jsonb('blocks').$type<ContentBlock[]>().notNull().default([]),
    published: boolean('published').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    check(
      'pages_section_valid',
      sql`${t.section} in ('general', 'about', 'contact', 'academics', 'excellence', 'faculty')`,
    ),
    index('pages_section_idx').on(t.section),
  ],
)

export type PageBlockType = 'heading' | 'paragraph' | 'list' | 'image' | 'gallery'

export interface HeadingBlockContent {
  text: string
  level: number
}
export interface ParagraphBlockContent {
  text: string
  rich?: RichDoc
}
export interface ListBlockContent {
  ordered: boolean
  items: string[]
}
export interface ImageBlockContent {
  alt?: string
  caption?: string
}
export interface GalleryBlockContent {
  caption?: string
}

export type PageBlockContent =
  | HeadingBlockContent
  | ParagraphBlockContent
  | ListBlockContent
  | ImageBlockContent
  | GalleryBlockContent

export type PageBlockRow =
  | { type: 'heading'; content: HeadingBlockContent }
  | { type: 'paragraph'; content: ParagraphBlockContent }
  | { type: 'list'; content: ListBlockContent }
  | { type: 'image'; content: ImageBlockContent }
  | { type: 'gallery'; content: GalleryBlockContent }

export const pageBlocks = pgTable(
  'page_blocks',
  {
    id: serial('id').primaryKey(),
    pageId: integer('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(),
    position: integer('position').notNull().default(0),
    content: jsonb('content').$type<PageBlockContent>().notNull().default({}),
    mediaId: integer('media_id').references(() => media.id, { onDelete: 'restrict' }),
    published: boolean('published').notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('page_blocks_page_position_idx').on(t.pageId, t.position),
    check(
      'page_blocks_type_valid',
      sql`${t.type} in ('heading', 'paragraph', 'list', 'image', 'gallery')`,
    ),
    check('page_blocks_image_requires_media', sql`${t.type} <> 'image' or ${t.mediaId} is not null`),
  ],
)

export const pageBlockGalleryItems = pgTable(
  'page_block_gallery_items',
  {
    id: serial('id').primaryKey(),
    blockId: integer('block_id')
      .notNull()
      .references(() => pageBlocks.id, { onDelete: 'cascade' }),
    mediaId: integer('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'restrict' }),
    position: integer('position').notNull().default(0),
    caption: text('caption').notNull().default(''),
    createdAt: createdAtColumn(),
  },
  (t) => [index('page_block_gallery_items_block_position_idx').on(t.blockId, t.position)],
)

export type Page = typeof pages.$inferSelect
export type NewPage = typeof pages.$inferInsert
export type PageBlock = typeof pageBlocks.$inferSelect
export type NewPageBlock = typeof pageBlocks.$inferInsert
export type PageBlockGalleryItem = typeof pageBlockGalleryItems.$inferSelect
export type NewPageBlockGalleryItem = typeof pageBlockGalleryItems.$inferInsert
