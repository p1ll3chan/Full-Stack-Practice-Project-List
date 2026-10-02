import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  facultyMembers,
  media,
  pageBlockGalleryItems,
  pageBlocks,
  streams,
  type Media,
  type NewMedia,
} from '../db/schema.js'
import { HttpError } from '../middleware/error.js'
import { likePattern } from './like.js'

export type MediaSort = 'createdAt' | 'updatedAt' | 'fileName' | 'status' | 'altText'
export type MediaStatusFilter = 'referenced' | 'ready' | 'missing'

export interface MediaListOptions {
  page: number
  limit: number
  q?: string
  status?: MediaStatusFilter
  sort: MediaSort
  order: 'asc' | 'desc'
}

export interface MediaInput {
  url: string
  fileName?: string | null
  mimeType?: string | null
  width?: number | null
  height?: number | null
  altText?: string
  status?: MediaStatusFilter
  sourceSystem?: string
  sourceRef?: string
}

export type MediaUpdate = Partial<Omit<MediaInput, 'url'>> & { url?: string | null }

export const mediaSortColumns = {
  createdAt: media.createdAt,
  updatedAt: media.updatedAt,
  fileName: media.fileName,
  status: media.status,
  altText: media.altText,
}

export async function listMedia(options: MediaListOptions): Promise<{ rows: Media[]; total: number }> {
  const conditions: SQL[] = []
  if (options.status !== undefined) conditions.push(eq(media.status, options.status))
  if (options.q) {
    const pattern = likePattern(options.q)
    const search = or(
      ilike(media.fileName, pattern),
      ilike(media.url, pattern),
      ilike(media.altText, pattern),
    )
    if (search) conditions.push(search)
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined
  const column = mediaSortColumns[options.sort]
  const direction = options.order === 'desc' ? desc : asc
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(media)
      .where(where)
      .orderBy(direction(column), asc(media.id))
      .limit(options.limit)
      .offset((options.page - 1) * options.limit),
    db.select({ total: sql<number>`count(*)::int` }).from(media).where(where),
  ])
  return { rows, total: totals[0]?.total ?? 0 }
}

export async function getMediaRow(id: number): Promise<Media> {
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1)
  if (!row) throw new HttpError(404, `Media ${id} not found`, 'not_found')
  return row
}

async function assertSourceAvailable(sourceSystem: string, sourceRef: string, excludeId?: number): Promise<void> {
  if (sourceRef === '') return
  const [existing] = await db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.sourceSystem, sourceSystem), eq(media.sourceRef, sourceRef)))
    .limit(1)
  if (existing && existing.id !== excludeId) {
    throw new HttpError(409, 'That media reference already exists', 'conflict')
  }
}

export async function createMedia(input: MediaInput): Promise<Media> {
  const sourceSystem = input.sourceSystem ?? 'manual'
  const sourceRef = input.sourceRef ?? ''
  await assertSourceAvailable(sourceSystem, sourceRef)
  const [row] = await db
    .insert(media)
    .values({
      url: input.url,
      fileName: input.fileName ?? null,
      mimeType: input.mimeType ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      altText: input.altText ?? '',
      status: input.status ?? 'ready',
      sourceSystem,
      sourceRef,
    })
    .returning()
  return row
}

export async function updateMedia(id: number, patch: MediaUpdate): Promise<Media> {
  const existing = await getMediaRow(id)
  const sourceSystem = patch.sourceSystem ?? existing.sourceSystem
  const sourceRef = patch.sourceRef ?? existing.sourceRef
  if (sourceSystem !== existing.sourceSystem || sourceRef !== existing.sourceRef) {
    await assertSourceAvailable(sourceSystem, sourceRef, id)
  }
  const values: Partial<NewMedia> = {}
  if (patch.url !== undefined) values.url = patch.url
  if (patch.fileName !== undefined) values.fileName = patch.fileName
  if (patch.mimeType !== undefined) values.mimeType = patch.mimeType
  if (patch.width !== undefined) values.width = patch.width
  if (patch.height !== undefined) values.height = patch.height
  if (patch.altText !== undefined) values.altText = patch.altText
  if (patch.status !== undefined) values.status = patch.status
  if (patch.sourceSystem !== undefined) values.sourceSystem = patch.sourceSystem
  if (patch.sourceRef !== undefined) values.sourceRef = patch.sourceRef
  if (Object.keys(values).length === 0) return existing
  const [row] = await db.update(media).set(values).where(eq(media.id, id)).returning()
  return row
}

export async function deleteMedia(id: number): Promise<void> {
  await getMediaRow(id)
  const [inBlock] = await db
    .select({ id: pageBlocks.id })
    .from(pageBlocks)
    .where(eq(pageBlocks.mediaId, id))
    .limit(1)
  if (inBlock) throw new HttpError(409, 'Media is still used by a page block', 'conflict')
  const [inGallery] = await db
    .select({ id: pageBlockGalleryItems.id })
    .from(pageBlockGalleryItems)
    .where(eq(pageBlockGalleryItems.mediaId, id))
    .limit(1)
  if (inGallery) throw new HttpError(409, 'Media is still used by a gallery', 'conflict')
  const [inStream] = await db
    .select({ id: streams.id })
    .from(streams)
    .where(eq(streams.imageMediaId, id))
    .limit(1)
  if (inStream) throw new HttpError(409, 'Media is still used as a department image', 'conflict')
  const [inFaculty] = await db
    .select({ id: facultyMembers.id })
    .from(facultyMembers)
    .where(eq(facultyMembers.photoMediaId, id))
    .limit(1)
  if (inFaculty) throw new HttpError(409, 'Media is still used as a faculty photo', 'conflict')
  await db.delete(media).where(eq(media.id, id))
}
