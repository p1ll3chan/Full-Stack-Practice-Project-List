import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export interface ContentBlock {
  id: string
  type: 'heading' | 'paragraph' | 'image' | 'list'
  content: string
}

export const pages = pgTable('pages', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  blocks: jsonb('blocks').$type<ContentBlock[]>().notNull().default([]),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  credits: integer('credits').notNull().default(3),
  department: varchar('department', { length: 255 }).notNull().default(''),
})

export const faculty = pgTable('faculty', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull().default(''),
  department: varchar('department', { length: 255 }).notNull().default(''),
  email: varchar('email', { length: 255 }).notNull().default(''),
  bio: text('bio').notNull().default(''),
})

export const excellence = pgTable('excellence', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull().default(''),
  description: text('description').notNull().default(''),
  year: integer('year').notNull(),
})

export type Page = typeof pages.$inferSelect
export type NewPage = typeof pages.$inferInsert
export type Course = typeof courses.$inferSelect
export type NewCourse = typeof courses.$inferInsert
export type FacultyMember = typeof faculty.$inferSelect
export type NewFacultyMember = typeof faculty.$inferInsert
export type ExcellenceItem = typeof excellence.$inferSelect
export type NewExcellenceItem = typeof excellence.$inferInsert
