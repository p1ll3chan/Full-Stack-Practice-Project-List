import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  academicDetails,
  courses,
  degreeLevelStreams,
  degreeLevels,
  facultyMembers,
  streams,
  type AcademicDetail,
  type DegreeLevel,
  type Stream,
} from '../db/schema.js'
import { HttpError } from '../middleware/error.js'
import { likePattern } from './like.js'
import { assertPermutation } from './reorder.js'
import type { SortOrder } from './pageService.js'

export const streamSortColumns = {
  sortOrder: streams.sortOrder,
  name: streams.name,
  slug: streams.slug,
  category: streams.category,
  createdAt: streams.createdAt,
  updatedAt: streams.updatedAt,
}

export type StreamSort = keyof typeof streamSortColumns

export interface StreamListOptions {
  page: number
  limit: number
  q?: string
  category?: string
  active?: boolean
  sort: StreamSort
  order: SortOrder
}

export interface StreamInput {
  slug: string
  name: string
  tagline: string
  shortDescription: string
  category: string
  iconSvg: string
  imageMediaId?: number | null
  sortOrder: number
  isActive: boolean
}

export type StreamUpdate = Partial<StreamInput>

export type StreamWithLevels = Stream & { degreeLevels: DegreeLevel[] }

async function degreeLevelsForStream(streamId: number, activeOnly: boolean): Promise<DegreeLevel[]> {
  const rows = await db
    .select({ level: degreeLevels })
    .from(degreeLevelStreams)
    .innerJoin(degreeLevels, eq(degreeLevelStreams.degreeLevelId, degreeLevels.id))
    .where(eq(degreeLevelStreams.streamId, streamId))
    .orderBy(asc(degreeLevels.sortOrder), asc(degreeLevels.id))
  return rows.map((row) => row.level).filter((level) => !activeOnly || level.isActive)
}

export async function listStreams(options: StreamListOptions): Promise<{ rows: Stream[]; total: number }> {
  const conditions: SQL[] = []
  if (options.active !== undefined) conditions.push(eq(streams.isActive, options.active))
  if (options.category !== undefined && options.category !== '') {
    conditions.push(eq(streams.category, options.category))
  }
  if (options.q) {
    const pattern = likePattern(options.q)
    const search = or(
      ilike(streams.name, pattern),
      ilike(streams.slug, pattern),
      ilike(streams.tagline, pattern),
    )
    if (search) conditions.push(search)
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined
  const column = streamSortColumns[options.sort]
  const direction = options.order === 'desc' ? desc : asc
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(streams)
      .where(where)
      .orderBy(direction(column), asc(streams.id))
      .limit(options.limit)
      .offset((options.page - 1) * options.limit),
    db.select({ total: sql<number>`count(*)::int` }).from(streams).where(where),
  ])
  return { rows, total: totals[0]?.total ?? 0 }
}

export async function getStreamRow(id: number): Promise<Stream> {
  const [stream] = await db.select().from(streams).where(eq(streams.id, id)).limit(1)
  if (!stream) throw new HttpError(404, `Stream ${id} not found`, 'not_found')
  return stream
}

export async function getStreamBySlug(slug: string, activeOnly: boolean): Promise<StreamWithLevels> {
  const conditions: SQL[] = [eq(streams.slug, slug)]
  if (activeOnly) conditions.push(eq(streams.isActive, true))
  const [stream] = await db.select().from(streams).where(and(...conditions)).limit(1)
  if (!stream) throw new HttpError(404, `Stream "${slug}" not found`, 'not_found')
  return { ...stream, degreeLevels: await degreeLevelsForStream(stream.id, activeOnly) }
}

export async function getStreamWithLevels(id: number, activeOnly: boolean): Promise<StreamWithLevels> {
  const stream = await getStreamRow(id)
  return { ...stream, degreeLevels: await degreeLevelsForStream(stream.id, activeOnly) }
}

async function assertSlugAvailable(slug: string, excludeId?: number): Promise<void> {
  const [existing] = await db.select({ id: streams.id }).from(streams).where(eq(streams.slug, slug)).limit(1)
  if (existing && existing.id !== excludeId) {
    throw new HttpError(409, `A stream with the slug "${slug}" already exists`, 'conflict')
  }
}

export async function createStream(input: StreamInput): Promise<Stream> {
  await assertSlugAvailable(input.slug)
  const [stream] = await db
    .insert(streams)
    .values({
      slug: input.slug,
      name: input.name,
      tagline: input.tagline,
      shortDescription: input.shortDescription,
      category: input.category,
      iconSvg: input.iconSvg,
      imageMediaId: input.imageMediaId ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    })
    .returning()
  return stream
}

