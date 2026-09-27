import { asc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { pages, type NewPage, type Page } from '../db/schema.js'
import { HttpError } from '../middleware/error.js'

export async function listPages(): Promise<Page[]> {
  return db.select().from(pages).orderBy(asc(pages.id))
}

export async function getPageBySlug(slug: string): Promise<Page> {
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1)
  if (!page) throw new HttpError(404, `Page "${slug}" not found`)
  return page
}

export async function getPageById(id: number): Promise<Page> {
  const [page] = await db.select().from(pages).where(eq(pages.id, id)).limit(1)
  if (!page) throw new HttpError(404, `Page ${id} not found`)
  return page
}

export async function createPage(input: NewPage): Promise<Page> {
  const [page] = await db.insert(pages).values(input).returning()
  return page
}

export async function updatePage(id: number, input: Partial<NewPage>): Promise<Page> {
  await getPageById(id)
  const [page] = await db.update(pages).set(input).where(eq(pages.id, id)).returning()
  return page
}

export async function deletePage(id: number): Promise<void> {
  await getPageById(id)
  await db.delete(pages).where(eq(pages.id, id))
}
