import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  courses,
  degreeLevelStreams,
  degreeLevels,
  streams,
  type DegreeLevel,
  type Stream,
} from '../db/schema.js'
import { HttpError } from '../middleware/error.js'
import { likePattern } from './like.js'
import { assertPermutation } from './reorder.js'
import type { SortOrder } from './pageService.js'

export const degreeLevelGroups = [
  'undergraduate',
  'postgraduate',
  'doctoral',
  'vocational',
  'diploma',
] as const

export const degreeLevelSortColumns = {
  sortOrder: degreeLevels.sortOrder,
  name: degreeLevels.name,
  code: degreeLevels.code,
  levelGroup: degreeLevels.levelGroup,
}

export type DegreeLevelSort = keyof typeof degreeLevelSortColumns

export interface DegreeLevelListOptions {
  page: number
  limit: number
  q?: string
  active?: boolean
  levelGroup?: string
  sort: DegreeLevelSort
  order: SortOrder
}

export interface DegreeLevelInput {
  code: string
  name: string
  levelGroup: string
  sortOrder: number
  isActive: boolean
}

export type DegreeLevelUpdate = Partial<DegreeLevelInput>

export type DegreeLevelWithStreams = DegreeLevel & { streams: Stream[] }

async function streamsForLevel(levelId: number, activeOnly: boolean): Promise<Stream[]> {
  const rows = await db
    .select({ stream: streams })
    .from(degreeLevelStreams)
    .innerJoin(streams, eq(degreeLevelStreams.streamId, streams.id))
    .where(eq(degreeLevelStreams.degreeLevelId, levelId))
    .orderBy(asc(streams.sortOrder), asc(streams.id))
  return rows.map((row) => row.stream).filter((stream) => !activeOnly || stream.isActive)
}

export async function listDegreeLevels(
  options: DegreeLevelListOptions,
): Promise<{ rows: DegreeLevel[]; total: number }> {
  const conditions: SQL[] = []
  if (options.active !== undefined) conditions.push(eq(degreeLevels.isActive, options.active))
  if (options.levelGroup !== undefined && options.levelGroup !== '') {
    conditions.push(eq(degreeLevels.levelGroup, options.levelGroup))
  }
  if (options.q) {
    const pattern = likePattern(options.q)
    const search = or(ilike(degreeLevels.name, pattern), ilike(degreeLevels.code, pattern))
    if (search) conditions.push(search)
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined
  const column = degreeLevelSortColumns[options.sort]
  const direction = options.order === 'desc' ? desc : asc
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(degreeLevels)
      .where(where)
      .orderBy(direction(column), asc(degreeLevels.id))
      .limit(options.limit)
      .offset((options.page - 1) * options.limit),
    db.select({ total: sql<number>`count(*)::int` }).from(degreeLevels).where(where),
  ])
  return { rows, total: totals[0]?.total ?? 0 }
}

export async function getDegreeLevelRow(id: number): Promise<DegreeLevel> {
  const [level] = await db.select().from(degreeLevels).where(eq(degreeLevels.id, id)).limit(1)
  if (!level) throw new HttpError(404, `Degree level ${id} not found`, 'not_found')
  return level
}

export async function getDegreeLevelByCode(code: string, activeOnly: boolean): Promise<DegreeLevelWithStreams> {
  const conditions: SQL[] = [eq(degreeLevels.code, code)]
  if (activeOnly) conditions.push(eq(degreeLevels.isActive, true))
  const [level] = await db.select().from(degreeLevels).where(and(...conditions)).limit(1)
  if (!level) throw new HttpError(404, `Degree level "${code}" not found`, 'not_found')
  return { ...level, streams: await streamsForLevel(level.id, activeOnly) }
}

export async function getDegreeLevelWithStreams(id: number, activeOnly: boolean): Promise<DegreeLevelWithStreams> {
  const level = await getDegreeLevelRow(id)
  return { ...level, streams: await streamsForLevel(level.id, activeOnly) }
}

async function assertCodeAvailable(code: string, excludeId?: number): Promise<void> {
  const [existing] = await db
    .select({ id: degreeLevels.id })
    .from(degreeLevels)
    .where(eq(degreeLevels.code, code))
    .limit(1)
  if (existing && existing.id !== excludeId) {
    throw new HttpError(409, `A degree level with the code "${code}" already exists`, 'conflict')
  }
}

export async function createDegreeLevel(input: DegreeLevelInput): Promise<DegreeLevel> {
  await assertCodeAvailable(input.code)
  const [level] = await db
    .insert(degreeLevels)
    .values({
      code: input.code,
      name: input.name,
      levelGroup: input.levelGroup,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    })
    .returning()
  return level
}

export async function updateDegreeLevel(id: number, patch: DegreeLevelUpdate): Promise<DegreeLevel> {
  const existing = await getDegreeLevelRow(id)
  if (patch.code !== undefined && patch.code !== existing.code) {
    await assertCodeAvailable(patch.code, id)
  }
  const [level] = await db.update(degreeLevels).set(patch).where(eq(degreeLevels.id, id)).returning()
  return level
}

export async function deleteDegreeLevel(id: number): Promise<void> {
  await getDegreeLevelRow(id)
  const [courseCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(courses)
    .where(eq(courses.degreeLevelId, id))
  if (courseCount.total > 0) {
    throw new HttpError(409, 'Degree level is still referenced by courses', 'conflict')
  }
  await db.delete(degreeLevels).where(eq(degreeLevels.id, id))
}

export async function setDegreeLevelActive(id: number, isActive: boolean): Promise<DegreeLevel> {
  await getDegreeLevelRow(id)
  const [level] = await db.update(degreeLevels).set({ isActive }).where(eq(degreeLevels.id, id)).returning()
  return level
}

export async function reorderDegreeLevels(ids: number[]): Promise<DegreeLevel[]> {
  const rows = await db.select({ id: degreeLevels.id }).from(degreeLevels)
  assertPermutation(ids, rows.map((row) => row.id), 'degree level')
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(degreeLevels).set({ sortOrder: index * 10 }).where(eq(degreeLevels.id, id))
    }
  })
  return db.select().from(degreeLevels).orderBy(asc(degreeLevels.sortOrder), asc(degreeLevels.id))
}
