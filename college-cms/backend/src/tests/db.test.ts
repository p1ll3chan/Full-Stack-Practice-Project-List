import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import 'dotenv/config'
import * as schema from '../db/schema.js'
import { applyPlan } from '../import/apply.js'
import { buildPlan, type DbSnapshot } from '../import/departments.js'
import { defaultCsvPath, readDepartmentsCsv } from '../import/csv.js'

const TEST_DB_NAME = 'college_cms_test'
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url))

assert.ok(
  TEST_DB_NAME.endsWith('_test'),
  `refusing to run against a database not ending in _test (got ${TEST_DB_NAME})`,
)

const devUrl = process.env.DATABASE_URL
if (!devUrl) throw new Error('DATABASE_URL is not set')
const admin = postgres(devUrl, { max: 1 })
const testUrl = new URL(devUrl)
testUrl.pathname = `/${TEST_DB_NAME}`
const client = postgres(testUrl.toString(), { max: 4 })
const db = drizzle(client, { schema })

const EXPECTED_TABLES = [
  'academic_details',
  'college_contact',
  'courses',
  'degree_level_streams',
  'degree_levels',
  'excellence',
  'excellence_domains',
  'faculty_details',
  'faculty_members',
  'media',
  'page_block_gallery_items',
  'page_blocks',
  'pages',
  'streams',
]

async function loadSnapshot(): Promise<DbSnapshot> {
  const [streams, courses, media, degreeLevels] = await Promise.all([
    db
      .select({ id: schema.streams.id, slug: schema.streams.slug, sourceId: schema.streams.sourceId })
      .from(schema.streams),
    db
      .select({ id: schema.courses.id, slug: schema.courses.slug, title: schema.courses.title })
      .from(schema.courses),
    db
      .select({
        id: schema.media.id,
        sourceSystem: schema.media.sourceSystem,
        sourceRef: schema.media.sourceRef,
      })
      .from(schema.media),
    db
      .select({ id: schema.degreeLevels.id, code: schema.degreeLevels.code })
      .from(schema.degreeLevels),
  ])
  return { streams, courses, media, degreeLevels }
}

async function count(table: string): Promise<number> {
  const [row] = await client.unsafe(`select count(*)::int as n from ${table}`)
  return Number(row.n)
}

function causedBy(error: unknown, pattern: RegExp): boolean {
  if (!(error instanceof Error)) return false
  if (pattern.test(error.message)) return true
  const cause = (error as { cause?: unknown }).cause
  return cause instanceof Error && pattern.test(cause.message)
}

before(async () => {
  const [exists] = await admin`select 1 as ok from pg_database where datname = ${TEST_DB_NAME}`
  if (!exists) await admin.unsafe(`create database "${TEST_DB_NAME}"`)
  await db.execute(sql`drop schema if exists public cascade`)
  await db.execute(sql`create schema public`)
  await db.execute(sql`drop schema if exists drizzle cascade`)
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
})

after(async () => {
  await client.end()
  await admin.end()
})

test('creates the phase 1 schema', async () => {
  const tables = await client.unsafe(
    `select tablename from pg_tables where schemaname = 'public' order by tablename`,
  )
  const names = tables.map((row) => String(row.tablename))
  for (const expected of EXPECTED_TABLES) assert.ok(names.includes(expected), `missing ${expected}`)
  assert.ok(!names.includes('faculty'))

  const migrations = await client.unsafe(
    `select hash, created_at from drizzle.__drizzle_migrations order by created_at`,
  )
  assert.equal(migrations.length, 2)
})

