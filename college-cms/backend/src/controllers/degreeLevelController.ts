import type { Request, Response } from 'express'
import { z } from 'zod'
import { created, list as respondList, metaFor, noContent, ok } from '../http/respond.js'
import { boolish, listQuery, pathId, reorderBody } from '../http/query.js'
import { atLeastOneField, trimmed } from '../http/schemas.js'
import { parse } from '../http/validate.js'
import * as degreeLevelService from '../services/degreeLevelService.js'

const pathCode = z.object({ code: z.string().min(1).max(20) })

const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'must be an alphanumeric code')

const createSchema = z.strictObject({
  code: codeSchema,
  name: trimmed(100),
  levelGroup: z.enum(degreeLevelService.degreeLevelGroups).default('undergraduate'),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
})

const updateSchema = z
  .strictObject({
    code: codeSchema.optional(),
    name: trimmed(100).optional(),
    levelGroup: z.enum(degreeLevelService.degreeLevelGroups).optional(),
    sortOrder: z.number().int().min(0).max(100000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: atLeastOneField })

const activeSchema = z.strictObject({ isActive: z.boolean() })

const publicListQuery = listQuery({
  sorts: ['sortOrder', 'name', 'code', 'levelGroup'] as const,
  defaultSort: 'sortOrder',
}).extend({ levelGroup: z.enum(degreeLevelService.degreeLevelGroups).optional() })

const adminListQuery = publicListQuery.extend({ active: boolish.optional() })

export async function list(req: Request, res: Response) {
  const query = parse(publicListQuery, req.query)
  const { rows, total } = await degreeLevelService.listDegreeLevels({ ...query, active: true })
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function getByCode(req: Request, res: Response) {
  const { code } = parse(pathCode, req.params)
  ok(res, await degreeLevelService.getDegreeLevelByCode(code, true))
}

export async function adminList(req: Request, res: Response) {
  const query = parse(adminListQuery, req.query)
  const { rows, total } = await degreeLevelService.listDegreeLevels(query)
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function adminGet(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  ok(res, await degreeLevelService.getDegreeLevelWithStreams(id, false))
}

export async function adminCreate(req: Request, res: Response) {
  const body = parse(createSchema, req.body)
  created(res, await degreeLevelService.createDegreeLevel(body))
}

export async function adminUpdate(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(updateSchema, req.body)
  ok(res, await degreeLevelService.updateDegreeLevel(id, body))
}

export async function adminRemove(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  await degreeLevelService.deleteDegreeLevel(id)
  noContent(res)
}

export async function adminSetActive(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(activeSchema, req.body)
  ok(res, await degreeLevelService.setDegreeLevelActive(id, body.isActive))
}

export async function adminReorder(req: Request, res: Response) {
  const body = parse(reorderBody, req.body)
  ok(res, await degreeLevelService.reorderDegreeLevels(body.ids))
}
