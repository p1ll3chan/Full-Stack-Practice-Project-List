import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  media,
  pageBlockGalleryItems,
  pageBlocks,
  pages,
  type NewPage,
  type Page,
  type PageBlock,
  type PageBlockContent,
  type PageSection,
  type PageBlockType,
} from '../db/schema.js'
import { HttpError } from '../middleware/error.js'
import { likePattern } from './like.js'
import { assertPermutation } from './reorder.js'

export type SortOrder = 'asc' | 'desc'

export const pageSortColumns = {
  title: pages.title,
  slug: pages.slug,
  section: pages.section,
  createdAt: pages.createdAt,
  updatedAt: pages.updatedAt,
}

export type PageSort = keyof typeof pageSortColumns

export type PageListItem = Omit<Page, 'blocks'>

export interface PageListOptions {
  page: number
  limit: number
  q?: string
  section?: PageSection
  published?: boolean
  sort: PageSort
  order: SortOrder
}

export interface BlockInput {
  type: PageBlockType
  content: PageBlockContent
  published?: boolean
  mediaId?: number
  items?: { mediaId: number; caption?: string }[]
}

export interface BlockView {
  id: number
  pageId: number
  type: PageBlockType
  position: number
  content: PageBlockContent
  mediaId: number | null
  published: boolean
  media: {
    id: number
    url: string | null
    altText: string
    fileName: string | null
    mimeType: string | null
    width: number | null
    height: number | null
  } | null
  items?: { id: number; mediaId: number; position: number; caption: string }[]
}

export interface PageInput {
  title: string
  slug: string
  section: PageSection
  published: boolean
  blocks: BlockInput[]
}

type PageUpdate = Partial<Pick<PageInput, 'title' | 'slug' | 'section' | 'published' | 'blocks'>>

function toListItem(row: Page): PageListItem {
  const { blocks: _legacyBlocks, ...item } = row
  return item
}

export async function listPages(options: PageListOptions): Promise<{ rows: PageListItem[]; total: number }> {
  const conditions: SQL[] = []
  if (options.published !== undefined) conditions.push(eq(pages.published, options.published))
  if (options.section !== undefined) conditions.push(eq(pages.section, options.section))
  if (options.q) {
    const pattern = likePattern(options.q)
    const search = or(ilike(pages.title, pattern), ilike(pages.slug, pattern))
    if (search) conditions.push(search)
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined
  const column = pageSortColumns[options.sort]
  const direction = options.order === 'desc' ? desc : asc
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(pages)
      .where(where)
      .orderBy(direction(column), asc(pages.id))
      .limit(options.limit)
      .offset((options.page - 1) * options.limit),
    db.select({ total: sql<number>`count(*)::int` }).from(pages).where(where),
  ])
  return { rows: rows.map(toListItem), total: totals[0]?.total ?? 0 }
}

async function fetchBlockViews(
  pageId: number,
  options: { publishedOnly?: boolean; blockId?: number },
): Promise<BlockView[]> {
  const conditions: SQL[] = [eq(pageBlocks.pageId, pageId)]
  if (options.publishedOnly) conditions.push(eq(pageBlocks.published, true))
  if (options.blockId !== undefined) conditions.push(eq(pageBlocks.id, options.blockId))

  const rows = await db
    .select({
      block: pageBlocks,
      media: {
        id: media.id,
        url: media.url,
        altText: media.altText,
        fileName: media.fileName,
        mimeType: media.mimeType,
        width: media.width,
        height: media.height,
      },
    })
    .from(pageBlocks)
    .leftJoin(media, eq(pageBlocks.mediaId, media.id))
    .where(and(...conditions))
    .orderBy(asc(pageBlocks.position), asc(pageBlocks.id))

  const galleryIds = rows.filter((row) => row.block.type === 'gallery').map((row) => row.block.id)
  const galleryItems =
    galleryIds.length > 0
      ? await db
          .select()
          .from(pageBlockGalleryItems)
          .where(inArray(pageBlockGalleryItems.blockId, galleryIds))
          .orderBy(asc(pageBlockGalleryItems.position), asc(pageBlockGalleryItems.id))
      : []

  return rows.map((row) => {
    const view: BlockView = {
      id: row.block.id,
      pageId: row.block.pageId,
      type: row.block.type as PageBlockType,
      position: row.block.position,
      content: row.block.content,
      mediaId: row.block.mediaId,
      published: row.block.published,
      media: row.media && row.media.id !== null ? row.media : null,
    }
    if (row.block.type === 'gallery') {
      view.items = galleryItems
        .filter((item) => item.blockId === row.block.id)
        .map((item) => ({
          id: item.id,
          mediaId: item.mediaId,
          position: item.position,
          caption: item.caption,
        }))
    }
    return view
  })
}

