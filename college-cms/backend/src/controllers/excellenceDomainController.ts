import type { Request, Response } from 'express'
import { z } from 'zod'
import { created, list as respondList, metaFor, noContent, ok } from '../http/respond.js'
import { boolish, listQuery, pathId, reorderBody } from '../http/query.js'
import { atLeastOneField, trimmed } from '../http/schemas.js'
import { parse } from '../http/validate.js'
import * as excellenceService from '../services/excellenceService.js'

const pathSlug = z.object({ slug: z.string().min(1).max(100) })

const domainSlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug (a-z, 0-9, hyphens)')

const createSchema = z.strictObject({
  slug: domainSlugSchema,
  name: trimmed(100),
  description: z.string().max(50000).default(''),
  color: z.string().trim().max(16).default(''),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
})

const updateSchema = z
  .strictObject({
    slug: domainSlugSchema.optional(),
    name: trimmed(100).optional(),
    description: z.string().max(50000).optional(),
    color: z.string().trim().max(16).optional(),
    sortOrder: z.number().int().min(0).max(100000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: atLeastOneField })

const activeSchema = z.strictObject({ isActive: z.boolean() })

const publicListQuery = listQuery({
  sorts: ['sortOrder', 'name', 'slug'] as const,
  defaultSort: 'sortOrder',
})

const adminListQuery = publicListQuery.extend({ active: boolish.optional() })

export async function list(req: Request, res: Response) {
  const query = parse(publicListQuery, req.query)
  const { rows, total } = await excellenceService.listExcellenceDomains({ ...query, active: true })
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function getBySlug(req: Request, res: Response) {
  const { slug } = parse(pathSlug, req.params)
  ok(res, await excellenceService.getExcellenceDomainBySlug(slug, true))
}

export async function adminList(req: Request, res: Response) {
  const query = parse(adminListQuery, req.query)
  const { rows, total } = await excellenceService.listExcellenceDomains(query)
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function adminGet(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  ok(res, await excellenceService.getExcellenceDomainRow(id))
}

export async function adminCreate(req: Request, res: Response) {
  const body = parse(createSchema, req.body)
  created(res, await excellenceService.createExcellenceDomain(body))
}

export async function adminUpdate(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(updateSchema, req.body)
  ok(res, await excellenceService.updateExcellenceDomain(id, body))
}

export async function adminRemove(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  await excellenceService.deleteExcellenceDomain(id)
  noContent(res)
}

export async function adminSetActive(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(activeSchema, req.body)
  ok(res, await excellenceService.setExcellenceDomainActive(id, body.isActive))
}

export async function adminReorder(req: Request, res: Response) {
  const body = parse(reorderBody, req.body)
  ok(res, await excellenceService.reorderExcellenceDomains(body.ids))
}
