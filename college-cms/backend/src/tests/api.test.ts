import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import 'dotenv/config'
import { fileURLToPath } from 'node:url'

const TEST_DB_NAME = 'college_cms_api_test'
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url))
const ADMIN_TOKEN = 'test-admin-token-9f2c1a77'
const EDITOR_TOKEN = 'test-editor-token-7b4e0d31'
const ALLOWED_ORIGIN = 'http://localhost:5173'

assert.ok(
  TEST_DB_NAME.endsWith('_test'),
  `refusing to run against a database not ending in _test (got ${TEST_DB_NAME})`,
)

const devUrl = process.env.DATABASE_URL
if (!devUrl) throw new Error('DATABASE_URL is not set')

const testUrl = new URL(devUrl)
testUrl.pathname = `/${TEST_DB_NAME}`
process.env.DATABASE_URL = testUrl.toString()
process.env.ADMIN_TOKEN = ADMIN_TOKEN
process.env.EDITOR_TOKEN = EDITOR_TOKEN
process.env.CORS_ORIGINS = ALLOWED_ORIGIN
process.env.RATE_LIMIT_DISABLED = 'true'

const { app } = await import('../app.js')
const { client, db } = await import('../db/index.js')
const schema = await import('../db/schema.js')

const adminDb = postgres(devUrl, { max: 1 })
let server: Server
let baseUrl: string

interface Fixtures {
  csId: number
  mathId: number
  retiredId: number
  bscId: number
  mscId: number
  homeId: number
  homeBlockIds: number[]
  mediaId: number
  awardsId: number
  legacyDomainId: number
  inactiveCourseId: number
}

let fx: Fixtures

interface ListEnvelope<T> {
  data: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}
interface DataEnvelope<T> {
  data: T
}
interface ErrorBody {
  error: { code: string; message: string; details?: { path?: string; message: string }[] }
}

interface RequestOptions {
  method?: string
  body?: unknown
  rawBody?: string
  token?: string
  headers?: Record<string, string>
}

async function req<T = any>(path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = { ...(options.headers ?? {}) }
  let body: string | undefined
  if (options.rawBody !== undefined) {
    body = options.rawBody
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body)
    headers['Content-Type'] = 'application/json'
  }
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  })
  const text = await response.text()
  const parsed = text === '' ? null : (JSON.parse(text) as T)
  return { status: response.status, headers: response.headers, body: parsed as T }
}

function errorMessage(body: unknown): string {
  return JSON.stringify(body)
}

async function seed() {
  const [cs, math, retired] = await db
    .insert(schema.streams)
    .values([
      {
        slug: 'department-of-computer-science',
        name: 'Department of Computer Science',
        category: 'Technology',
        sortOrder: 10,
        isActive: true,
      },
      {
        slug: 'department-of-mathematics',
        name: 'Department of Mathematics',
        category: 'Science',
        sortOrder: 20,
        isActive: true,
      },
      { slug: 'retired-department', name: 'Retired Department', sortOrder: 30, isActive: false },
    ])
    .returning()

  const [bsc, msc] = await db
    .insert(schema.degreeLevels)
    .values([
      { code: 'bsc', name: 'Bachelor of Science', levelGroup: 'undergraduate', sortOrder: 10 },
      { code: 'msc', name: 'Master of Science', levelGroup: 'postgraduate', sortOrder: 20 },
    ])
    .returning()

  await db.insert(schema.degreeLevelStreams).values([
    { streamId: cs.id, degreeLevelId: bsc.id, sortOrder: 10 },
    { streamId: math.id, degreeLevelId: msc.id, sortOrder: 10 },
  ])

  const [inactiveCourse] = await db
    .insert(schema.courses)
    .values([
      { code: 'OLD101', title: 'Legacy Course', credits: 3, sortOrder: 20, isActive: false },
      { code: 'MATH101', title: 'Calculus', credits: 4, sortOrder: 30, isActive: true },
      {
        code: 'CS101',
        slug: 'intro-cs',
        title: 'Intro to Computer Science',
        description: 'Foundations',
        credits: 4,
        department: 'Computer Science',
        streamId: cs.id,
        degreeLevelId: bsc.id,
        sortOrder: 10,
        isActive: true,
      },
    ])
    .returning()

  const [home] = await db
    .insert(schema.pages)
    .values([
      { slug: 'home', title: 'Home', section: 'general', published: true, blocks: [] },
      { slug: 'about', title: 'About', section: 'about', published: true, blocks: [] },
      { slug: 'draft-page', title: 'Draft Page', section: 'general', published: false, blocks: [] },
    ])
    .returning()

  const blocks = await db
    .insert(schema.pageBlocks)
    .values([
      { pageId: home.id, type: 'heading', position: 0, content: { text: 'Welcome', level: 1 } },
      { pageId: home.id, type: 'paragraph', position: 10, content: { text: 'Hello there' } },
    ])
    .returning()

  await db.insert(schema.facultyMembers).values([
    { name: 'Dr. General', department: 'General Studies', title: 'Lecturer' },
    { name: 'Dr. Ada', department: 'Computer Science', title: 'Professor', streamId: cs.id },
    { name: 'Dr. Hidden', department: 'Retired Department', title: 'Professor', streamId: retired.id },
  ])

  const [awards, legacyDomain] = await db
    .insert(schema.excellenceDomains)
    .values([
      { slug: 'awards', name: 'Awards', sortOrder: 10, isActive: true },
      { slug: 'legacy-awards', name: 'Legacy Awards', sortOrder: 20, isActive: false },
    ])
    .returning()

  await db.insert(schema.excellence).values([
    { title: 'Visible Prize', year: 2024, sortOrder: 10, domainId: awards.id },
    { title: 'Hidden Prize', year: 2023, sortOrder: 20, domainId: legacyDomain.id },
    { title: 'Unlisted Prize', year: 2022, sortOrder: 30 },
  ])

  await db.insert(schema.academicDetails).values({
    streamId: cs.id,
    overview: { nodes: [{ type: 'paragraph', align: 'left', runs: [{ text: 'CS overview' }] }] },
    programsHtml: '<ul><li>BSc Computer Science</li></ul>',
  })

  const [mediaRow] = await db
    .insert(schema.media)
    .values([
      { sourceSystem: 'test', sourceRef: 'logo-one', url: 'https://example.test/logo.png', status: 'ready', altText: 'logo' },
    ])
    .returning()

  fx = {
    csId: cs.id,
    mathId: math.id,
    retiredId: retired.id,
    bscId: bsc.id,
    mscId: msc.id,
    homeId: home.id,
    homeBlockIds: blocks.map((block) => block.id),
    mediaId: mediaRow.id,
    awardsId: awards.id,
    legacyDomainId: legacyDomain.id,
    inactiveCourseId: inactiveCourse.id,
  }
}

