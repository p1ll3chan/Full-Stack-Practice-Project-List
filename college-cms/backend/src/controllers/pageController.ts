import type { Request, Response } from 'express'
import { z } from 'zod'
import { pageSections } from '../db/schema.js'
import { created, list as respondList, metaFor, noContent, ok } from '../http/respond.js'
import { boolish, listQuery, pathId, reorderBody } from '../http/query.js'
import { atLeastOneField, optionalTrimmed, richDocSchema, slugSchema, trimmed } from '../http/schemas.js'
import { parse } from '../http/validate.js'
import * as pageService from '../services/pageService.js'

const pathSlug = z.object({ slug: z.string().min(1).max(255) })

const blockPublished = z.boolean().optional()

const blockSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('heading'),
    content: z.strictObject({
      text: trimmed(2000),
      level: z.number().int().min(1).max(6).default(2),
    }),
    published: blockPublished,
  }),
  z.strictObject({
    type: z.literal('paragraph'),
    content: z.strictObject({
      text: z.string().max(200000),
      rich: richDocSchema.optional(),
    }),
    published: blockPublished,
  }),
  z.strictObject({
    type: z.literal('list'),
    content: z.strictObject({
      ordered: z.boolean().default(false),
      items: z.array(z.string().max(2000)).max(500),
    }),
    published: blockPublished,
  }),
  z.strictObject({
    type: z.literal('image'),
    content: z.strictObject({
      alt: z.string().max(1000).default(''),
      caption: z.string().max(1000).default(''),
    }),
    mediaId: z.number().int().positive(),
    published: blockPublished,
  }),
  z.strictObject({
    type: z.literal('gallery'),
    content: z.strictObject({ caption: z.string().max(1000).default('') }),
    published: blockPublished,
    items: z
      .array(
        z.object({
          mediaId: z.number().int().positive(),
          caption: optionalTrimmed(500),
        }),
      )
      .max(100)
      .optional(),
  }),
])

const createSchema = z.strictObject({
  title: trimmed(255),
  slug: slugSchema,
  section: z.enum(pageSections).default('general'),
  published: z.boolean().default(false),
  blocks: z.array(blockSchema).max(200).default([]),
})

const updateSchema = z
  .strictObject({
    title: trimmed(255).optional(),
    slug: slugSchema.optional(),
    section: z.enum(pageSections).optional(),
    published: z.boolean().optional(),
    blocks: z.array(blockSchema).max(200).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: atLeastOneField })

const publishSchema = z.strictObject({ published: z.boolean() })

const blockPath = z.object({
  id: z.coerce.number().int().min(1),
  blockId: z.coerce.number().int().min(1),
})

const publicListQuery = listQuery({
  sorts: ['title', 'slug', 'section', 'createdAt', 'updatedAt'] as const,
  defaultSort: 'title',
}).extend({ section: z.enum(pageSections).optional() })

const adminListQuery = publicListQuery.extend({ published: boolish.optional() })

export async function list(req: Request, res: Response) {
  const query = parse(publicListQuery, req.query)
  const { rows, total } = await pageService.listPages({ ...query, published: true })
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function getBySlug(req: Request, res: Response) {
  const { slug } = parse(pathSlug, req.params)
  ok(res, await pageService.getPublicPageBySlug(slug))
}

export async function adminList(req: Request, res: Response) {
  const query = parse(adminListQuery, req.query)
  const { rows, total } = await pageService.listPages(query)
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function adminGet(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  ok(res, await pageService.getAdminPage(id))
}

export async function adminCreate(req: Request, res: Response) {
  const body = parse(createSchema, req.body)
  const page = await pageService.createPage(body)
  created(res, await pageService.getAdminPage(page.id))
}

export async function adminUpdate(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(updateSchema, req.body)
  await pageService.updatePage(id, body)
  ok(res, await pageService.getAdminPage(id))
}

export async function adminRemove(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  await pageService.deletePage(id)
  noContent(res)
}

export async function adminPublish(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(publishSchema, req.body)
  ok(res, await pageService.setPagePublished(id, body.published))
}

export async function adminReorderBlocks(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(reorderBody, req.body)
  ok(res, await pageService.reorderBlocks(id, body.ids))
}

export async function adminAddBlock(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(blockSchema, req.body)
  created(res, await pageService.addBlock(id, body))
}

export async function adminUpdateBlock(req: Request, res: Response) {
  const { id, blockId } = parse(blockPath, req.params)
  const body = parse(blockSchema, req.body)
  ok(res, await pageService.updateBlock(id, blockId, body))
}

export async function adminRemoveBlock(req: Request, res: Response) {
  const { id, blockId } = parse(blockPath, req.params)
  await pageService.deleteBlock(id, blockId)
  noContent(res)
}
