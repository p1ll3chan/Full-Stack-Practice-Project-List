import type { Request, Response } from 'express'
import { z } from 'zod'
import { created, list as respondList, metaFor, noContent, ok } from '../http/respond.js'
import { boolish, listQuery, pathId, reorderBody } from '../http/query.js'
import { atLeastOneField, slugSchema, trimmed } from '../http/schemas.js'
import { parse } from '../http/validate.js'
import * as courseService from '../services/courseService.js'

const creditSchema = z.number().int().min(0).max(999)

const createSchema = z.strictObject({
  code: z.string().trim().min(1).max(20).optional(),
  slug: slugSchema.optional(),
  title: trimmed(255),
  description: z.string().max(100000).default(''),
  credits: creditSchema.nullable().default(3),
  department: z.string().trim().max(255).default(''),
  streamId: z.number().int().positive().nullable().optional(),
  degreeLevelId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
})

const updateSchema = z
  .strictObject({
    code: z.string().trim().min(1).max(20).nullable().optional(),
    slug: slugSchema.nullable().optional(),
    title: trimmed(255).optional(),
    description: z.string().max(100000).optional(),
    credits: creditSchema.nullable().optional(),
    department: z.string().trim().max(255).optional(),
    streamId: z.number().int().positive().nullable().optional(),
    degreeLevelId: z.number().int().positive().nullable().optional(),
    sortOrder: z.number().int().min(0).max(100000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: atLeastOneField })

const activeSchema = z.strictObject({ isActive: z.boolean() })

const publicListQuery = listQuery({
  sorts: ['code', 'title', 'sortOrder', 'credits', 'createdAt', 'updatedAt'] as const,
  defaultSort: 'code',
}).extend({
  streamId: z.coerce.number().int().positive().optional(),
  stream: z.string().trim().max(255).optional(),
  degreeLevelId: z.coerce.number().int().positive().optional(),
})

const adminListQuery = publicListQuery.extend({ active: boolish.optional() })

export async function list(req: Request, res: Response) {
  const query = parse(publicListQuery, req.query)
  const { rows, total } = await courseService.listCourses({
    ...query,
    streamSlug: query.stream,
    active: true,
  })
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function getById(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  ok(res, await courseService.getCourseRow(id, true))
}

export async function adminList(req: Request, res: Response) {
  const query = parse(adminListQuery, req.query)
  const { rows, total } = await courseService.listCourses({
    ...query,
    streamSlug: query.stream,
  })
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function adminGet(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  ok(res, await courseService.getCourseRow(id, false))
}

export async function adminCreate(req: Request, res: Response) {
  const body = parse(createSchema, req.body)
  created(res, await courseService.createCourse(body))
}

export async function adminUpdate(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(updateSchema, req.body)
  ok(res, await courseService.updateCourse(id, body))
}

export async function adminRemove(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  await courseService.deleteCourse(id)
  noContent(res)
}

export async function adminSetActive(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(activeSchema, req.body)
  ok(res, await courseService.setCourseActive(id, body.isActive))
}

export async function adminReorder(req: Request, res: Response) {
  const body = parse(reorderBody, req.body)
  ok(res, await courseService.reorderCourses(body.ids))
}
