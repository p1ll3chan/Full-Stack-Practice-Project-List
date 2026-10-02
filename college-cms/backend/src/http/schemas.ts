import { z } from 'zod'
import type { RichDoc } from '../db/schema.js'

export const slugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug (a-z, 0-9, hyphens)')

export function trimmed(max: number) {
  return z.string().trim().min(1).max(max)
}

export function optionalTrimmed(max: number) {
  return z.string().trim().max(max).optional()
}

export const richDocSchema = z
  .object({ nodes: z.array(z.unknown()).max(5000) })
  .transform((value) => value as RichDoc)

export const atLeastOneField = 'at least one field must be provided'

const httpUrlPattern = /^https?:\/\/[^\s]+$/i

function isSafeImageUrl(value: string): boolean {
  return httpUrlPattern.test(value) || (value.startsWith('/') && !value.startsWith('//'))
}

export const imageUrl = z
  .string()
  .trim()
  .min(1, 'an image URL is required')
  .max(2000)
  .refine(isSafeImageUrl, {
    message: 'must be an http(s) URL or a root-relative path starting with /',
  })

export const optionalImageUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => value === '' || isSafeImageUrl(value), {
    message: 'must be an http(s) URL or a root-relative path starting with /',
  })
