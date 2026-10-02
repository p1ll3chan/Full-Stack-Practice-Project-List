import { z } from 'zod'

export interface ListQueryOptions<S extends readonly [string, ...string[]]> {
  sorts: S
  defaultSort: S[number]
  defaultOrder?: 'asc' | 'desc'
}

export function listQuery<S extends readonly [string, ...string[]]>(options: ListQueryOptions<S>) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().max(200).optional(),
    sort: z.enum(options.sorts).default(options.defaultSort),
    order: z.enum(['asc', 'desc']).default(options.defaultOrder ?? 'asc'),
  })
}

export const boolish = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => value === true || value === 'true')

export const pathId = z.object({
  id: z.coerce.number().int().min(1, 'id must be a positive integer'),
})

export const reorderBody = z
  .object({
    ids: z.array(z.number().int().positive()).min(1).max(2000),
  })
  .strict()
