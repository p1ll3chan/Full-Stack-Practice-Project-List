import type { Request, Response } from 'express'
import { z } from 'zod'
import { created, list as respondList, metaFor, noContent, ok } from '../http/respond.js'
import { boolish, listQuery, pathId, reorderBody } from '../http/query.js'
import { atLeastOneField, richDocSchema, slugSchema, trimmed } from '../http/schemas.js'
import { parse } from '../http/validate.js'
import * as streamService from '../services/streamService.js'
import * as facultyService from '../services/facultyService.js'

const pathSlug = z.object({ slug: z.string().min(1).max(255) })

const createSchema = z.strictObject({
  slug: slugSchema,
  name: trimmed(255),
  tagline: z.string().trim().max(255).default(''),
  shortDescription: z.string().trim().max(500).default(''),
  category: z.string().trim().max(100).default(''),
  iconSvg: z.string().max(200000).default(''),
  imageMediaId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
})

const updateSchema = z
  .strictObject({
    slug: slugSchema.optional(),
    name: trimmed(255).optional(),
    tagline: z.string().trim().max(255).optional(),
    shortDescription: z.string().trim().max(500).optional(),
    category: z.string().trim().max(100).optional(),
    iconSvg: z.string().max(200000).optional(),
    imageMediaId: z.number().int().positive().nullable().optional(),
    sortOrder: z.number().int().min(0).max(100000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: atLeastOneField })

const activeSchema = z.strictObject({ isActive: z.boolean() })

const degreeLevelIdsSchema = z.strictObject({
  ids: z.array(z.number().int().positive()).min(0).max(50),
})

const detailsSchema = z
  .strictObject({
    overview: richDocSchema.optional(),
    programsHtml: z.string().max(500000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: atLeastOneField })

const facultyIntroSchema = z.strictObject({ intro: richDocSchema })

const publicListQuery = listQuery({
  sorts: ['sortOrder', 'name', 'slug', 'category', 'createdAt', 'updatedAt'] as const,
  defaultSort: 'sortOrder',
}).extend({ category: z.string().trim().max(100).optional() })

const adminListQuery = publicListQuery.extend({ active: boolish.optional() })

export async function list(req: Request, res: Response) {
  const query = parse(publicListQuery, req.query)
  const { rows, total } = await streamService.listStreams({ ...query, active: true })
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function getBySlug(req: Request, res: Response) {
  const { slug } = parse(pathSlug, req.params)
  ok(res, await streamService.getStreamBySlug(slug, true))
}

export async function adminList(req: Request, res: Response) {
  const query = parse(adminListQuery, req.query)
  const { rows, total } = await streamService.listStreams(query)
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function adminGet(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  ok(res, await streamService.getStreamWithLevels(id, false))
}

export async function adminCreate(req: Request, res: Response) {
  const body = parse(createSchema, req.body)
  created(res, await streamService.createStream(body))
}

export async function adminUpdate(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(updateSchema, req.body)
  ok(res, await streamService.updateStream(id, body))
}

export async function adminRemove(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  await streamService.deleteStream(id)
  noContent(res)
}

export async function adminSetActive(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(activeSchema, req.body)
  ok(res, await streamService.setStreamActive(id, body.isActive))
}

export async function adminReorder(req: Request, res: Response) {
  const body = parse(reorderBody, req.body)
  ok(res, await streamService.reorderStreams(body.ids))
}

export async function adminPutDegreeLevels(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(degreeLevelIdsSchema, req.body)
  ok(res, await streamService.replaceStreamDegreeLevels(id, body.ids))
}

export async function adminGetDetails(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  ok(res, await streamService.getStreamDetails(id))
}

export async function adminPutDetails(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(detailsSchema, req.body)
  ok(res, await streamService.upsertStreamDetails(id, body))
}

export async function adminGetFacultyDetails(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  ok(res, await facultyService.getFacultyDetails(id))
}

export async function adminPutFacultyDetails(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(facultyIntroSchema, req.body)
  ok(res, await facultyService.upsertFacultyDetails(id, body.intro))
}
