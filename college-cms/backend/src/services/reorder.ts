import type { ErrorDetail } from '../middleware/error.js'
import { HttpError } from '../middleware/error.js'

export function assertPermutation(requested: number[], existing: number[], resource: string): void {
  const existingSet = new Set(existing)
  const seen = new Set<number>()
  const details: ErrorDetail[] = []

  for (const id of requested) {
    if (seen.has(id)) {
      throw new HttpError(400, `Duplicate id ${id} in reorder request`, 'validation_error', [
        { path: 'ids', message: `duplicate id: ${id}` },
      ])
    }
    seen.add(id)
    if (!existingSet.has(id)) {
      details.push({ path: 'ids', message: `unknown id: ${id}` })
    }
  }

  const missing = existing.filter((id) => !seen.has(id))
  if (missing.length > 0) {
    details.push({ path: 'ids', message: `missing ids: ${missing.join(', ')}` })
  }

  if (details.length > 0) {
    throw new HttpError(
      400,
      `Reorder ids must include every ${resource} exactly once`,
      'validation_error',
      details,
    )
  }
}
