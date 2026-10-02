import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import 'dotenv/config'
import { fileURLToPath } from 'node:url'

const TEST_DB_NAME = 'college_cms_phase5_test'
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url))
const ADMIN_TOKEN = 'phase5-admin-token-3d8e4b12'
const EDITOR_TOKEN = 'phase5-editor-token-c91f7a05'

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
process.env.RATE_LIMIT_DISABLED = 'true'
process.env.TRUST_PROXY = '1'

const { app } = await import('../app.js')
const { client, db } = await import('../db/index.js')
const { closeAllSseClients } = await import('../events.js')
const { resetRateLimitBuckets } = await import('../middleware/rateLimit.js')

const adminDb = postgres(devUrl, { max: 1 })
let server: Server
let baseUrl: string

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
  token?: string
  headers?: Record<string, string>
}

async function req<T = any>(path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = { ...(options.headers ?? {}) }
  let body: string | undefined
  if (options.body !== undefined) {
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

async function readSse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  predicate: (text: string) => boolean,
  label: string,
): Promise<string> {
  const decoder = new TextDecoder()
  let buffer = ''
  const deadline = Date.now() + 5000
  while (!predicate(buffer)) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) {
      throw new Error(`timed out waiting for ${label}; buffer=${JSON.stringify(buffer)}`)
    }
    const result = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`timed out waiting for ${label}; buffer=${JSON.stringify(buffer)}`)), remaining),
      ),
    ])
    if (result.done) {
      throw new Error(`SSE stream ended before ${label}; buffer=${JSON.stringify(buffer)}`)
    }
    buffer += decoder.decode(result.value, { stream: true })
  }
  return buffer
}

before(async () => {
  const [exists] = await adminDb`select 1 as ok from pg_database where datname = ${TEST_DB_NAME}`
  if (!exists) await adminDb.unsafe(`create database "${TEST_DB_NAME}"`)
  await db.execute(sql`drop schema if exists public cascade`)
  await db.execute(sql`create schema public`)
  await db.execute(sql`drop schema if exists drizzle cascade`)
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  closeAllSseClients()
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  await client.end()
  await adminDb.end()
})

test('empty datasets return empty arrays with zeroed meta', async () => {
  const pages = await req<ListEnvelope<unknown>>('/api/pages?q=zzz-no-such-page')
  assert.equal(pages.status, 200)
  assert.deepEqual(pages.body.data, [])
  assert.deepEqual(pages.body.meta, { page: 1, limit: 20, total: 0, totalPages: 0 })

  const streams = await req<ListEnvelope<unknown>>('/api/streams')
  assert.equal(streams.status, 200)
  assert.deepEqual(streams.body.data, [])
  assert.equal(streams.body.meta.total, 0)

  const courses = await req<ListEnvelope<unknown>>('/api/academics/courses')
  assert.equal(courses.status, 200)
  assert.deepEqual(courses.body.data, [])

  const faculty = await req<ListEnvelope<unknown>>('/api/faculty')
  assert.equal(faculty.status, 200)
  assert.deepEqual(faculty.body.data, [])

  const missingPage = await req<ErrorBody>('/api/pages/does-not-exist')
  assert.equal(missingPage.status, 404)
  assert.equal(missingPage.body.error.code, 'not_found')

  const missingStream = await req<ErrorBody>('/api/streams/no-such-department')
  assert.equal(missingStream.status, 404)

  const missingLevel = await req<ErrorBody>('/api/degree-levels/nope')
  assert.equal(missingLevel.status, 404)
})

