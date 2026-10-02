import { sql } from 'drizzle-orm'
import { check, index, integer, pgTable, serial, text, uniqueIndex, varchar } from 'drizzle-orm/pg-core'
import { createdAtColumn, updatedAtColumn } from './shared.js'

export type MediaStatus = 'referenced' | 'ready' | 'missing'

export const media = pgTable(
  'media',
  {
    id: serial('id').primaryKey(),
    sourceSystem: varchar('source_system', { length: 32 }).notNull().default('wix'),
    sourceRef: text('source_ref').notNull().default(''),
    url: text('url'),
    fileName: varchar('file_name', { length: 255 }),
    mimeType: varchar('mime_type', { length: 100 }),
    width: integer('width'),
    height: integer('height'),
    altText: text('alt_text').notNull().default(''),
    status: varchar('status', { length: 20 }).notNull().default('referenced'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex('media_source_unique')
      .on(t.sourceSystem, t.sourceRef)
      .where(sql`${t.sourceRef} <> ''`),
    index('media_status_idx').on(t.status),
    check('media_status_valid', sql`${t.status} in ('referenced', 'ready', 'missing')`),
  ],
)

export type Media = typeof media.$inferSelect
export type NewMedia = typeof media.$inferInsert
