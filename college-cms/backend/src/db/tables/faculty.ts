import { index, integer, jsonb, pgTable, serial, text, varchar } from 'drizzle-orm/pg-core'
import { media } from './media.js'
import { streams } from './academics.js'
import { type RichDoc, updatedAtColumn } from './shared.js'

export const facultyMembers = pgTable(
  'faculty_members',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }).notNull().default(''),
    department: varchar('department', { length: 255 }).notNull().default(''),
    email: varchar('email', { length: 255 }).notNull().default(''),
    bio: text('bio').notNull().default(''),
    streamId: integer('stream_id').references(() => streams.id, { onDelete: 'restrict' }),
    photoMediaId: integer('photo_media_id').references(() => media.id, { onDelete: 'restrict' }),
    updatedAt: updatedAtColumn(),
  },
  (t) => [index('faculty_members_stream_idx').on(t.streamId)],
)

export const facultyDetails = pgTable(
  'faculty_details',
  {
    id: serial('id').primaryKey(),
    streamId: integer('stream_id')
      .notNull()
      .unique()
      .references(() => streams.id, { onDelete: 'cascade' }),
    intro: jsonb('intro').$type<RichDoc>().notNull().default({ nodes: [] }),
    updatedAt: updatedAtColumn(),
  },
  (t) => [index('faculty_details_stream_idx').on(t.streamId)],
)

export type FacultyMember = typeof facultyMembers.$inferSelect
export type NewFacultyMember = typeof facultyMembers.$inferInsert
export type FacultyDetail = typeof facultyDetails.$inferSelect
export type NewFacultyDetail = typeof facultyDetails.$inferInsert