before(async () => {
  const [exists] = await adminDb`select 1 as ok from pg_database where datname = ${TEST_DB_NAME}`
  if (!exists) await adminDb.unsafe(`create database "${TEST_DB_NAME}"`)
  await db.execute(sql`drop schema if exists public cascade`)
  await db.execute(sql`create schema public`)
  await db.execute(sql`drop schema if exists drizzle cascade`)
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  await seed()
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  await client.end()
  await adminDb.end()
})

test('health and openapi endpoints', async () => {
  const health = await req<DataEnvelope<{ status: string; database: string }>>('/api/health')
  assert.equal(health.status, 200)
  assert.equal(health.body.data.status, 'ok')
  assert.equal(health.body.data.database, 'connected')

  const spec = await req<any>('/api/openapi.json')
  assert.equal(spec.status, 200)
  assert.ok(String(spec.body.openapi).startsWith('3.'))
  assert.ok(spec.body.paths['/api/pages'])
  assert.ok(spec.body.paths['/api/admin/pages'])
  assert.ok(spec.body.components.securitySchemes.bearerAuth)
})

test('public lists use the envelope and hide inactive content', async () => {
  const streams = await req<ListEnvelope<{ slug: string }>>('/api/streams')
  assert.equal(streams.status, 200)
  assert.deepEqual(streams.body.meta, { page: 1, limit: 20, total: 2, totalPages: 1 })
  assert.ok(streams.body.data.every((stream) => stream.slug !== 'retired-department'))

  const pages = await req<ListEnvelope<{ slug: string }>>('/api/pages')
  assert.equal(pages.status, 200)
  assert.equal(pages.body.meta.total, 2)
  assert.ok(pages.body.data.every((page) => page.slug !== 'draft-page'))
  assert.ok(!('blocks' in pages.body.data[0]))

  const courses = await req<ListEnvelope<{ code: string }>>('/api/academics/courses')
  assert.equal(courses.status, 200)
  assert.equal(courses.body.meta.total, 2)
  assert.ok(courses.body.data.every((course) => course.code !== 'OLD101'))

  const faculty = await req<ListEnvelope<{ name: string }>>('/api/faculty')
  assert.equal(faculty.status, 200)
  assert.deepEqual(
    faculty.body.data.map((member) => member.name).sort(),
    ['Dr. Ada', 'Dr. General'],
  )

  const excellence = await req<ListEnvelope<{ title: string }>>('/api/excellence')
  assert.equal(excellence.status, 200)
  assert.deepEqual(
    excellence.body.data.map((item) => item.title).sort(),
    ['Unlisted Prize', 'Visible Prize'],
  )

  const domains = await req<ListEnvelope<{ slug: string }>>('/api/excellence-domains')
  assert.equal(domains.status, 200)
  assert.deepEqual(domains.body.data.map((domain) => domain.slug), ['awards'])

  const levels = await req<ListEnvelope<{ code: string }>>('/api/degree-levels')
  assert.equal(levels.status, 200)
  assert.equal(levels.body.meta.total, 2)
})

