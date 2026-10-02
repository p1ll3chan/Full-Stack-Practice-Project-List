import type { ZodType } from 'zod'
import { HttpError } from '../middleware/error.js'

export function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (result.success) return result.data
  throw new HttpError(
    400,
    'Request validation failed',
    'validation_error',
    result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  )
}
