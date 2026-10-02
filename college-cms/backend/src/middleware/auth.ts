import { createHash, timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { HttpError } from './error.js'

export type Role = 'editor' | 'admin'

const ROLE_RANK: Record<Role, number> = { editor: 1, admin: 2 }

declare module 'express-serve-static-core' {
  interface Request {
    auth?: { role: Role }
  }
}

function tokenHash(token: string): Buffer {
  return createHash('sha256').update(token).digest()
}

function configuredTokens(): { role: Role; hash: Buffer }[] {
  const tokens: { role: Role; hash: Buffer }[] = []
  const adminToken = process.env.ADMIN_TOKEN
  const editorToken = process.env.EDITOR_TOKEN
  if (adminToken) tokens.push({ role: 'admin', hash: tokenHash(adminToken) })
  if (editorToken) tokens.push({ role: 'editor', hash: tokenHash(editorToken) })
  return tokens
}

function highestRole(presented: Buffer): Role | undefined {
  let matched: Role | undefined
  for (const candidate of configuredTokens()) {
    if (timingSafeEqual(presented, candidate.hash)) {
      if (!matched || ROLE_RANK[candidate.role] > ROLE_RANK[matched]) {
        matched = candidate.role
      }
    }
  }
  return matched
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const presented = tokenHash(header.slice('Bearer '.length).trim())
    const role = highestRole(presented)
    if (role) req.auth = { role }
  }
  next()
}

export function requireRole(minimum: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.setHeader('WWW-Authenticate', 'Bearer')
      next(new HttpError(401, 'Authentication required', 'unauthorized'))
      return
    }
    if (ROLE_RANK[req.auth.role] < ROLE_RANK[minimum]) {
      next(new HttpError(403, 'Insufficient permissions', 'forbidden'))
      return
    }
    next()
  }
}