test('public detail endpoints', async () => {
  const home = await req<DataEnvelope<{ slug: string; blocks: any[] }>>('/api/pages/home')
  assert.equal(home.status, 200)
  assert.equal(home.body.data.slug, 'home')
  assert.equal(home.body.data.blocks.length, 2)
  assert.equal(home.body.data.blocks[0].type, 'heading')
  assert.equal(home.body.data.blocks[0].media, null)

  const draft = await req<ErrorBody>('/api/pages/draft-page')
  assert.equal(draft.status, 404)
  assert.equal(draft.body.error.code, 'not_found')

  const missing = await req<ErrorBody>('/api/pages/no-such-page')
  assert.equal(missing.status, 404)

  const stream = await req<DataEnvelope<{ slug: string; degreeLevels: { code: string }[] }>>(
    '/api/streams/department-of-computer-science',
  )
  assert.equal(stream.status, 200)
  assert.deepEqual(
    stream.body.data.degreeLevels.map((level) => level.code),
    ['bsc'],
  )

  const retired = await req<ErrorBody>('/api/streams/retired-department')
  assert.equal(retired.status, 404)

  const level = await req<DataEnvelope<{ streams: { slug: string }[] }>>('/api/degree-levels/bsc')
  assert.equal(level.status, 200)
  assert.deepEqual(
    level.body.data.streams.map((stream) => stream.slug),
    ['department-of-computer-science'],
  )

  const details = await req<DataEnvelope<{ details: { programsHtml: string } | null }>>(
    '/api/academics/details/department-of-computer-science',
  )
  assert.equal(details.status, 200)
  assert.ok(details.body.data.details?.programsHtml.includes('BSc Computer Science'))

  const inactiveDetails = await req<ErrorBody>('/api/academics/details/retired-department')
  assert.equal(inactiveDetails.status, 404)

  const unknownDetails = await req<ErrorBody>('/api/academics/details/not-a-stream')
  assert.equal(unknownDetails.status, 404)

  const noContact = await req<ErrorBody>('/api/contact')
  assert.equal(noContact.status, 404)
  assert.equal(noContact.body.error.code, 'not_found')

  const inactiveCourse = await req<ErrorBody>(`/api/academics/courses/${fx.inactiveCourseId}`)
  assert.equal(inactiveCourse.status, 404)
})

test('query and path validation failures return 400 validation_error', async () => {
  const cases = [
    '/api/pages?limit=0',
    '/api/pages?limit=101',
    '/api/pages?page=0',
    '/api/pages?sort=bogus',
    '/api/pages?order=sideways',
    '/api/pages?section=nope',
    '/api/streams?q=x&page=abc',
    '/api/academics/courses?streamId=zero',
  ]
  for (const path of cases) {
    const response = await req<ErrorBody>(path)
    assert.equal(response.status, 400, `expected 400 for ${path}`)
    assert.equal(response.body.error.code, 'validation_error', `wrong code for ${path}`)
    assert.ok(Array.isArray(response.body.error.details))
    assert.ok((response.body.error.details ?? []).length > 0, `missing details for ${path}`)
  }

  const badId = await req<ErrorBody>('/api/admin/pages/abc', { token: EDITOR_TOKEN })
  assert.equal(badId.status, 400)
  assert.equal(badId.body.error.code, 'validation_error')
})

test('malformed and oversized bodies are rejected', async () => {
  const malformed = await req<ErrorBody>('/api/admin/pages', {
    method: 'POST',
    rawBody: '{"title": "broken"',
    token: EDITOR_TOKEN,
  })
  assert.equal(malformed.status, 400)
  assert.equal(malformed.body.error.code, 'invalid_json')

  const oversized = await req<ErrorBody>('/api/admin/pages', {
    method: 'POST',
    body: { title: 'x'.repeat(1_100_000) },
    token: EDITOR_TOKEN,
  })
  assert.equal(oversized.status, 413)
  assert.equal(oversized.body.error.code, 'payload_too_large')
})

test('admin routes enforce authentication and roles', async () => {
  const missing = await req<ErrorBody>('/api/admin/pages', { method: 'POST', body: { title: 'x' } })
  assert.equal(missing.status, 401)
  assert.equal(missing.body.error.code, 'unauthorized')

  const wrongToken = await req<ErrorBody>('/api/admin/pages', {
    method: 'POST',
    body: { title: 'x' },
    token: 'not-a-real-token',
  })
  assert.equal(wrongToken.status, 401)

  const statsNoAuth = await req<ErrorBody>('/api/admin/stats')
  assert.equal(statsNoAuth.status, 401)

  const stats = await req<DataEnvelope<{ pages: number; courses: number; faculty: number }>>(
    '/api/admin/stats',
    { token: EDITOR_TOKEN },
  )
  assert.equal(stats.status, 200)
  assert.equal(stats.body.data.pages, 3)
  assert.equal(stats.body.data.courses, 3)
  assert.equal(stats.body.data.faculty, 3)

  const editorDelete = await req<ErrorBody>(`/api/admin/pages/${fx.homeId}`, {
    method: 'DELETE',
    token: EDITOR_TOKEN,
  })
  assert.equal(editorDelete.status, 403)
  assert.equal(editorDelete.body.error.code, 'forbidden')

  const drafts = await req<ListEnvelope<{ slug: string }>>('/api/admin/pages?published=false', {
    token: EDITOR_TOKEN,
  })
  assert.equal(drafts.status, 200)
  assert.deepEqual(
    drafts.body.data.map((page) => page.slug),
    ['draft-page'],
  )
})