async function getPageRow(id: number): Promise<Page> {
  const [page] = await db.select().from(pages).where(eq(pages.id, id)).limit(1)
  if (!page) throw new HttpError(404, `Page ${id} not found`, 'not_found')
  return page
}

async function assertSlugAvailable(slug: string, excludeId?: number): Promise<void> {
  const [existing] = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, slug)).limit(1)
  if (existing && existing.id !== excludeId) {
    throw new HttpError(409, `A page with the slug "${slug}" already exists`, 'conflict')
  }
}

async function insertBlocks(tx: DbTransaction, pageId: number, blocks: BlockInput[]): Promise<void> {
  let position = 0
  for (const input of blocks) {
    const [row] = await tx
      .insert(pageBlocks)
      .values({
        pageId,
        type: input.type,
        position,
        content: input.content,
        mediaId: input.type === 'image' ? (input.mediaId ?? null) : null,
        published: input.published ?? true,
      })
      .returning()
    if (input.type === 'gallery' && input.items && input.items.length > 0) {
      await tx.insert(pageBlockGalleryItems).values(
        input.items.map((item, index) => ({
          blockId: row.id,
          mediaId: item.mediaId,
          caption: item.caption ?? '',
          position: index * 10,
        })),
      )
    }
    position += 10
  }
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export type PageWithBlocks = Omit<Page, 'blocks'> & { blocks: BlockView[] }

export async function getPublicPageBySlug(slug: string): Promise<PageWithBlocks> {
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.published, true)))
    .limit(1)
  if (!page) throw new HttpError(404, `Page "${slug}" not found`, 'not_found')
  const blocks = await fetchBlockViews(page.id, { publishedOnly: true })
  return { ...page, blocks }
}

export async function getAdminPage(id: number): Promise<PageWithBlocks> {
  const page = await getPageRow(id)
  const blocks = await fetchBlockViews(page.id, {})
  return { ...page, blocks }
}

export async function createPage(input: PageInput): Promise<Page> {
  await assertSlugAvailable(input.slug)
  return db.transaction(async (tx) => {
    const [page] = await tx
      .insert(pages)
      .values({
        title: input.title,
        slug: input.slug,
        section: input.section,
        published: input.published,
        blocks: [],
      })
      .returning()
    await insertBlocks(tx, page.id, input.blocks)
    return page
  })
}

export async function updatePage(id: number, patch: PageUpdate): Promise<Page> {
  const existing = await getPageRow(id)
  if (patch.slug !== undefined && patch.slug !== existing.slug) {
    await assertSlugAvailable(patch.slug, id)
  }
  return db.transaction(async (tx) => {
    const values: Partial<NewPage> = {}
    if (patch.title !== undefined) values.title = patch.title
    if (patch.slug !== undefined) values.slug = patch.slug
    if (patch.section !== undefined) values.section = patch.section
    if (patch.published !== undefined) values.published = patch.published
    let page = existing
    if (Object.keys(values).length > 0) {
      const [updated] = await tx.update(pages).set(values).where(eq(pages.id, id)).returning()
      page = updated
    }
    if (patch.blocks !== undefined) {
      await tx.delete(pageBlocks).where(eq(pageBlocks.pageId, id))
      await insertBlocks(tx, id, patch.blocks)
    }
    return page
  })
}