test('full admin-to-public workflow for every content type', async () => {
  const level = await req<DataEnvelope<{ id: number }>>('/api/admin/degree-levels', {
    method: 'POST',
    token: ADMIN_TOKEN,
    body: { code: 'bca', name: 'Bachelor of Computer Applications', levelGroup: 'undergraduate' },
  })
  assert.equal(level.status, 201, errorMessage(level.body))

  const stream = await req<DataEnvelope<{ id: number; slug: string }>>('/api/admin/streams', {
    method: 'POST',
    token: ADMIN_TOKEN,
    body: {
      slug: 'department-of-information-technology',
      name: 'Department of Information Technology',
      category: 'Technology',
      isActive: true,
    },
  })
  assert.equal(stream.status, 201, errorMessage(stream.body))
  const streamId = stream.body.data.id

  const linked = await req<DataEnvelope<{ degreeLevels: { id: number }[] }>>(
    `/api/admin/streams/${streamId}/degree-levels`,
    { method: 'PUT', token: ADMIN_TOKEN, body: { ids: [level.body.data.id] } },
  )
  assert.equal(linked.status, 200, errorMessage(linked.body))

  const details = await req<DataEnvelope<{ programsHtml: string }>>(
    `/api/admin/streams/${streamId}/details`,
    {
      method: 'PUT',
      token: ADMIN_TOKEN,
      body: { programsHtml: '<ul><li>BCA</li></ul>' },
    },
  )
  assert.equal(details.status, 200, errorMessage(details.body))

  const course = await req<DataEnvelope<{ id: number }>>('/api/admin/courses', {
    method: 'POST',
    token: ADMIN_TOKEN,
    body: {
      code: 'IT201',
      slug: 'web-technologies',
      title: 'Web Technologies',
      streamId,
      degreeLevelId: level.body.data.id,
      credits: 4,
    },
  })
  assert.equal(course.status, 201, errorMessage(course.body))

  const faculty = await req<DataEnvelope<{ id: number }>>('/api/admin/faculty', {
    method: 'POST',
    token: ADMIN_TOKEN,
    body: { name: 'Dr. Web', department: 'Information Technology', title: 'Professor', streamId },
  })
  assert.equal(faculty.status, 201, errorMessage(faculty.body))

  const domain = await req<DataEnvelope<{ id: number }>>('/api/admin/excellence-domains', {
    method: 'POST',
    token: ADMIN_TOKEN,
    body: { slug: 'innovation', name: 'Innovation', isActive: true },
  })
  assert.equal(domain.status, 201, errorMessage(domain.body))

  const prize = await req<DataEnvelope<{ id: number }>>('/api/admin/excellence', {
    method: 'POST',
    token: ADMIN_TOKEN,
    body: { title: 'Innovation Award', year: 2025, domainId: domain.body.data.id },
  })
  assert.equal(prize.status, 201, errorMessage(prize.body))

  const page = await req<DataEnvelope<{ id: number; slug: string }>>('/api/admin/pages', {
    method: 'POST',
    token: ADMIN_TOKEN,
    body: {
      title: 'Admissions',
      slug: 'admissions',
      section: 'general',
      published: true,
      blocks: [{ type: 'heading', content: { text: 'Admissions 2026', level: 1 } }],
    },
  })
  assert.equal(page.status, 201, errorMessage(page.body))

  const publicStream = await req<
    DataEnvelope<{ degreeLevels: { code: string }[]; faculty: unknown[] }>
  >('/api/streams/department-of-information-technology')
  assert.equal(publicStream.status, 200, errorMessage(publicStream.body))
  assert.deepEqual(
    publicStream.body.data.degreeLevels.map((item) => item.code),
    ['bca'],
  )

  const publicDetails = await req<DataEnvelope<{ details: { programsHtml: string } | null }>>(
    '/api/academics/details/department-of-information-technology',
  )
  assert.equal(publicDetails.status, 200)
  assert.ok(publicDetails.body.data.details?.programsHtml.includes('BCA'))

  const publicCourses = await req<ListEnvelope<{ code: string }>>('/api/academics/courses?streamId=' + streamId)
  assert.equal(publicCourses.status, 200, errorMessage(publicCourses.body))
  assert.deepEqual(
    publicCourses.body.data.map((item) => item.code),
    ['IT201'],
  )

  const publicCourse = await req<DataEnvelope<{ code: string }>>(`/api/academics/courses/${course.body.data.id}`)
  assert.equal(publicCourse.status, 200)
  assert.equal(publicCourse.body.data.code, 'IT201')

  const publicFaculty = await req<ListEnvelope<{ name: string }>>('/api/faculty')
  assert.ok(
    publicFaculty.body.data.some((member) => member.name === 'Dr. Web'),
    'faculty member should be publicly visible',
  )

  const publicDomains = await req<ListEnvelope<{ slug: string }>>('/api/excellence-domains')
  assert.ok(publicDomains.body.data.some((item) => item.slug === 'innovation'))

  const publicPrize = await req<ListEnvelope<{ title: string }>>('/api/excellence?domain=innovation')
  assert.equal(publicPrize.status, 200)
  assert.ok(publicPrize.body.data.some((item) => item.title === 'Innovation Award'))

  const publicPage = await req<DataEnvelope<{ blocks: unknown[] }>>('/api/pages/admissions')
  assert.equal(publicPage.status, 200)
  assert.equal(publicPage.body.data.blocks.length, 1)

  const levelPublic = await req<DataEnvelope<{ streams: { slug: string }[] }>>('/api/degree-levels/bca')
  assert.equal(levelPublic.status, 200)
  assert.ok(levelPublic.body.data.streams.some((item) => item.slug === 'department-of-information-technology'))

  const stats = await req<DataEnvelope<{ pages: number; streams: number; courses: number }>>(
    '/api/admin/stats',
    { token: ADMIN_TOKEN },
  )
  assert.equal(stats.status, 200)
  assert.equal(stats.body.data.pages, 1)
  assert.equal(stats.body.data.streams, 1)
  assert.equal(stats.body.data.courses, 1)

  const unpublish = await req<DataEnvelope<{ published: boolean }>>(
    `/api/admin/pages/${page.body.data.id}/publish`,
    { method: 'POST', token: ADMIN_TOKEN, body: { published: false } },
  )
  assert.equal(unpublish.status, 200, errorMessage(unpublish.body))

  const hiddenPage = await req<ErrorBody>('/api/pages/admissions')
  assert.equal(hiddenPage.status, 404)

  const deactivate = await req<DataEnvelope<{ isActive: boolean }>>(
    `/api/admin/streams/${streamId}/active`,
    { method: 'POST', token: ADMIN_TOKEN, body: { isActive: false } },
  )
  assert.equal(deactivate.status, 200)

  const hiddenStream = await req<ErrorBody>('/api/streams/department-of-information-technology')
  assert.equal(hiddenStream.status, 404)

  const hiddenFaculty = await req<ListEnvelope<{ name: string }>>('/api/faculty')
  assert.ok(!hiddenFaculty.body.data.some((member) => member.name === 'Dr. Web'))

  const deactivateDomain = await req(
    `/api/admin/excellence-domains/${domain.body.data.id}/active`,
    { method: 'POST', token: ADMIN_TOKEN, body: { isActive: false } },
  )
  assert.equal(deactivateDomain.status, 200)

  const hiddenPrize = await req<ListEnvelope<{ title: string }>>('/api/excellence?domain=innovation')
  assert.deepEqual(hiddenPrize.body.data, [])
  const hiddenDomain = await req<ErrorBody>('/api/excellence-domains/innovation')
  assert.equal(hiddenDomain.status, 404)

  const deactivateCourse = await req(`/api/admin/courses/${course.body.data.id}/active`, {
    method: 'POST',
    token: ADMIN_TOKEN,
    body: { isActive: false },
  })
  assert.equal(deactivateCourse.status, 200)
  const hiddenCourse = await req<ErrorBody>(`/api/academics/courses/${course.body.data.id}`)
  assert.equal(hiddenCourse.status, 404)

  const deletePage = await req(`/api/admin/pages/${page.body.data.id}`, {
    method: 'DELETE',
    token: ADMIN_TOKEN,
  })
  assert.equal(deletePage.status, 204)
  const deletedPageAdmin = await req<ErrorBody>(`/api/admin/pages/${page.body.data.id}`, {
    token: ADMIN_TOKEN,
  })
  assert.equal(deletedPageAdmin.status, 404)

  const streamInUse = await req<ErrorBody>(`/api/admin/streams/${streamId}`, {
    method: 'DELETE',
    token: ADMIN_TOKEN,
  })
  assert.ok(
    streamInUse.status === 409 || streamInUse.status === 400,
    `stream with dependents must not be hard-deleted (got ${streamInUse.status})`,
  )

  await req(`/api/admin/courses/${course.body.data.id}`, { method: 'DELETE', token: ADMIN_TOKEN })
  await req(`/api/admin/faculty/${faculty.body.data.id}`, { method: 'DELETE', token: ADMIN_TOKEN })

  const deleteStream = await req(`/api/admin/streams/${streamId}`, {
    method: 'DELETE',
    token: ADMIN_TOKEN,
  })
  assert.equal(deleteStream.status, 204, errorMessage(deleteStream.body))
  const goneStreamPublic = await req<ErrorBody>('/api/streams/department-of-information-technology')
  assert.equal(goneStreamPublic.status, 404)

  await req(`/api/admin/excellence/${prize.body.data.id}`, { method: 'DELETE', token: ADMIN_TOKEN })
  await req(`/api/admin/excellence-domains/${domain.body.data.id}`, {
    method: 'DELETE',
    token: ADMIN_TOKEN,
  })
  await req(`/api/admin/degree-levels/${level.body.data.id}`, { method: 'DELETE', token: ADMIN_TOKEN })
})