test('page create, publish, update and block lifecycle', async () => {
  const created = await req<DataEnvelope<{ id: number; slug: string; published: boolean }>>(
    '/api/admin/pages',
    {
      method: 'POST',
      token: EDITOR_TOKEN,
      body: {
        title: 'Lifecycle Page',
        slug: 'lifecycle-page',
        section: 'about',
        blocks: [
          { type: 'heading', content: { text: 'Lifecycle', level: 2 } },
          { type: 'list', content: { ordered: false, items: ['one', 'two'] } },
        ],
      },
    },
  )
  assert.equal(created.status, 201, errorMessage(created.body))
  const pageId = created.body.data.id
  assert.equal(created.body.data.published, false)

  const hidden = await req<ErrorBody>('/api/pages/lifecycle-page')
  assert.equal(hidden.status, 404)

  const published = await req<DataEnvelope<{ published: boolean }>>(
    `/api/admin/pages/${pageId}/publish`,
    { method: 'POST', token: EDITOR_TOKEN, body: { published: true } },
  )
  assert.equal(published.status, 200, errorMessage(published.body))
  assert.equal(published.body.data.published, true)

  const visible = await req<DataEnvelope<{ blocks: any[] }>>('/api/pages/lifecycle-page')
  assert.equal(visible.status, 200)
  assert.equal(visible.body.data.blocks.length, 2)

  const updated = await req<DataEnvelope<{ title: string; blocks: any[] }>>(
    `/api/admin/pages/${pageId}`,
    {
      method: 'PUT',
      token: EDITOR_TOKEN,
      body: {
        title: 'Lifecycle Renamed',
        blocks: [
          { type: 'paragraph', content: { text: 'only block now' } },
          { type: 'image', content: { alt: 'logo' }, mediaId: fx.mediaId },
        ],
      },
    },
  )
  assert.equal(updated.status, 200, errorMessage(updated.body))
  assert.equal(updated.body.data.title, 'Lifecycle Renamed')
  assert.equal(updated.body.data.blocks.length, 2)
  assert.equal(updated.body.data.blocks[1].type, 'image')
  assert.equal(updated.body.data.blocks[1].media?.id, fx.mediaId)

  const added = await req<DataEnvelope<{ type: string }>>(`/api/admin/pages/${pageId}/blocks`, {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { type: 'paragraph', content: { text: 'appended' } },
  })
  assert.equal(added.status, 201, errorMessage(added.body))
  assert.equal(added.body.data.type, 'paragraph')

  const imageMissingMedia = await req<ErrorBody>(`/api/admin/pages/${pageId}/blocks`, {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { type: 'image', content: {} },
  })
  assert.equal(imageMissingMedia.status, 400)
  assert.equal(imageMissingMedia.body.error.code, 'validation_error')

  const imageUnknownMedia = await req<ErrorBody>(`/api/admin/pages/${pageId}/blocks`, {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { type: 'image', content: {}, mediaId: 999999 },
  })
  assert.equal(imageUnknownMedia.status, 400)
  assert.equal(imageUnknownMedia.body.error.code, 'invalid_reference')

  const blockDelete = await req(`/api/admin/pages/${pageId}/blocks/999999`, {
    method: 'DELETE',
    token: EDITOR_TOKEN,
  })
  assert.equal(blockDelete.status, 404)
})

test('duplicate slugs and empty updates conflict or fail validation', async () => {
  const duplicate = await req<ErrorBody>('/api/admin/pages', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { title: 'Copy', slug: 'home' },
  })
  assert.equal(duplicate.status, 409)
  assert.equal(duplicate.body.error.code, 'conflict')

  const pages = await req<ListEnvelope<{ id: number; slug: string }>>('/api/admin/pages?q=Lifecycle', {
    token: EDITOR_TOKEN,
  })
  assert.equal(pages.status, 200)
  const lifecycle = pages.body.data.find((page) => page.slug === 'lifecycle-page')
  assert.ok(lifecycle, 'lifecycle page should exist')

  const clash = await req<ErrorBody>(`/api/admin/pages/${lifecycle!.id}`, {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: { slug: 'home' },
  })
  assert.equal(clash.status, 409)

  const emptyUpdate = await req<ErrorBody>(`/api/admin/pages/${lifecycle!.id}`, {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: {},
  })
  assert.equal(emptyUpdate.status, 400)
  assert.equal(emptyUpdate.body.error.code, 'validation_error')

  const unknownField = await req<ErrorBody>('/api/admin/pages', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { title: 'Nope', slug: 'nope-page', evil: true },
  })
  assert.equal(unknownField.status, 400)

  const badSlug = await req<ErrorBody>('/api/admin/pages', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { title: 'Nope', slug: 'Not A Slug' },
  })
  assert.equal(badSlug.status, 400)
  assert.equal(badSlug.body.error.code, 'validation_error')
})

test('pagination, filtering, search and stable sorting', async () => {
  const titles = ['Alpha', 'Alpha', 'Beta', 'Delta', 'Gamma']
  const ids: number[] = []
  for (const [index, title] of titles.entries()) {
    const created = await req<DataEnvelope<{ id: number }>>('/api/admin/pages', {
      method: 'POST',
      token: EDITOR_TOKEN,
      body: {
        title: `${title} Page`,
        slug: `sort-${title.toLowerCase()}-${index}`,
        section: 'academics',
        published: true,
      },
    })
    assert.equal(created.status, 201, errorMessage(created.body))
    ids.push(created.body.data.id)
  }
  assert.equal(ids.length, 5)

  const pageTwo = await req<ListEnvelope<{ title: string }>>(
    '/api/pages?section=academics&sort=title&order=asc&page=2&limit=2',
  )
  assert.equal(pageTwo.status, 200)
  assert.deepEqual(pageTwo.body.meta, { page: 2, limit: 2, total: 5, totalPages: 3 })
  assert.deepEqual(
    pageTwo.body.data.map((page) => page.title),
    ['Beta Page', 'Delta Page'],
  )

  const full = await req<ListEnvelope<{ id: number; title: string }>>(
    '/api/pages?section=academics&sort=title&order=asc&limit=20',
  )
  assert.deepEqual(
    full.body.data.map((page) => page.title),
    ['Alpha Page', 'Alpha Page', 'Beta Page', 'Delta Page', 'Gamma Page'],
  )
  assert.ok(full.body.data[0].id < full.body.data[1].id, 'ties break by ascending id')

  const descending = await req<ListEnvelope<{ id: number; title: string }>>(
    '/api/pages?section=academics&sort=title&order=desc&limit=20',
  )
  assert.deepEqual(
    descending.body.data.map((page) => page.title),
    ['Gamma Page', 'Delta Page', 'Beta Page', 'Alpha Page', 'Alpha Page'],
  )
  assert.ok(descending.body.data[3].id < descending.body.data[4].id, 'ties still break by ascending id')

  const search = await req<ListEnvelope<{ title: string }>>('/api/pages?q=gamma')
  assert.equal(search.body.meta.total, 1)
  assert.equal(search.body.data[0].title, 'Gamma Page')

  const escaped = await req<ListEnvelope<unknown>>('/api/pages?q=%25')
  assert.equal(escaped.status, 200)
  assert.equal(escaped.body.meta.total, 0)
})

