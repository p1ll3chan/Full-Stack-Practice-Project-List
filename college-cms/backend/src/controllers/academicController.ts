import type { Request, Response } from 'express'
import { z } from 'zod'
import { ok } from '../http/respond.js'
import { parse } from '../http/validate.js'
import * as academicService from '../services/academicService.js'

const pathSlug = z.object({ streamSlug: z.string().min(1).max(255) })

export async function getByStreamSlug(req: Request, res: Response) {
  const { streamSlug } = parse(pathSlug, req.params)
  ok(res, await academicService.getPublicDetails(streamSlug))
}
