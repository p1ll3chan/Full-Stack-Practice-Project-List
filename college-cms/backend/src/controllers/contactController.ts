import type { Request, Response } from 'express'
import { z } from 'zod'
import { ok } from '../http/respond.js'
import { parse } from '../http/validate.js'
import * as contactService from '../services/contactService.js'

const upsertSchema = z.strictObject({
  collegeName: z.string().trim().max(255).optional(),
  tagline: z.string().trim().max(255).optional(),
  address: z.string().trim().max(5000).optional(),
  phone: z.string().trim().max(50).optional(),
  email: z.string().trim().max(255).optional(),
  officeHours: z.string().trim().max(255).optional(),
  mapEmbedUrl: z.string().trim().max(2000).optional(),
})

export async function get(_req: Request, res: Response) {
  ok(res, await contactService.getContact())
}

export async function adminGet(_req: Request, res: Response) {
  ok(res, await contactService.getContact())
}

export async function adminPut(req: Request, res: Response) {
  const body = parse(upsertSchema, req.body)
  ok(res, await contactService.upsertContact(body))
}