test('block reorder requires a full permutation', async () => {
  const before = await req<DataEnvelope<{ blocks: { id: number }[] }>>(`/api/admin/pages/${fx.homeId}`, {
    token: EDITOR_TOKEN,
  })
  assert.equal(before.status, 200)
  const [first, second] = before.body.data.blocks
  assert.notEqual(first.id, second.id)

  const reordered = await req<DataEnvelope<{ id: number; position: number }[]>>(
    `/api/admin/pages/${fx.homeId}/blocks/order`,
    { method: 'PUT', token: EDITOR_TOKEN, body: { ids: [second.id, first.id] } },
  )
  assert.equal(reordered.status, 200, errorMessage(reordered.body))
  assert.equal(reordered.body.data[0].id, second.id)
  assert.equal(reordered.body.data[0].position, 0)
  assert.equal(reordered.body.data[1].position, 10)

  const publicOrder = await req<DataEnvelope<{ blocks: { id: number }[] }>>('/api/pages/home')
  assert.equal(publicOrder.body.data.blocks[0].id, second.id)

  const missing = await req<ErrorBody>(`/api/admin/pages/${fx.homeId}/blocks/order`, {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: { ids: [first.id] },
  })
  assert.equal(missing.status, 400)
  assert.equal(missing.body.error.code, 'validation_error')
  assert.ok(JSON.stringify(missing.body.error.details).includes('missing'))

  const unknown = await req<ErrorBody>(`/api/admin/pages/${fx.homeId}/blocks/order`, {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: { ids: [first.id, second.id, 424242] },
  })
  assert.equal(unknown.status, 400)
  assert.ok(JSON.stringify(unknown.body.error.details).includes('unknown'))

  const duplicate = await req<ErrorBody>(`/api/admin/pages/${fx.homeId}/blocks/order`, {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: { ids: [first.id, first.id] },
  })
  assert.equal(duplicate.status, 400)

  const restore = await req(`/api/admin/pages/${fx.homeId}/blocks/order`, {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: { ids: [first.id, second.id] },
  })
  assert.equal(restore.status, 200)
})

test('stream reorder and activation change public visibility', async () => {
  const all = await req<ListEnvelope<{ id: number; slug: string }>>('/api/admin/streams', {
    token: EDITOR_TOKEN,
  })
  assert.equal(all.status, 200)
  assert.equal(all.body.meta.total, 3)

  const ids = all.body.data.map((stream) => stream.id)
  const reversed = [...ids].reverse()
  const reordered = await req<DataEnvelope<{ id: number }[]>>('/api/admin/streams/order', {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: { ids: reversed },
  })
  assert.equal(reordered.status, 200, errorMessage(reordered.body))
  assert.deepEqual(
    reordered.body.data.map((stream) => stream.id),
    reversed,
  )

  const publicOrder = await req<ListEnvelope<{ id: number }>>('/api/streams')
  const publicIds = publicOrder.body.data.map((stream) => stream.id)
  const expectedActive = reversed.filter((id) => id !== fx.retiredId)
  assert.deepEqual(publicIds, expectedActive)

  const deactivated = await req<DataEnvelope<{ isActive: boolean }>>(
    `/api/admin/streams/${fx.csId}/active`,
    { method: 'POST', token: EDITOR_TOKEN, body: { isActive: false } },
  )
  assert.equal(deactivated.status, 200)
  assert.equal(deactivated.body.data.isActive, false)

  const hidden = await req<ListEnvelope<{ slug: string }>>('/api/streams')
  assert.ok(hidden.body.data.every((stream) => stream.slug !== 'department-of-computer-science'))

  const hiddenDetail = await req<ErrorBody>('/api/streams/department-of-computer-science')
  assert.equal(hiddenDetail.status, 404)

  const hiddenFaculty = await req<ListEnvelope<{ name: string }>>('/api/faculty')
  assert.ok(hiddenFaculty.body.data.every((member) => member.name !== 'Dr. Ada'))

  const reactivated = await req(`/api/admin/streams/${fx.csId}/active`, {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { isActive: true },
  })
  assert.equal(reactivated.status, 200)
})

