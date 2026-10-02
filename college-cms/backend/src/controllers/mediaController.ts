import type { Request, Response } from 'express'
import { z } from 'zod'
import { created, list as respondList, metaFor, noContent, ok } from '../http/respond.js'
import { listQuery, pathId } from '../http/query.js'
import { atLeastOneField, imageUrl, optionalImageUrl } from '../http/schemas.js'
import { parse } from '../http/validate.js'
import * as mediaService from '../services/mediaService.js'

const statusEnum = z.enum(['referenced', 'ready', 'missing'])
const nullableMax = (max: number) => z.string().trim().max(max).nullable().optional()
const nullableInt = z.number().int().min(0).max(100000).nullable().optional()

const createSchema = z.strictObject({
  url: imageUrl,
  fileName: nullableMax(255),
  mimeType: nullableMax(100),
  width: nullableInt,
  height: nullableInt,
  altText: z.string().trim().max(5000).default(''),
  status: statusEnum.default('ready'),
  sourceSystem: z.string().trim().max(32).default('manual'),
  sourceRef: z.string().trim().max(500).default(''),
})

const updateSchema = z
  .strictObject({
    url: optionalImageUrl.nullable().optional(),
    fileName: nullableMax(255),
    mimeType: nullableMax(100),
    width: nullableInt,
    height: nullableInt,
    altText: z.string().trim().max(5000).optional(),
    status: statusEnum.optional(),
    sourceSystem: z.string().trim().max(32).optional(),
    sourceRef: z.string().trim().max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: atLeastOneField })

const adminListQuery = listQuery({
  sorts: ['createdAt', 'updatedAt', 'fileName', 'status', 'altText'] as const,
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
}).extend({ status: statusEnum.optional() })

export async function adminList(req: Request, res: Response) {
  const query = parse(adminListQuery, req.query)
  const { rows, total } = await mediaService.listMedia(query)
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function adminGet(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  ok(res, await mediaService.getMediaRow(id))
}

export async function adminCreate(req: Request, res: Response) {
  const body = parse(createSchema, req.body)
  created(res, await mediaService.createMedia(body))
}

export async function adminUpdate(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(updateSchema, req.body)
  ok(res, await mediaService.updateMedia(id, body))
}

export async function adminRemove(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  await mediaService.deleteMedia(id)
  noContent(res)
}