test('imports Departments.csv twice with stable results', async () => {
  await client.unsafe(
    `insert into courses (code, title, description, credits, department) values ('CS101', 'Intro to CS', 'legacy', 4, 'General')`,
  )
  await client.unsafe(
    `insert into faculty_members (name, title, department, email, bio) values ('Dr. Ada Lovelace', 'Professor', 'Computer Science', 'ada@college.edu', 'Pioneer')`,
  )
  await client.unsafe(
    `insert into excellence (title, category, description, year) values ('National Hackathon Winners', 'Awards', 'legacy', 2025)`,
  )
  await client.unsafe(
    `insert into pages (slug, title, blocks, published) values ('home', 'Welcome', '[{"id":"1","type":"heading","content":"Welcome to Our College"}]', true)`,
  )

  const rows = readDepartmentsCsv(defaultCsvPath())

  const firstPlan = buildPlan(rows, await loadSnapshot())
  assert.deepEqual(firstPlan.errors, [])
  const first = await applyPlan(db, firstPlan)
  assert.equal(first.streams.created, 18)
  assert.equal(first.streams.updated, 0)
  assert.equal(first.courses.created, 26)
  assert.equal(first.media.created, 17)
  assert.equal(first.degreeLevels.created, 8)
  assert.equal(first.academicDetails.created, 18)
  assert.equal(first.degreeLevelStreams.created, 25)

  assert.equal(await count('streams'), 18)
  assert.equal(await count('courses'), 27)
  assert.equal(await count('media'), 17)
  assert.equal(await count('degree_levels'), 8)
  assert.equal(await count('degree_level_streams'), 25)
  assert.equal(await count('academic_details'), 18)

  const [mathematics] = await client.unsafe(
    `select id, icon_svg, category, sort_order from streams where slug = 'department-of-mathematics'`,
  )
  assert.ok(String(mathematics.icon_svg).trim().length > 0)
  assert.equal(mathematics.category, 'Science')

  const [detail] = await client.unsafe(
    `select overview, programs_html from academic_details where stream_id = ${mathematics.id}`,
  )
  const overview = detail.overview as { nodes: unknown[] }
  assert.ok(Array.isArray(overview.nodes))
  assert.ok(overview.nodes.length > 0)
  assert.ok(String(detail.programs_html).includes('<ul'))

  const [mediaRow] = await client.unsafe(
    `select status, url, width, height, file_name from media where source_ref like 'wix:image://v1/%' limit 1`,
  )
  assert.equal(mediaRow.status, 'referenced')
  assert.equal(mediaRow.url, null)
  assert.equal(Number(mediaRow.width), 400)
  assert.equal(Number(mediaRow.height), 400)
  assert.ok(String(mediaRow.file_name).endsWith('.png'))

  const [legacyCourse] = await client.unsafe(
    `select code, title, credits, department, stream_id, slug from courses where code = 'CS101'`,
  )
  assert.equal(legacyCourse.title, 'Intro to CS')
  assert.equal(Number(legacyCourse.credits), 4)
  assert.equal(legacyCourse.stream_id, null)
  assert.equal(legacyCourse.slug, null)

  const secondPlan = buildPlan(rows, await loadSnapshot())
  const second = await applyPlan(db, secondPlan)
  assert.equal(second.streams.created, 0)
  assert.equal(second.streams.updated, 18)
  assert.equal(second.courses.created, 0)
  assert.equal(second.courses.updated, 26)
  assert.equal(second.media.created, 0)
  assert.equal(second.media.existing, 17)
  assert.equal(second.degreeLevels.created, 0)
  assert.equal(second.degreeLevelStreams.created, 0)
  assert.equal(second.degreeLevelStreams.existing, 25)

  assert.equal(await count('streams'), 18)
  assert.equal(await count('courses'), 27)
  assert.equal(await count('media'), 17)
  assert.equal(await count('academic_details'), 18)
})

test('refuses to apply a plan with errors', async () => {
  const rows = readDepartmentsCsv(defaultCsvPath())
  const broken = [{ ...rows[0], Title: '' }]
  const plan = buildPlan(broken, await loadSnapshot())
  assert.equal(plan.errors.length, 1)
  await assert.rejects(() => applyPlan(db, plan), /refusing to apply/)
})

