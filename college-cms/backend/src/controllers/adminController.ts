import type { Request, Response } from 'express'
import { HttpError } from '../middleware/error.js'
import { ok } from '../http/respond.js'
import * as statsService from '../services/statsService.js'

export async function stats(_req: Request, res: Response) {
  ok(res, await statsService.getStats())
}

export async function whoami(req: Request, res: Response) {
  if (!req.auth) throw new HttpError(401, 'Authentication required', 'unauthorized')
  ok(res, { role: req.auth.role })
}