test('SSE endpoint broadcasts content events for admin mutations', async () => {
  const controller = new AbortController()
  const response = await fetch(`${baseUrl}/api/events`, { signal: controller.signal })
  assert.equal(response.status, 200)
  assert.ok(response.headers.get('content-type')?.includes('text/event-stream'))
  assert.ok(response.headers.get('cache-control')?.includes('no-cache'))
  assert.ok(response.body)

  const reader = response.body!.getReader()
  try {
    await readSse(reader, (text) => text.includes('event: ready'), 'ready event')

    const created = await req<DataEnvelope<{ id: number }>>('/api/admin/pages', {
      method: 'POST',
      token: ADMIN_TOKEN,
      body: { title: 'SSE Page', slug: 'sse-page', section: 'general', published: true },
    })
    assert.equal(created.status, 201, errorMessage(created.body))

    const content = await readSse(
      reader,
      (text) => text.includes('event: content') && text.includes('"entity":"pages"'),
      'content event for pages',
    )
    assert.ok(content.includes('"action":"mutated"'))

    const forbidden = await req<ErrorBody>('/api/admin/pages', {
      method: 'POST',
      body: { title: 'No Auth', slug: 'no-auth-page' },
    })
    assert.equal(forbidden.status, 401)

    const badCreate = await req<ErrorBody>('/api/admin/pages', {
      method: 'POST',
      token: ADMIN_TOKEN,
      body: { title: 'Bad Slug', slug: 'Not A Slug' },
    })
    assert.equal(badCreate.status, 400)

    await new Promise((resolve) => setTimeout(resolve, 150))

    const facultyCreate = await req<DataEnvelope<{ id: number }>>('/api/admin/faculty', {
      method: 'POST',
      token: ADMIN_TOKEN,
      body: { name: 'Dr. SSE', department: 'Media Studies' },
    })
    assert.equal(facultyCreate.status, 201, errorMessage(facultyCreate.body))

    const settled = await readSse(
      reader,
      (text) => text.includes('event: content') && text.includes('"entity":"faculty"'),
      'faculty content event after rejected mutations',
    )
    const contentEvents = settled.split('event: content').slice(1)
    assert.equal(
      contentEvents.length,
      1,
      'rejected mutations (401/400) must not broadcast content events',
    )
    assert.ok(contentEvents[0].includes('"entity":"faculty"'))

    await req(`/api/admin/faculty/${facultyCreate.body.data.id}`, {
      method: 'DELETE',
      token: ADMIN_TOKEN,
    })
  } finally {
    controller.abort()
    try {
      await reader.read()
    } catch {
      // stream aborted, nothing to drain
    }
  }

  await req('/api/admin/pages', {
    method: 'POST',
    token: ADMIN_TOKEN,
    body: { title: 'After Close', slug: 'after-close', published: true },
  })
  await new Promise((resolve) => setTimeout(resolve, 100))
})

