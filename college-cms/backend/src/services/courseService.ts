import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  courses,
  degreeLevelStreams,
  type Course,
  type NewCourse,
} from '../db/schema.js'
import { HttpError } from '../middleware/error.js'
import { likePattern } from './like.js'
import { assertPermutation } from './reorder.js'
import type { SortOrder } from './pageService.js'

export const courseSortColumns = {
  code: courses.code,
  title: courses.title,
  sortOrder: courses.sortOrder,
  credits: courses.credits,
  createdAt: courses.createdAt,
  updatedAt: courses.updatedAt,
}

export type CourseSort = keyof typeof courseSortColumns

export interface CourseListOptions {
  page: number
  limit: number
  q?: string
  active?: boolean
  streamId?: number
  streamSlug?: string
  degreeLevelId?: number
  sort: CourseSort
  order: SortOrder
}

export interface CourseInput {
  code?: string | null
  slug?: string | null
  title: string
  description: string
  credits: number | null
  department: string
  streamId?: number | null
  degreeLevelId?: number | null
  sortOrder: number
  isActive: boolean
}

export type CourseUpdate = Partial<CourseInput>

export async function listCourses(options: CourseListOptions): Promise<{ rows: Course[]; total: number }> {
  const conditions: SQL[] = []
  if (options.active !== undefined) conditions.push(eq(courses.isActive, options.active))
  if (options.streamId !== undefined) conditions.push(eq(courses.streamId, options.streamId))
  if (options.degreeLevelId !== undefined) conditions.push(eq(courses.degreeLevelId, options.degreeLevelId))
  if (options.streamSlug !== undefined && options.streamSlug !== '') {
    conditions.push(
      sql`exists (select 1 from streams where streams.id = ${courses.streamId} and streams.slug = ${options.streamSlug})`,
    )
  }
  if (options.q) {
    const pattern = likePattern(options.q)
    const search = or(
      ilike(courses.title, pattern),
      ilike(courses.code, pattern),
      ilike(courses.description, pattern),
      ilike(courses.department, pattern),
    )
    if (search) conditions.push(search)
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined
  const column = courseSortColumns[options.sort]
  const direction = options.order === 'desc' ? desc : asc
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(courses)
      .where(where)
      .orderBy(direction(column), asc(courses.id))
      .limit(options.limit)
      .offset((options.page - 1) * options.limit),
    db.select({ total: sql<number>`count(*)::int` }).from(courses).where(where),
  ])
  return { rows, total: totals[0]?.total ?? 0 }
}

export async function getCourseRow(id: number, activeOnly: boolean): Promise<Course> {
  const conditions: SQL[] = [eq(courses.id, id)]
  if (activeOnly) conditions.push(eq(courses.isActive, true))
  const [course] = await db.select().from(courses).where(and(...conditions)).limit(1)
  if (!course) throw new HttpError(404, `Course ${id} not found`, 'not_found')
  return course
}

async function assertCodeAvailable(code: string, excludeId?: number): Promise<void> {
  const [existing] = await db.select({ id: courses.id }).from(courses).where(eq(courses.code, code)).limit(1)
  if (existing && existing.id !== excludeId) {
    throw new HttpError(409, `A course with the code "${code}" already exists`, 'conflict')
  }
}

async function assertSlugAvailable(slug: string, excludeId?: number): Promise<void> {
  const [existing] = await db.select({ id: courses.id }).from(courses).where(eq(courses.slug, slug)).limit(1)
  if (existing && existing.id !== excludeId) {
    throw new HttpError(409, `A course with the slug "${slug}" already exists`, 'conflict')
  }
}

async function assertStreamLevelPair(streamId: number | null | undefined, degreeLevelId: number | null | undefined): Promise<void> {
  const hasStream = streamId !== null && streamId !== undefined
  const hasLevel = degreeLevelId !== null && degreeLevelId !== undefined
  if (!hasStream && !hasLevel) return
  if (!hasStream || !hasLevel) {
    throw new HttpError(
      400,
      'streamId and degreeLevelId must be provided together',
      'validation_error',
      [
        { path: 'streamId', message: 'streamId and degreeLevelId must both be set or both be null' },
        { path: 'degreeLevelId', message: 'streamId and degreeLevelId must both be set or both be null' },
      ],
    )
  }
  const [link] = await db
    .select({ streamId: degreeLevelStreams.streamId })
    .from(degreeLevelStreams)
    .where(and(eq(degreeLevelStreams.streamId, streamId), eq(degreeLevelStreams.degreeLevelId, degreeLevelId)))
    .limit(1)
  if (!link) {
    throw new HttpError(
      400,
      'That degree level is not offered for the selected stream',
      'invalid_reference',
      [{ path: 'degreeLevelId', message: 'no degree_level_streams link for this pair' }],
    )
  }
}

export async function createCourse(input: CourseInput): Promise<Course> {
  if (input.code) await assertCodeAvailable(input.code)
  if (input.slug) await assertSlugAvailable(input.slug)
  await assertStreamLevelPair(input.streamId, input.degreeLevelId)
  const [course] = await db
    .insert(courses)
    .values({
      code: input.code ?? null,
      slug: input.slug ?? null,
      title: input.title,
      description: input.description,
      credits: input.credits,
      department: input.department,
      streamId: input.streamId ?? null,
      degreeLevelId: input.degreeLevelId ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    })
    .returning()
  return course
}

export async function updateCourse(id: number, patch: CourseUpdate): Promise<Course> {
  const existing = await getCourseRow(id, false)
  if (patch.code !== undefined && patch.code !== existing.code && patch.code !== null) {
    await assertCodeAvailable(patch.code, id)
  }
  if (patch.slug !== undefined && patch.slug !== existing.slug && patch.slug !== null) {
    await assertSlugAvailable(patch.slug, id)
  }
  const effectiveStream = patch.streamId !== undefined ? patch.streamId : existing.streamId
  const effectiveLevel = patch.degreeLevelId !== undefined ? patch.degreeLevelId : existing.degreeLevelId
  await assertStreamLevelPair(effectiveStream, effectiveLevel)
  const values: Partial<NewCourse> = { ...patch }
  if (patch.streamId !== undefined || patch.degreeLevelId !== undefined) {
    values.streamId = effectiveStream
    values.degreeLevelId = effectiveLevel
  }
  const [course] = await db.update(courses).set(values).where(eq(courses.id, id)).returning()
  return course
}

export async function deleteCourse(id: number): Promise<void> {
  await getCourseRow(id, false)
  await db.delete(courses).where(eq(courses.id, id))
}

export async function setCourseActive(id: number, isActive: boolean): Promise<Course> {
  await getCourseRow(id, false)
  const [course] = await db.update(courses).set({ isActive }).where(eq(courses.id, id)).returning()
  return course
}

export async function reorderCourses(ids: number[]): Promise<Course[]> {
  const rows = await db.select({ id: courses.id }).from(courses)
  assertPermutation(ids, rows.map((row) => row.id), 'course')
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(courses).set({ sortOrder: index * 10 }).where(eq(courses.id, id))
    }
  })
  return db.select().from(courses).orderBy(asc(courses.sortOrder), asc(courses.id))
}