test('course validation, conflicts and lifecycle', async () => {
  const halfPair = await req<ErrorBody>('/api/admin/courses', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { title: 'Half Pair', streamId: fx.csId },
  })
  assert.equal(halfPair.status, 400)
  assert.equal(halfPair.body.error.code, 'validation_error')

  const unlinkedPair = await req<ErrorBody>('/api/admin/courses', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { title: 'Unlinked Pair', streamId: fx.csId, degreeLevelId: fx.mscId },
  })
  assert.equal(unlinkedPair.status, 400)
  assert.equal(unlinkedPair.body.error.code, 'invalid_reference')

  const created = await req<DataEnvelope<{ id: number; code: string }>>('/api/admin/courses', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { code: 'CS201', title: 'Data Structures', streamId: fx.csId, degreeLevelId: fx.bscId, credits: 4 },
  })
  assert.equal(created.status, 201, errorMessage(created.body))
  const courseId = created.body.data.id

  const duplicateCode = await req<ErrorBody>('/api/admin/courses', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { code: 'CS101', title: 'Duplicate' },
  })
  assert.equal(duplicateCode.status, 409)

  const badCredits = await req<ErrorBody>('/api/admin/courses', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { title: 'Bad Credits', credits: -1 },
  })
  assert.equal(badCredits.status, 400)

  const deactivated = await req(`/api/admin/courses/${courseId}/active`, {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { isActive: false },
  })
  assert.equal(deactivated.status, 200)

  const hidden = await req<ListEnvelope<{ code: string }>>('/api/academics/courses')
  assert.ok(hidden.body.data.every((course) => course.code !== 'CS201'))

  const adminHidden = await req<ListEnvelope<{ code: string }>>('/api/admin/courses', {
    token: EDITOR_TOKEN,
  })
  assert.ok(adminHidden.body.data.some((course) => course.code === 'CS201'))

  const editorDelete = await req<ErrorBody>(`/api/admin/courses/${courseId}`, {
    method: 'DELETE',
    token: EDITOR_TOKEN,
  })
  assert.equal(editorDelete.status, 403)

  const adminDelete = await req(`/api/admin/courses/${courseId}`, {
    method: 'DELETE',
    token: ADMIN_TOKEN,
  })
  assert.equal(adminDelete.status, 204)

  const gone = await req<ErrorBody>(`/api/admin/courses/${courseId}`, { token: EDITOR_TOKEN })
  assert.equal(gone.status, 404)
})

test('degree level, faculty and excellence CRUD rules', async () => {
  const duplicateLevel = await req<ErrorBody>('/api/admin/degree-levels', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { code: 'bsc', name: 'Duplicate' },
  })
  assert.equal(duplicateLevel.status, 409)

  const level = await req<DataEnvelope<{ id: number }>>('/api/admin/degree-levels', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { code: 'phd', name: 'Doctor of Philosophy', levelGroup: 'doctoral' },
  })
  assert.equal(level.status, 201, errorMessage(level.body))

  const levelDeleteConflict = await req<ErrorBody>(`/api/admin/degree-levels/${fx.bscId}`, {
    method: 'DELETE',
    token: ADMIN_TOKEN,
  })
  assert.equal(levelDeleteConflict.status, 409)
  assert.equal(levelDeleteConflict.body.error.code, 'conflict')

  const levelDelete = await req(`/api/admin/degree-levels/${level.body.data.id}`, {
    method: 'DELETE',
    token: ADMIN_TOKEN,
  })
  assert.equal(levelDelete.status, 204)

  const faculty = await req<DataEnvelope<{ id: number; name: string }>>('/api/admin/faculty', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { name: 'Dr. New', department: 'Physics', streamId: fx.retiredId },
  })
  assert.equal(faculty.status, 201, errorMessage(faculty.body))

  const facultyPublic = await req<ListEnvelope<{ name: string }>>('/api/faculty')
  assert.ok(facultyPublic.body.data.every((member) => member.name !== 'Dr. New'))

  const facultyUpdate = await req<DataEnvelope<{ department: string }>>(
    `/api/admin/faculty/${faculty.body.data.id}`,
    { method: 'PUT', token: EDITOR_TOKEN, body: { department: 'Applied Physics' } },
  )
  assert.equal(facultyUpdate.status, 200)
  assert.equal(facultyUpdate.body.data.department, 'Applied Physics')

  const domainConflict = await req<ErrorBody>('/api/admin/excellence-domains', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { slug: 'awards', name: 'Duplicate' },
  })
  assert.equal(domainConflict.status, 409)

  const domainDeleteConflict = await req<ErrorBody>(`/api/admin/excellence-domains/${fx.awardsId}`, {
    method: 'DELETE',
    token: ADMIN_TOKEN,
  })
  assert.equal(domainDeleteConflict.status, 409)

  const badYear = await req<ErrorBody>('/api/admin/excellence', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { title: 'Ancient', year: 1800 },
  })
  assert.equal(badYear.status, 400)

  const unknownDomain = await req<ErrorBody>('/api/admin/excellence', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { title: 'Orphan', year: 2024, domainId: 999999 },
  })
  assert.equal(unknownDomain.status, 404)

  const item = await req<DataEnvelope<{ id: number }>>('/api/admin/excellence', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { title: 'New Prize', year: 2025, domainId: fx.awardsId },
  })
  assert.equal(item.status, 201, errorMessage(item.body))

  const itemDelete = await req(`/api/admin/excellence/${item.body.data.id}`, {
    method: 'DELETE',
    token: ADMIN_TOKEN,
  })
  assert.equal(itemDelete.status, 204)

  const facultyDelete = await req(`/api/admin/faculty/${faculty.body.data.id}`, {
    method: 'DELETE',
    token: ADMIN_TOKEN,
  })
  assert.equal(facultyDelete.status, 204)
})

