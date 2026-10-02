import type { Response } from 'express'

export interface ListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function metaFor(total: number, page: number, limit: number): ListMeta {
  return {
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  }
}

export function ok(res: Response, data: unknown): void {
  res.json({ data })
}

export function created(res: Response, data: unknown): void {
  res.status(201).json({ data })
}

export function noContent(res: Response): void {
  res.status(204).end()
}

export function list(res: Response, data: unknown[], meta: ListMeta): void {
  res.json({ data, meta })
}