test('rate limiting kicks in when enabled and resets after the window', async () => {
  resetRateLimitBuckets()
  process.env.RATE_LIMIT_DISABLED = 'false'
  process.env.RATE_LIMIT_MAX = '3'
  process.env.RATE_LIMIT_WINDOW_MS = '2000'
  try {
    let last: { status: number; headers: Headers } | undefined
    for (let i = 0; i < 5; i += 1) {
      last = await req('/api/health')
    }
    assert.equal(last!.status, 429)
    const retryAfter = last!.headers.get('retry-after')
    assert.ok(retryAfter, '429 responses must include Retry-After')
    assert.ok(Number(retryAfter) >= 1)

    const tooMany = await req<ErrorBody>('/api/streams')
    assert.equal(tooMany.status, 429)
    assert.equal(tooMany.body.error.code, 'rate_limited')

    await new Promise((resolve) => setTimeout(resolve, 2200))
    const recovered = await req('/api/health')
    assert.equal(recovered.status, 200, 'requests succeed again after the window expires')
  } finally {
    process.env.RATE_LIMIT_DISABLED = 'true'
    delete process.env.RATE_LIMIT_MAX
    delete process.env.RATE_LIMIT_WINDOW_MS
    resetRateLimitBuckets()
  }
})

test('admin brute-force attempts are limited separately', async () => {
  resetRateLimitBuckets()
  process.env.RATE_LIMIT_DISABLED = 'false'
  process.env.AUTH_RATE_LIMIT_MAX = '3'
  process.env.AUTH_RATE_LIMIT_WINDOW_MS = '2000'
  try {
    let last: { status: number } | undefined
    for (let i = 0; i < 5; i += 1) {
      last = await req('/api/admin/whoami', { token: 'guess-token' })
    }
    assert.equal(last!.status, 429)

    const stillLimited = await req<ErrorBody>('/api/admin/stats', { token: ADMIN_TOKEN })
    assert.equal(stillLimited.status, 429, 'auth scope blocks further admin requests while limited')

    const publicOk = await req('/api/health')
    assert.equal(publicOk.status, 200, 'public endpoints are unaffected by the auth limiter')

    await new Promise((resolve) => setTimeout(resolve, 2200))
    const recovered = await req<DataEnvelope<{ role: string }>>('/api/admin/whoami', {
      token: ADMIN_TOKEN,
    })
    assert.equal(recovered.status, 200)
    assert.equal(recovered.body.data.role, 'admin')
  } finally {
    process.env.RATE_LIMIT_DISABLED = 'true'
    delete process.env.AUTH_RATE_LIMIT_MAX
    delete process.env.AUTH_RATE_LIMIT_WINDOW_MS
    resetRateLimitBuckets()
  }
})

