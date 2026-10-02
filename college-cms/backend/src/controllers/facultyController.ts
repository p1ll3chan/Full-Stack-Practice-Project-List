import type { Request, Response } from 'express'
import { z } from 'zod'
import { created, list as respondList, metaFor, noContent, ok } from '../http/respond.js'
import { listQuery, pathId } from '../http/query.js'
import { atLeastOneField, trimmed } from '../http/schemas.js'
import { parse } from '../http/validate.js'
import * as facultyService from '../services/facultyService.js'

const createSchema = z.strictObject({
  name: trimmed(255),
  title: z.string().trim().max(255).default(''),
  department: z.string().trim().max(255).default(''),
  email: z.string().trim().max(255).default(''),
  bio: z.string().max(50000).default(''),
  streamId: z.number().int().positive().nullable().optional(),
  photoMediaId: z.number().int().positive().nullable().optional(),
})

const updateSchema = z
  .strictObject({
    name: trimmed(255).optional(),
    title: z.string().trim().max(255).optional(),
    department: z.string().trim().max(255).optional(),
    email: z.string().trim().max(255).optional(),
    bio: z.string().max(50000).optional(),
    streamId: z.number().int().positive().nullable().optional(),
    photoMediaId: z.number().int().positive().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: atLeastOneField })

const publicListQuery = listQuery({
  sorts: ['name', 'title', 'department'] as const,
  defaultSort: 'name',
}).extend({
  streamId: z.coerce.number().int().positive().optional(),
  stream: z.string().trim().max(255).optional(),
})

const adminListQuery = publicListQuery

export async function list(req: Request, res: Response) {
  const { stream, ...query } = parse(publicListQuery, req.query)
  const { rows, total } = await facultyService.listFaculty({
    ...query,
    streamSlug: stream,
    visibleOnly: true,
  })
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function getById(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  ok(res, await facultyService.getFacultyRow(id, true))
}

export async function adminList(req: Request, res: Response) {
  const { stream, ...query } = parse(adminListQuery, req.query)
  const { rows, total } = await facultyService.listFaculty({
    ...query,
    streamSlug: stream,
    visibleOnly: false,
  })
  respondList(res, rows, metaFor(total, query.page, query.limit))
}

export async function adminGet(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  ok(res, await facultyService.getFacultyRow(id, false))
}

export async function adminCreate(req: Request, res: Response) {
  const body = parse(createSchema, req.body)
  created(res, await facultyService.createFaculty(body))
}

export async function adminUpdate(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  const body = parse(updateSchema, req.body)
  ok(res, await facultyService.updateFaculty(id, body))
}

export async function adminRemove(req: Request, res: Response) {
  const { id } = parse(pathId, req.params)
  await facultyService.deleteFaculty(id)
  noContent(res)
}