export async function deletePage(id: number): Promise<void> {
  await getPageRow(id)
  await db.delete(pages).where(eq(pages.id, id))
}

export async function setPagePublished(id: number, published: boolean): Promise<Page> {
  await getPageRow(id)
  const [page] = await db.update(pages).set({ published }).where(eq(pages.id, id)).returning()
  return page
}

export async function addBlock(pageId: number, input: BlockInput): Promise<BlockView> {
  await getPageRow(pageId)
  const block = await db.transaction(async (tx) => {
    const [{ maximum }] = await tx
      .select({ maximum: sql<number>`coalesce(max(${pageBlocks.position}), 0)` })
      .from(pageBlocks)
      .where(eq(pageBlocks.pageId, pageId))
    const [row] = await tx
      .insert(pageBlocks)
      .values({
        pageId,
        type: input.type,
        position: maximum + 10,
        content: input.content,
        mediaId: input.type === 'image' ? (input.mediaId ?? null) : null,
        published: input.published ?? true,
      })
      .returning()
    if (input.type === 'gallery' && input.items && input.items.length > 0) {
      await tx.insert(pageBlockGalleryItems).values(
        input.items.map((item, index) => ({
          blockId: row.id,
          mediaId: item.mediaId,
          caption: item.caption ?? '',
          position: index * 10,
        })),
      )
    }
    return row
  })
  const [view] = await fetchBlockViews(pageId, { blockId: block.id })
  return view
}

async function getBlockRow(pageId: number, blockId: number): Promise<PageBlock> {
  const [row] = await db
    .select()
    .from(pageBlocks)
    .where(and(eq(pageBlocks.id, blockId), eq(pageBlocks.pageId, pageId)))
    .limit(1)
  if (!row) throw new HttpError(404, `Block ${blockId} not found`, 'not_found')
  return row
}

export async function updateBlock(pageId: number, blockId: number, input: BlockInput): Promise<BlockView> {
  const existing = await getBlockRow(pageId, blockId)
  await db.transaction(async (tx) => {
    await tx
      .update(pageBlocks)
      .set({
        type: input.type,
        content: input.content,
        mediaId: input.type === 'image' ? (input.mediaId ?? null) : null,
        published: input.published ?? existing.published,
      })
      .where(and(eq(pageBlocks.id, blockId), eq(pageBlocks.pageId, pageId)))
    if (input.type === 'gallery' && input.items !== undefined) {
      await tx.delete(pageBlockGalleryItems).where(eq(pageBlockGalleryItems.blockId, blockId))
      if (input.items.length > 0) {
        await tx.insert(pageBlockGalleryItems).values(
          input.items.map((item, index) => ({
            blockId,
            mediaId: item.mediaId,
            caption: item.caption ?? '',
            position: index * 10,
          })),
        )
      }
    }
  })
  const [view] = await fetchBlockViews(pageId, { blockId })
  return view
}

export async function deleteBlock(pageId: number, blockId: number): Promise<void> {
  await getBlockRow(pageId, blockId)
  await db.delete(pageBlocks).where(and(eq(pageBlocks.id, blockId), eq(pageBlocks.pageId, pageId)))
}

export async function reorderBlocks(pageId: number, ids: number[]): Promise<BlockView[]> {
  const rows = await db.select({ id: pageBlocks.id }).from(pageBlocks).where(eq(pageBlocks.pageId, pageId))
  assertPermutation(ids, rows.map((row) => row.id), 'block')
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx
        .update(pageBlocks)
        .set({ position: index * 10 })
        .where(and(eq(pageBlocks.id, id), eq(pageBlocks.pageId, pageId)))
    }
  })
  return fetchBlockViews(pageId, {})
}
