import type { Request } from 'express'
import { HttpError } from './error.js'

export function param(req: Request, name: string): string {
  const value = req.params[name]
  return Array.isArray(value) ? value[0] : value
}

export function numParam(req: Request, name: string): number {
  const n = Number(param(req, name))
  if (Number.isNaN(n)) {
    throw new HttpError(400, `Invalid ${name}`)
  }
  return n
}