test('enforces checks and uniques', async () => {
  await assert.rejects(() =>
    db.transaction((tx) =>
      tx.insert(schema.pages).values({ slug: 'bad-section', title: 'Bad', section: 'bogus' }),
    ),
  )
  await assert.rejects(() =>
    db.transaction((tx) =>
      tx.insert(schema.streams).values({
        slug: 'department-of-mathematics',
        name: 'Duplicate slug',
      }),
    ),
  )
  await assert.rejects(() =>
    db.transaction((tx) =>
      tx.insert(schema.collegeContact).values({ id: 2, collegeName: 'Intruder' }),
    ),
  )
})

test('enforces the composite stream/level foreign key', async () => {
  await assert.rejects(
    () =>
      db.transaction(async (tx) => {
        await tx.insert(schema.streams).values({
          slug: 'undeclared-pair-test',
          name: 'Department of Undeclared Pair',
        })
        const [stream] = await tx
          .select()
          .from(schema.streams)
          .where(eq(schema.streams.slug, 'undeclared-pair-test'))
        const [level] = await tx
          .select()
          .from(schema.degreeLevels)
          .where(eq(schema.degreeLevels.code, 'bsc'))
        await tx.insert(schema.courses).values({
          title: 'Undeclared pair',
          streamId: stream.id,
          degreeLevelId: level.id,
          credits: null,
        })
      }),
    (error: unknown) => causedBy(error, /violates foreign key constraint/),
  )

  const sentinel = new Error('rollback-sentinel')
  await assert.rejects(
    db.transaction(async (tx) => {
      const [stream] = await tx
        .insert(schema.streams)
        .values({ slug: 'declared-pair-test', name: 'Department of Declared Pair' })
        .returning()
      const [level] = await tx
        .insert(schema.degreeLevels)
        .values({ code: 'test-lvl', name: 'Test Level', sortOrder: 999 })
        .returning()
      await tx.insert(schema.degreeLevelStreams).values({
        streamId: stream.id,
        degreeLevelId: level.id,
      })
      await tx.insert(schema.courses).values({
        title: 'Declared pair',
        streamId: stream.id,
        degreeLevelId: level.id,
        credits: null,
      })
      const courses = await tx.select().from(schema.courses)
      assert.ok(courses.some((course) => course.title === 'Declared pair'))
      throw sentinel
    }),
    (error: unknown) => error === sentinel,
  )
})

test('cascades page block deletes and restricts media deletes', async () => {
  const sentinel = new Error('rollback-sentinel')
  await assert.rejects(
    db.transaction(async (tx) => {
      const [page] = await tx
        .insert(schema.pages)
        .values({ slug: 'cascade-test', title: 'Cascade', blocks: [], published: true })
        .returning()
      await tx.insert(schema.pageBlocks).values({
        pageId: page.id,
        type: 'paragraph',
        content: { text: 'child' },
      })
      const beforeDelete = await tx.select().from(schema.pageBlocks)
      assert.equal(beforeDelete.length, 1)
      await tx.delete(schema.pages).where(eq(schema.pages.id, page.id))
      const afterDelete = await tx.select().from(schema.pageBlocks)
      assert.equal(afterDelete.length, 0)
      throw sentinel
    }),
    (error: unknown) => error === sentinel,
  )

  await assert.rejects(
    () =>
      db.transaction(async (tx) => {
        const [media] = await tx
          .insert(schema.media)
          .values({ sourceSystem: 'test', sourceRef: 'restrict-me', status: 'referenced' })
          .returning()
        await tx.insert(schema.streams).values({
          slug: 'restrict-test',
          name: 'Department of Restrict',
          imageMediaId: media.id,
        })
        await tx.delete(schema.media).where(eq(schema.media.id, media.id))
      }),
    (error: unknown) => causedBy(error, /violates foreign key constraint/),
  )

  const [home] = await client.unsafe(`select id from pages where slug = 'home'`)
  assert.ok(home)
  const [leftover] = await client.unsafe(
    `select count(*)::int as n from pages where slug = 'cascade-test'`,
  )
  assert.equal(Number(leftover.n), 0)
})
