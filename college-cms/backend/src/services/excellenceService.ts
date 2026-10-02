import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  excellence,
  excellenceDomains,
  type ExcellenceDomain,
  type ExcellenceItem,
} from '../db/schema.js'
import { HttpError } from '../middleware/error.js'
import { likePattern } from './like.js'
import { assertPermutation } from './reorder.js'
import type { SortOrder } from './pageService.js'

export const excellenceSortColumns = {
  sortOrder: excellence.sortOrder,
  year: excellence.year,
  title: excellence.title,
  updatedAt: excellence.updatedAt,
}

export type ExcellenceSort = keyof typeof excellenceSortColumns

export const excellenceDomainSortColumns = {
  sortOrder: excellenceDomains.sortOrder,
  name: excellenceDomains.name,
  slug: excellenceDomains.slug,
}

export type ExcellenceDomainSort = keyof typeof excellenceDomainSortColumns

export interface ExcellenceListOptions {
  page: number
  limit: number
  q?: string
  domainId?: number
  domainSlug?: string
  year?: number
  visibleOnly?: boolean
  sort: ExcellenceSort
  order: SortOrder
}

export interface ExcellenceDomainListOptions {
  page: number
  limit: number
  q?: string
  active?: boolean
  sort: ExcellenceDomainSort
  order: SortOrder
}

export interface ExcellenceInput {
  title: string
  category: string
  description: string
  year: number
  domainId?: number | null
  sortOrder: number
}

export type ExcellenceUpdate = Partial<ExcellenceInput>

export interface ExcellenceDomainInput {
  slug: string
  name: string
  description: string
  color: string
  sortOrder: number
  isActive: boolean
}

export type ExcellenceDomainUpdate = Partial<ExcellenceDomainInput>

const domainVisible = sql`(${excellence.domainId} is null or exists (
  select 1 from excellence_domains where excellence_domains.id = ${excellence.domainId} and ${excellenceDomains.isActive}
))`

export async function listExcellence(
  options: ExcellenceListOptions,
): Promise<{ rows: ExcellenceItem[]; total: number }> {
  const conditions: SQL[] = []
  if (options.visibleOnly) conditions.push(domainVisible)
  if (options.domainId !== undefined) conditions.push(eq(excellence.domainId, options.domainId))
  if (options.domainSlug !== undefined && options.domainSlug !== '') {
    conditions.push(
      sql`exists (select 1 from excellence_domains where excellence_domains.id = ${excellence.domainId} and excellence_domains.slug = ${options.domainSlug})`,
    )
  }
  if (options.year !== undefined) conditions.push(eq(excellence.year, options.year))
  if (options.q) {
    const pattern = likePattern(options.q)
    const search = or(
      ilike(excellence.title, pattern),
      ilike(excellence.category, pattern),
      ilike(excellence.description, pattern),
    )
    if (search) conditions.push(search)
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined
  const column = excellenceSortColumns[options.sort]
  const direction = options.order === 'desc' ? desc : asc
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(excellence)
      .where(where)
      .orderBy(direction(column), asc(excellence.id))
      .limit(options.limit)
      .offset((options.page - 1) * options.limit),
    db.select({ total: sql<number>`count(*)::int` }).from(excellence).where(where),
  ])
  return { rows, total: totals[0]?.total ?? 0 }
}

export async function getExcellenceRow(id: number, visibleOnly: boolean): Promise<ExcellenceItem> {
  const conditions: SQL[] = [eq(excellence.id, id)]
  if (visibleOnly) conditions.push(domainVisible)
  const [item] = await db.select().from(excellence).where(and(...conditions)).limit(1)
  if (!item) throw new HttpError(404, `Excellence item ${id} not found`, 'not_found')
  return item
}

async function assertDomainExists(domainId: number): Promise<void> {
  const [domain] = await db
    .select({ id: excellenceDomains.id })
    .from(excellenceDomains)
    .where(eq(excellenceDomains.id, domainId))
    .limit(1)
  if (!domain) throw new HttpError(404, `Excellence domain ${domainId} not found`, 'not_found')
}

export async function createExcellenceItem(input: ExcellenceInput): Promise<ExcellenceItem> {
  if (input.domainId !== null && input.domainId !== undefined) await assertDomainExists(input.domainId)
  const [item] = await db
    .insert(excellence)
    .values({
      title: input.title,
      category: input.category,
      description: input.description,
      year: input.year,
      domainId: input.domainId ?? null,
      sortOrder: input.sortOrder,
    })
    .returning()
  return item
}

export async function updateExcellenceItem(id: number, patch: ExcellenceUpdate): Promise<ExcellenceItem> {
  await getExcellenceRow(id, false)
  if (patch.domainId !== null && patch.domainId !== undefined) await assertDomainExists(patch.domainId)
  const [item] = await db.update(excellence).set(patch).where(eq(excellence.id, id)).returning()
  return item
}