test('rate limiting keys on X-Forwarded-For when TRUST_PROXY is set', async () => {
  resetRateLimitBuckets()
  process.env.RATE_LIMIT_DISABLED = 'false'
  process.env.RATE_LIMIT_MAX = '1'
  process.env.RATE_LIMIT_WINDOW_MS = '60000'
  try {
    const first = await req('/api/health', { headers: { 'X-Forwarded-For': '203.0.113.7' } })
    assert.equal(first.status, 200)

    const second = await req('/api/health', { headers: { 'X-Forwarded-For': '203.0.113.7' } })
    assert.equal(second.status, 429, 'same forwarded IP is limited')

    const otherClient = await req('/api/health', { headers: { 'X-Forwarded-For': '203.0.113.8' } })
    assert.equal(otherClient.status, 200, 'different forwarded IP has its own bucket')
  } finally {
    process.env.RATE_LIMIT_DISABLED = 'true'
    delete process.env.RATE_LIMIT_MAX
    delete process.env.RATE_LIMIT_WINDOW_MS
    resetRateLimitBuckets()
  }
})

test('admin mutations broadcast nothing on GET and events carry no payload data', async () => {
  const controller = new AbortController()
  const response = await fetch(`${baseUrl}/api/events`, { signal: controller.signal })
  assert.equal(response.status, 200)
  const reader = response.body!.getReader()
  try {
    await readSse(reader, (text) => text.includes('event: ready'), 'ready event')
    await req<DataEnvelope<unknown>>('/api/admin/stats', { token: ADMIN_TOKEN })
    await req<ListEnvelope<unknown>>('/api/admin/pages', { token: ADMIN_TOKEN })
    await new Promise((resolve) => setTimeout(resolve, 150))
    await req<DataEnvelope<{ id: number }>>('/api/admin/pages', {
      method: 'POST',
      token: ADMIN_TOKEN,
      body: { title: 'Event Payload Page', slug: 'event-payload-page', published: true },
    })
    const text = await readSse(
      reader,
      (t) => t.includes('event: content'),
      'content event after GETs',
    )
    const eventBlocks = text.split('\n\n').filter((chunk) => chunk.includes('event: content'))
    assert.equal(eventBlocks.length, 1)
    assert.ok(eventBlocks[0].includes('"entity":"pages"'))
    assert.ok(!eventBlocks[0].includes('event-payload-page'), 'SSE payloads must not carry content data')
    assert.ok(!eventBlocks[0].includes('title'), 'SSE payloads must not carry content data')
  } finally {
    controller.abort()
    try {
      await reader.read()
    } catch {
      // stream aborted, nothing to drain
    }
  }
})
