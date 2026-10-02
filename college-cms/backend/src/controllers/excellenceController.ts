import type { Request, Response } from 'express'
import { z } from 'zod'
import { created, list as respondList, metaFor, noContent, ok } from '../http/respond.js'
import { listQuery, pathId, reorderBody } from '../http/query.js'
import { atLeastOneField, trimmed } from '../http/schemas.js'
import { parse } from '../http/validate.js'
import * as excellenceService from '../services/excellenceService.js'

const createSchema = z.strictObject({
  title: trimmed(255),
  category: z.string().trim().max(100).default(''),
  description: z.string().max(50000).default(''),
  year: z.number().int().min(1900).max(2100),
  domainId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
})

const updateSchema = z
  .strictObject({
    title: trimmed(255).optional(),
    category: z.string().trim().max(100).optional(),
    description: z.string().max(50000).optional(),
    year: z.number().int().min(1900).max(2100).optional(),
    domainId: z.number().int().positive().nullable().optional(),
    sortOrder: z.number().int().min(0).max(100000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: atLeastOneField })

const publicListQuery = listQuery({
  sorts: ['sortOrder', 'year', 'title', 'updatedAt'] as const,
  defaultSort: 'sortOrder',
}).extend({
  domainId: z.coerce.number().int().positive().optional(),
  domain: z.string().trim().max(100).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
})

const adminListQuery = publicListQuery

export async function list(req: Request, res: Response) {
  const { domain, ...query } = parse(publicListQuery, req.query)
  const { rows, total } = await excellenceService.listExcellence({
    ...query,
    domainSlug: domain,
    visibleOnly: true,
  })
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function getById(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  ok(res, await excellenceService.getExcellenceRow(id, true))
}

export async function adminList(req: Request, res: Response) {
  const { domain, ...query } = parse(adminListQuery, req.query)
  const { rows, total } = await excellenceService.listExcellence({
    ...query,
    domainSlug: domain,
    visibleOnly: false,
  })
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function adminGet(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  ok(res, await excellenceService.getExcellenceRow(id, false))
}

export async function adminCreate(req: Request, res: Response) {
  const body = parse(createSchema, req.body)
  created(res, await excellenceService.createExcellenceItem(body))
}

export async function adminUpdate(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(updateSchema, req.body)
  ok(res, await excellenceService.updateExcellenceItem(id, body))
}

export async function adminRemove(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  await excellenceService.deleteExcellenceItem(id)
  noContent(res)
}

export async function adminReorder(req: Request, res: Response) {
  const body = parse(reorderBody, req.body)
  ok(res, await excellenceService.reorderExcellence(body.ids))
}