export async function deleteExcellenceItem(id: number): Promise<void> {
  await getExcellenceRow(id, false)
  await db.delete(excellence).where(eq(excellence.id, id))
}

export async function reorderExcellence(ids: number[]): Promise<ExcellenceItem[]> {
  const rows = await db.select({ id: excellence.id }).from(excellence)
  assertPermutation(ids, rows.map((row) => row.id), 'excellence item')
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(excellence).set({ sortOrder: index * 10 }).where(eq(excellence.id, id))
    }
  })
  return db.select().from(excellence).orderBy(asc(excellence.sortOrder), asc(excellence.id))
}

export async function listExcellenceDomains(
  options: ExcellenceDomainListOptions,
): Promise<{ rows: ExcellenceDomain[]; total: number }> {
  const conditions: SQL[] = []
  if (options.active !== undefined) conditions.push(eq(excellenceDomains.isActive, options.active))
  if (options.q) {
    const pattern = likePattern(options.q)
    const search = or(ilike(excellenceDomains.name, pattern), ilike(excellenceDomains.slug, pattern))
    if (search) conditions.push(search)
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined
  const column = excellenceDomainSortColumns[options.sort]
  const direction = options.order === 'desc' ? desc : asc
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(excellenceDomains)
      .where(where)
      .orderBy(direction(column), asc(excellenceDomains.id))
      .limit(options.limit)
      .offset((options.page - 1) * options.limit),
    db.select({ total: sql<number>`count(*)::int` }).from(excellenceDomains).where(where),
  ])
  return { rows, total: totals[0]?.total ?? 0 }
}

export async function getExcellenceDomainRow(id: number): Promise<ExcellenceDomain> {
  const [domain] = await db.select().from(excellenceDomains).where(eq(excellenceDomains.id, id)).limit(1)
  if (!domain) throw new HttpError(404, `Excellence domain ${id} not found`, 'not_found')
  return domain
}

export async function getExcellenceDomainBySlug(slug: string, activeOnly: boolean): Promise<ExcellenceDomain> {
  const conditions: SQL[] = [eq(excellenceDomains.slug, slug)]
  if (activeOnly) conditions.push(eq(excellenceDomains.isActive, true))
  const [domain] = await db.select().from(excellenceDomains).where(and(...conditions)).limit(1)
  if (!domain) throw new HttpError(404, `Excellence domain "${slug}" not found`, 'not_found')
  return domain
}

async function assertSlugAvailable(slug: string, excludeId?: number): Promise<void> {
  const [existing] = await db
    .select({ id: excellenceDomains.id })
    .from(excellenceDomains)
    .where(eq(excellenceDomains.slug, slug))
    .limit(1)
  if (existing && existing.id !== excludeId) {
    throw new HttpError(409, `A domain with the slug "${slug}" already exists`, 'conflict')
  }
}

export async function createExcellenceDomain(input: ExcellenceDomainInput): Promise<ExcellenceDomain> {
  await assertSlugAvailable(input.slug)
  const [domain] = await db
    .insert(excellenceDomains)
    .values({
      slug: input.slug,
      name: input.name,
      description: input.description,
      color: input.color,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    })
    .returning()
  return domain
}

export async function updateExcellenceDomain(
  id: number,
  patch: ExcellenceDomainUpdate,
): Promise<ExcellenceDomain> {
  const existing = await getExcellenceDomainRow(id)
  if (patch.slug !== undefined && patch.slug !== existing.slug) {
    await assertSlugAvailable(patch.slug, id)
  }
  const [domain] = await db.update(excellenceDomains).set(patch).where(eq(excellenceDomains.id, id)).returning()
  return domain
}

export async function deleteExcellenceDomain(id: number): Promise<void> {
  await getExcellenceDomainRow(id)
  const [itemCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(excellence)
    .where(eq(excellence.domainId, id))
  if (itemCount.total > 0) {
    throw new HttpError(409, 'Domain is still referenced by excellence items', 'conflict')
  }
  await db.delete(excellenceDomains).where(eq(excellenceDomains.id, id))
}

export async function setExcellenceDomainActive(id: number, isActive: boolean): Promise<ExcellenceDomain> {
  await getExcellenceDomainRow(id)
  const [domain] = await db
    .update(excellenceDomains)
    .set({ isActive })
    .where(eq(excellenceDomains.id, id))
    .returning()
  return domain
}

export async function reorderExcellenceDomains(ids: number[]): Promise<ExcellenceDomain[]> {
  const rows = await db.select({ id: excellenceDomains.id }).from(excellenceDomains)
  assertPermutation(ids, rows.map((row) => row.id), 'excellence domain')
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(excellenceDomains).set({ sortOrder: index * 10 }).where(eq(excellenceDomains.id, id))
    }
  })
  return db.select().from(excellenceDomains).orderBy(asc(excellenceDomains.sortOrder), asc(excellenceDomains.id))
}