test('contact singleton upserts and reads publicly', async () => {
  const beforeCreate = await req<ErrorBody>('/api/admin/contact', { token: EDITOR_TOKEN })
  assert.equal(beforeCreate.status, 404)

  const created = await req<DataEnvelope<{ collegeName: string }>>('/api/admin/contact', {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: { collegeName: 'Test College', email: 'info@test.edu' },
  })
  assert.equal(created.status, 200, errorMessage(created.body))
  assert.equal(created.body.data.collegeName, 'Test College')

  const publicRead = await req<DataEnvelope<{ email: string }>>('/api/contact')
  assert.equal(publicRead.status, 200)
  assert.equal(publicRead.body.data.email, 'info@test.edu')

  const merged = await req<DataEnvelope<{ collegeName: string; phone: string }>>(
    '/api/admin/contact',
    { method: 'PUT', token: EDITOR_TOKEN, body: { phone: '555-1234' } },
  )
  assert.equal(merged.body.data.collegeName, 'Test College')
  assert.equal(merged.body.data.phone, '555-1234')

  const unknownField = await req<ErrorBody>('/api/admin/contact', {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: { bogus: 'nope' },
  })
  assert.equal(unknownField.status, 400)
})

test('academic and faculty detail admin endpoints upsert', async () => {
  const empty = await req<DataEnvelope<{ details: unknown }>>(
    `/api/admin/streams/${fx.mathId}/details`,
    { token: EDITOR_TOKEN },
  )
  assert.equal(empty.status, 200)
  assert.equal(empty.body.data.details, null)

  const upserted = await req<DataEnvelope<{ programsHtml: string }>>(
    `/api/admin/streams/${fx.mathId}/details`,
    { method: 'PUT', token: EDITOR_TOKEN, body: { programsHtml: '<p>Math programs</p>' } },
  )
  assert.equal(upserted.status, 200, errorMessage(upserted.body))
  assert.equal(upserted.body.data.programsHtml, '<p>Math programs</p>')

  const overviewOnly = await req<DataEnvelope<{ overview: { nodes: unknown[] }; programsHtml: string }>>(
    `/api/admin/streams/${fx.mathId}/details`,
    {
      method: 'PUT',
      token: EDITOR_TOKEN,
      body: { overview: { nodes: [{ type: 'paragraph', align: 'left', runs: [{ text: 'Math' }] }] } },
    },
  )
  assert.equal(overviewOnly.status, 200)
  assert.equal(overviewOnly.body.data.overview.nodes.length, 1)
  assert.equal(overviewOnly.body.data.programsHtml, '<p>Math programs</p>')

  const badOverview = await req<ErrorBody>(`/api/admin/streams/${fx.mathId}/details`, {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: { overview: { nodes: 'not-an-array' } },
  })
  assert.equal(badOverview.status, 400)

  const missingStream = await req<ErrorBody>('/api/admin/streams/999999/details', {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: { programsHtml: '<p>x</p>' },
  })
  assert.equal(missingStream.status, 404)

  const introBefore = await req<DataEnvelope<{ intro: unknown }>>(
    `/api/admin/streams/${fx.csId}/faculty-details`,
    { token: EDITOR_TOKEN },
  )
  assert.equal(introBefore.status, 200)
  assert.equal(introBefore.body.data.intro, null)

  const introSaved = await req<DataEnvelope<{ intro: { nodes: unknown[] } }>>(
    `/api/admin/streams/${fx.csId}/faculty-details`,
    { method: 'PUT', token: EDITOR_TOKEN, body: { intro: { nodes: [] } } },
  )
  assert.equal(introSaved.status, 200)
  assert.deepEqual(introSaved.body.data.intro.nodes, [])
})

test('CORS allows only the configured origin', async () => {
  const allowed = await fetch(`${baseUrl}/api/health`, { headers: { Origin: ALLOWED_ORIGIN } })
  assert.equal(allowed.headers.get('access-control-allow-origin'), ALLOWED_ORIGIN)
  await allowed.text()

  const rejected = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'https://evil.example' },
  })
  assert.equal(rejected.headers.get('access-control-allow-origin'), null)
  await rejected.text()
})

test('security headers and error envelope', async () => {
  const health = await fetch(`${baseUrl}/api/health`)
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(health.headers.get('x-frame-options'), 'DENY')
  assert.equal(health.headers.get('x-powered-by'), null)
  await health.text()

  const missing = await req<ErrorBody>('/api/definitely-not-a-route')
  assert.equal(missing.status, 404)
  assert.equal(missing.body.error.code, 'not_found')
  assert.equal(missing.body.error.message, 'Not found')
})

test('whoami reports the authenticated role', async () => {
  const missing = await req<ErrorBody>('/api/admin/whoami')
  assert.equal(missing.status, 401)
  assert.equal(missing.body.error.code, 'unauthorized')

  const editor = await req<DataEnvelope<{ role: string }>>('/api/admin/whoami', { token: EDITOR_TOKEN })
  assert.equal(editor.status, 200)
  assert.equal(editor.body.data.role, 'editor')

  const admin = await req<DataEnvelope<{ role: string }>>('/api/admin/whoami', { token: ADMIN_TOKEN })
  assert.equal(admin.status, 200)
  assert.equal(admin.body.data.role, 'admin')
})

