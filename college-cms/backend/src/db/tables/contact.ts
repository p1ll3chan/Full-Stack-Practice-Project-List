import { sql } from 'drizzle-orm'
import { check, integer, pgTable, text, varchar } from 'drizzle-orm/pg-core'
import { updatedAtColumn } from './shared.js'

export const collegeContact = pgTable(
  'college_contact',
  {
    id: integer('id').primaryKey().default(1),
    collegeName: varchar('college_name', { length: 255 }).notNull().default(''),
    tagline: varchar('tagline', { length: 255 }).notNull().default(''),
    address: text('address').notNull().default(''),
    phone: varchar('phone', { length: 50 }).notNull().default(''),
    email: varchar('email', { length: 255 }).notNull().default(''),
    officeHours: varchar('office_hours', { length: 255 }).notNull().default(''),
    mapEmbedUrl: text('map_embed_url').notNull().default(''),
    updatedAt: updatedAtColumn(),
  },
  (t) => [check('college_contact_singleton', sql`${t.id} = 1`)],
)

export type CollegeContact = typeof collegeContact.$inferSelect
export type NewCollegeContact = typeof collegeContact.$inferInsert
