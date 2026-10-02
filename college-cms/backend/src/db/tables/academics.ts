import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  varchar,
} from 'drizzle-orm/pg-core'
import { media } from './media.js'
import {
  type RichDoc,
  type RichDocSource,
  createdAtColumn,
  updatedAtColumn,
} from './shared.js'

export type DegreeLevelGroup = 'undergraduate' | 'postgraduate' | 'doctoral' | 'vocational' | 'diploma'

export const degreeLevels = pgTable(
  'degree_levels',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    levelGroup: varchar('level_group', { length: 20 }).notNull().default('undergraduate'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('degree_levels_sort_idx').on(t.sortOrder),
    check(
      'degree_levels_group_valid',
      sql`${t.levelGroup} in ('undergraduate', 'postgraduate', 'doctoral', 'vocational', 'diploma')`,
    ),
  ],
)

export const streams = pgTable(
  'streams',
  {
    id: serial('id').primaryKey(),
    sourceId: varchar('source_id', { length: 36 }),
    sourcePath: varchar('source_path', { length: 512 }).notNull().default(''),
    sourceOwner: varchar('source_owner', { length: 36 }).notNull().default(''),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    tagline: varchar('tagline', { length: 255 }).notNull().default(''),
    shortDescription: varchar('short_description', { length: 500 }).notNull().default(''),
    category: varchar('category', { length: 100 }).notNull().default(''),
    iconSvg: text('icon_svg').notNull().default(''),
    imageMediaId: integer('image_media_id').references(() => media.id, { onDelete: 'restrict' }),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('streams_category_idx').on(t.category),
    index('streams_sort_idx').on(t.sortOrder),
    index('streams_active_sort_idx').on(t.isActive, t.sortOrder),
    index('streams_source_id_idx').on(t.sourceId),
  ],
)

export const degreeLevelStreams = pgTable(
  'degree_level_streams',
  {
    streamId: integer('stream_id')
      .notNull()
      .references(() => streams.id, { onDelete: 'cascade' }),
    degreeLevelId: integer('degree_level_id')
      .notNull()
      .references(() => degreeLevels.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAtColumn(),
  },
  (t) => [
    primaryKey({ name: 'degree_level_streams_pk', columns: [t.streamId, t.degreeLevelId] }),
    index('degree_level_streams_level_idx').on(t.degreeLevelId),
  ],
)

export type DegreeLevel = typeof degreeLevels.$inferSelect
export type NewDegreeLevel = typeof degreeLevels.$inferInsert
export type Stream = typeof streams.$inferSelect
export type NewStream = typeof streams.$inferInsert
export type DegreeLevelStream = typeof degreeLevelStreams.$inferSelect
export type NewDegreeLevelStream = typeof degreeLevelStreams.$inferInsert

export const courses = pgTable(
  'courses',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 20 }).unique(),
    slug: varchar('slug', { length: 255 }).unique(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull().default(''),
    credits: integer('credits').default(3),
    department: varchar('department', { length: 255 }).notNull().default(''),
    streamId: integer('stream_id').references(() => streams.id, { onDelete: 'restrict' }),
    degreeLevelId: integer('degree_level_id').references(() => degreeLevels.id, {
      onDelete: 'restrict',
    }),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('courses_stream_sort_idx').on(t.streamId, t.sortOrder),
    index('courses_degree_level_idx').on(t.degreeLevelId),
    index('courses_slug_idx').on(t.slug),
    foreignKey({
      name: 'courses_stream_level_fk',
      columns: [t.streamId, t.degreeLevelId],
      foreignColumns: [degreeLevelStreams.streamId, degreeLevelStreams.degreeLevelId],
    }).onDelete('restrict'),
  ],
)

export const academicDetails = pgTable(
  'academic_details',
  {
    id: serial('id').primaryKey(),
    streamId: integer('stream_id')
      .notNull()
      .unique()
      .references(() => streams.id, { onDelete: 'cascade' }),
    overview: jsonb('overview').$type<RichDoc>().notNull().default({ nodes: [] }),
    overviewSource: jsonb('overview_source').$type<RichDocSource>(),
    programsHtml: text('programs_html').notNull().default(''),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [index('academic_details_stream_idx').on(t.streamId)],
)

export type Course = typeof courses.$inferSelect
export type NewCourse = typeof courses.$inferInsert
export type AcademicDetail = typeof academicDetails.$inferSelect
export type NewAcademicDetail = typeof academicDetails.$inferInsert