test('admin stats summarise content status', async () => {
  const stats = await req<
    DataEnvelope<{
      pages: number
      pagesPublished: number
      pagesDraft: number
      streams: number
      streamsActive: number
      media: number
      faculty: number
    }>
  >('/api/admin/stats', { token: EDITOR_TOKEN })
  assert.equal(stats.status, 200)
  assert.ok(stats.body.data.pages >= 3)
  assert.equal(
    stats.body.data.pagesPublished + stats.body.data.pagesDraft,
    stats.body.data.pages,
  )
  assert.ok(stats.body.data.pagesDraft >= 1)
  assert.equal(stats.body.data.streams, 3)
  assert.equal(stats.body.data.streamsActive, 2)
  assert.equal(stats.body.data.media, 1)
  assert.equal(stats.body.data.faculty, 3)
})

test('media CRUD validates urls and guards referenced deletions', async () => {
  const missing = await req<ErrorBody>('/api/admin/media')
  assert.equal(missing.status, 401)

  const badUrl = await req<ErrorBody>('/api/admin/media', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { url: 'javascript:alert(1)' },
  })
  assert.equal(badUrl.status, 400)
  assert.equal(badUrl.body.error.code, 'validation_error')

  const protocolRelative = await req<ErrorBody>('/api/admin/media', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { url: '//evil.test/x.jpg' },
  })
  assert.equal(protocolRelative.status, 400)
  assert.equal(protocolRelative.body.error.code, 'validation_error')

  const createdMedia = await req<DataEnvelope<{ id: number; url: string; status: string }>>(
    '/api/admin/media',
    {
      method: 'POST',
      token: EDITOR_TOKEN,
      body: { url: 'https://cdn.test/pic.jpg', altText: 'A picture', fileName: 'pic.jpg' },
    },
  )
  assert.equal(createdMedia.status, 201, errorMessage(createdMedia.body))
  const mediaId = createdMedia.body.data.id
  assert.equal(createdMedia.body.data.status, 'ready')

  const duplicateSource = await req<ErrorBody>('/api/admin/media', {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { url: 'https://cdn.test/other.png', sourceSystem: 'test', sourceRef: 'logo-one' },
  })
  assert.equal(duplicateSource.status, 409)

  const list = await req<ListEnvelope<{ id: number; url: string }>>('/api/admin/media?q=pic', {
    token: EDITOR_TOKEN,
  })
  assert.equal(list.status, 200)
  assert.ok(list.body.data.some((item) => item.id === mediaId))

  const updated = await req<DataEnvelope<{ altText: string }>>(`/api/admin/media/${mediaId}`, {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: { altText: 'Updated alt' },
  })
  assert.equal(updated.status, 200)
  assert.equal(updated.body.data.altText, 'Updated alt')

  const editorDelete = await req<ErrorBody>(`/api/admin/media/${mediaId}`, {
    method: 'DELETE',
    token: EDITOR_TOKEN,
  })
  assert.equal(editorDelete.status, 403)

  const imageBlock = await req<DataEnvelope<{ id: number }>>(`/api/admin/pages/${fx.homeId}/blocks`, {
    method: 'POST',
    token: EDITOR_TOKEN,
    body: { type: 'image', content: { alt: 'logo', caption: '' }, mediaId: fx.mediaId },
  })
  assert.equal(imageBlock.status, 201, errorMessage(imageBlock.body))

  const referencedDelete = await req<ErrorBody>(`/api/admin/media/${fx.mediaId}`, {
    method: 'DELETE',
    token: ADMIN_TOKEN,
  })
  assert.equal(referencedDelete.status, 409)

  await req(`/api/admin/pages/${fx.homeId}/blocks/${imageBlock.body.data.id}`, {
    method: 'DELETE',
    token: EDITOR_TOKEN,
  })

  const deleted = await req(`/api/admin/media/${mediaId}`, { method: 'DELETE', token: ADMIN_TOKEN })
  assert.equal(deleted.status, 204)

  const gone = await req<ErrorBody>(`/api/admin/media/${mediaId}`, { token: EDITOR_TOKEN })
  assert.equal(gone.status, 404)
})

test('stream degree level links are replaceable and guarded', async () => {
  const missingStream = await req<ErrorBody>('/api/admin/streams/999999/degree-levels', {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: { ids: [] },
  })
  assert.equal(missingStream.status, 404)

  const linked = await req<DataEnvelope<{ degreeLevels: { id: number }[] }>>(
    `/api/admin/streams/${fx.retiredId}/degree-levels`,
    { method: 'PUT', token: EDITOR_TOKEN, body: { ids: [fx.bscId, fx.mscId] } },
  )
  assert.equal(linked.status, 200, errorMessage(linked.body))
  assert.equal(linked.body.data.degreeLevels.length, 2)

  const unknownLevel = await req<ErrorBody>(`/api/admin/streams/${fx.retiredId}/degree-levels`, {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: { ids: [999999] },
  })
  assert.equal(unknownLevel.status, 400)
  assert.equal(unknownLevel.body.error.code, 'invalid_reference')

  const conflict = await req<ErrorBody>(`/api/admin/streams/${fx.csId}/degree-levels`, {
    method: 'PUT',
    token: EDITOR_TOKEN,
    body: { ids: [] },
  })
  assert.equal(conflict.status, 409)

  const restored = await req<DataEnvelope<{ degreeLevels: { id: number }[] }>>(
    `/api/admin/streams/${fx.retiredId}/degree-levels`,
    { method: 'PUT', token: EDITOR_TOKEN, body: { ids: [] } },
  )
  assert.equal(restored.status, 200)
  assert.equal(restored.body.data.degreeLevels.length, 0)
})
