import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  facultyDetails,
  facultyMembers,
  streams,
  type FacultyDetail,
  type FacultyMember,
} from '../db/schema.js'
import { HttpError } from '../middleware/error.js'
import { likePattern } from './like.js'
import type { SortOrder } from './pageService.js'

export const facultySortColumns = {
  name: facultyMembers.name,
  title: facultyMembers.title,
  department: facultyMembers.department,
}

export type FacultySort = keyof typeof facultySortColumns

export interface FacultyListOptions {
  page: number
  limit: number
  q?: string
  streamId?: number
  streamSlug?: string
  visibleOnly?: boolean
  sort: FacultySort
  order: SortOrder
}

export interface FacultyInput {
  name: string
  title: string
  department: string
  email: string
  bio: string
  streamId?: number | null
  photoMediaId?: number | null
}

export type FacultyUpdate = Partial<FacultyInput>

const streamVisible = sql`(${facultyMembers.streamId} is null or exists (
  select 1 from streams where streams.id = ${facultyMembers.streamId} and ${streams.isActive}
))`

export async function listFaculty(options: FacultyListOptions): Promise<{ rows: FacultyMember[]; total: number }> {
  const conditions: SQL[] = []
  if (options.visibleOnly) conditions.push(streamVisible)
  if (options.streamId !== undefined) conditions.push(eq(facultyMembers.streamId, options.streamId))
  if (options.streamSlug !== undefined && options.streamSlug !== '') {
    conditions.push(
      sql`exists (select 1 from streams where streams.id = ${facultyMembers.streamId} and streams.slug = ${options.streamSlug})`,
    )
  }
  if (options.q) {
    const pattern = likePattern(options.q)
    const search = or(
      ilike(facultyMembers.name, pattern),
      ilike(facultyMembers.department, pattern),
      ilike(facultyMembers.title, pattern),
      ilike(facultyMembers.email, pattern),
    )
    if (search) conditions.push(search)
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined
  const column = facultySortColumns[options.sort]
  const direction = options.order === 'desc' ? desc : asc
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(facultyMembers)
      .where(where)
      .orderBy(direction(column), asc(facultyMembers.id))
      .limit(options.limit)
      .offset((options.page - 1) * options.limit),
    db.select({ total: sql<number>`count(*)::int` }).from(facultyMembers).where(where),
  ])
  return { rows, total: totals[0]?.total ?? 0 }
}

export async function getFacultyRow(id: number, visibleOnly: boolean): Promise<FacultyMember> {
  const conditions: SQL[] = [eq(facultyMembers.id, id)]
  if (visibleOnly) conditions.push(streamVisible)
  const [member] = await db.select().from(facultyMembers).where(and(...conditions)).limit(1)
  if (!member) throw new HttpError(404, `Faculty ${id} not found`, 'not_found')
  return member
}

export async function createFaculty(input: FacultyInput): Promise<FacultyMember> {
  const [member] = await db
    .insert(facultyMembers)
    .values({
      name: input.name,
      title: input.title,
      department: input.department,
      email: input.email,
      bio: input.bio,
      streamId: input.streamId ?? null,
      photoMediaId: input.photoMediaId ?? null,
    })
    .returning()
  return member
}

export async function updateFaculty(id: number, patch: FacultyUpdate): Promise<FacultyMember> {
  await getFacultyRow(id, false)
  const [member] = await db.update(facultyMembers).set(patch).where(eq(facultyMembers.id, id)).returning()
  return member
}

export async function deleteFaculty(id: number): Promise<void> {
  await getFacultyRow(id, false)
  await db.delete(facultyMembers).where(eq(facultyMembers.id, id))
}

async function getStreamId(streamId: number): Promise<void> {
  const [stream] = await db.select({ id: streams.id }).from(streams).where(eq(streams.id, streamId)).limit(1)
  if (!stream) throw new HttpError(404, `Stream ${streamId} not found`, 'not_found')
}

export async function getFacultyDetails(streamId: number): Promise<{ streamId: number; intro: FacultyDetail['intro'] | null }> {
  await getStreamId(streamId)
  const [details] = await db
    .select()
    .from(facultyDetails)
    .where(eq(facultyDetails.streamId, streamId))
    .limit(1)
  return { streamId, intro: details?.intro ?? null }
}

export async function upsertFacultyDetails(
  streamId: number,
  intro: FacultyDetail['intro'],
): Promise<{ streamId: number; intro: FacultyDetail['intro'] }> {
  await getStreamId(streamId)
  const [details] = await db
    .insert(facultyDetails)
    .values({ streamId, intro })
    .onConflictDoUpdate({ target: facultyDetails.streamId, set: { intro } })
    .returning()
  return { streamId: details.streamId, intro: details.intro }
}