export async function updateStream(id: number, patch: StreamUpdate): Promise<Stream> {
  const existing = await getStreamRow(id)
  if (patch.slug !== undefined && patch.slug !== existing.slug) {
    await assertSlugAvailable(patch.slug, id)
  }
  const [stream] = await db.update(streams).set(patch).where(eq(streams.id, id)).returning()
  return stream
}

export async function deleteStream(id: number): Promise<void> {
  await getStreamRow(id)
  const [courseCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(courses)
    .where(eq(courses.streamId, id))
  if (courseCount.total > 0) {
    throw new HttpError(409, 'Stream is still referenced by courses', 'conflict')
  }
  const [facultyCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(facultyMembers)
    .where(eq(facultyMembers.streamId, id))
  if (facultyCount.total > 0) {
    throw new HttpError(409, 'Stream is still referenced by faculty members', 'conflict')
  }
  await db.delete(streams).where(eq(streams.id, id))
}

export async function setStreamActive(id: number, isActive: boolean): Promise<Stream> {
  await getStreamRow(id)
  const [stream] = await db.update(streams).set({ isActive }).where(eq(streams.id, id)).returning()
  return stream
}

export async function reorderStreams(ids: number[]): Promise<Stream[]> {
  const rows = await db.select({ id: streams.id }).from(streams)
  assertPermutation(ids, rows.map((row) => row.id), 'stream')
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(streams).set({ sortOrder: index * 10 }).where(eq(streams.id, id))
    }
  })
  const ordered = await db
    .select()
    .from(streams)
    .orderBy(asc(streams.sortOrder), asc(streams.id))
  return ordered
}

export async function getStreamDetails(id: number): Promise<{ stream: Stream; details: AcademicDetail | null }> {
  const stream = await getStreamRow(id)
  const [details] = await db
    .select()
    .from(academicDetails)
    .where(eq(academicDetails.streamId, id))
    .limit(1)
  return { stream, details: details ?? null }
}

export async function upsertStreamDetails(
  id: number,
  input: { overview?: AcademicDetail['overview']; programsHtml?: string },
): Promise<AcademicDetail> {
  await getStreamRow(id)
  const payload = {
    ...(input.overview !== undefined ? { overview: input.overview } : {}),
    ...(input.programsHtml !== undefined ? { programsHtml: input.programsHtml } : {}),
  }
  const [details] = await db
    .insert(academicDetails)
    .values({ streamId: id, ...payload })
    .onConflictDoUpdate({ target: academicDetails.streamId, set: payload })
    .returning()
  return details
}

export async function replaceStreamDegreeLevels(id: number, levelIds: number[]): Promise<StreamWithLevels> {
  await getStreamRow(id)
  const requested = [...new Set(levelIds)]
  const existingLinks = await db
    .select({ degreeLevelId: degreeLevelStreams.degreeLevelId })
    .from(degreeLevelStreams)
    .where(eq(degreeLevelStreams.streamId, id))
  const currentIds = existingLinks.map((link) => link.degreeLevelId)
  const toAdd = requested.filter((levelId) => !currentIds.includes(levelId))
  const toRemove = currentIds.filter((levelId) => !requested.includes(levelId))
  if (toRemove.length > 0) {
    const [dependent] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.streamId, id), inArray(courses.degreeLevelId, toRemove)))
      .limit(1)
    if (dependent) {
      throw new HttpError(409, 'That degree level is still linked to courses for this department', 'conflict')
    }
  }
  if (toAdd.length > 0) {
    const rows = await db
      .select({ id: degreeLevels.id })
      .from(degreeLevels)
      .where(inArray(degreeLevels.id, toAdd))
    const found = rows.map((row) => row.id)
    const missing = toAdd.filter((levelId) => !found.includes(levelId))
    if (missing.length > 0) {
      throw new HttpError(
        400,
        'One or more degree levels do not exist',
        'invalid_reference',
        missing.map((levelId) => ({ path: 'ids', message: `degree level ${levelId} does not exist` })),
      )
    }
  }
  await db.transaction(async (tx) => {
    if (toRemove.length > 0) {
      await tx
        .delete(degreeLevelStreams)
        .where(
          and(
            eq(degreeLevelStreams.streamId, id),
            inArray(degreeLevelStreams.degreeLevelId, toRemove),
          ),
        )
    }
    if (toAdd.length > 0) {
      await tx
        .insert(degreeLevelStreams)
        .values(toAdd.map((levelId) => ({ streamId: id, degreeLevelId: levelId, sortOrder: 0 })))
    }
  })
  return getStreamWithLevels(id, false)
}
