import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  varchar,
} from 'drizzle-orm/pg-core'
import { createdAtColumn, updatedAtColumn } from './shared.js'

export const excellenceDomains = pgTable(
  'excellence_domains',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description').notNull().default(''),
    color: varchar('color', { length: 16 }).notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [index('excellence_domains_sort_idx').on(t.sortOrder)],
)

export const excellence = pgTable(
  'excellence',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }).notNull().default(''),
    description: text('description').notNull().default(''),
    year: integer('year').notNull(),
    domainId: integer('domain_id').references(() => excellenceDomains.id, {
      onDelete: 'restrict',
    }),
    sortOrder: integer('sort_order').notNull().default(0),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('excellence_domain_idx').on(t.domainId),
    index('excellence_year_idx').on(t.year),
    check('excellence_year_range', sql`${t.year} between 1900 and 2100`),
  ],
)

export type ExcellenceDomain = typeof excellenceDomains.$inferSelect
export type NewExcellenceDomain = typeof excellenceDomains.$inferInsert
export type ExcellenceItem = typeof excellence.$inferSelect
export type NewExcellenceItem = typeof excellence.$inferInsert
