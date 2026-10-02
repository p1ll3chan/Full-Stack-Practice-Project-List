import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export type ErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation_error'
  | 'invalid_json'
  | 'payload_too_large'
  | 'invalid_reference'
  | 'rate_limited'
  | 'internal_error'

export interface ErrorDetail {
  path?: string
  message: string
}

export class HttpError extends Error {
  status: number
  code: ErrorCode
  details?: ErrorDetail[]

  constructor(status: number, message: string, code?: ErrorCode, details?: ErrorDetail[]) {
    super(message)
    this.status = status
    this.code = code ?? codeForStatus(status)
    this.details = details
  }
}

function codeForStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'bad_request'
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 404:
      return 'not_found'
    case 409:
      return 'conflict'
    case 413:
      return 'payload_too_large'
    case 429:
      return 'rate_limited'
    default:
      return status >= 500 ? 'internal_error' : 'bad_request'
  }
}

interface ConstraintFailure {
  status: number
  code: ErrorCode
  message: string
}

const CONSTRAINT_FAILURES: Record<string, ConstraintFailure> = {
  pages_slug_unique: { status: 409, code: 'conflict', message: 'A page with that slug already exists' },
  streams_slug_unique: { status: 409, code: 'conflict', message: 'A stream with that slug already exists' },
  courses_slug_unique: { status: 409, code: 'conflict', message: 'A course with that slug already exists' },
  courses_code_unique: { status: 409, code: 'conflict', message: 'A course with that code already exists' },
  degree_levels_code_unique: { status: 409, code: 'conflict', message: 'A degree level with that code already exists' },
  excellence_domains_slug_unique: { status: 409, code: 'conflict', message: 'A domain with that slug already exists' },
  media_source_unique: { status: 409, code: 'conflict', message: 'That media reference already exists' },
  degree_level_streams_pk: { status: 409, code: 'conflict', message: 'That degree level is already linked to the stream' },
  college_contact_singleton: { status: 400, code: 'validation_error', message: 'Only the singleton contact row (id 1) exists' },
  pages_section_valid: { status: 400, code: 'validation_error', message: 'Invalid page section' },
  page_blocks_type_valid: { status: 400, code: 'validation_error', message: 'Invalid page block type' },
  page_blocks_image_requires_media: { status: 400, code: 'validation_error', message: 'Image blocks require a mediaId' },
  excellence_year_range: { status: 400, code: 'validation_error', message: 'Year must be between 1900 and 2100' },
  degree_levels_group_valid: { status: 400, code: 'validation_error', message: 'Invalid degree level group' },
  media_status_valid: { status: 400, code: 'validation_error', message: 'Invalid media status' },
  courses_stream_level_fk: { status: 400, code: 'invalid_reference', message: 'That degree level is not offered for the selected stream' },
}

interface PostgresFailure {
  code: string
  constraint?: string
}

function findPostgresFailure(error: unknown): PostgresFailure | undefined {
  let current: unknown = error
  for (let depth = 0; depth < 12 && current !== null && current !== undefined; depth += 1) {
    if (typeof current !== 'object') return undefined
    const candidate = current as { code?: unknown; severity?: unknown; constraint_name?: unknown; cause?: unknown }
    if (
      typeof candidate.code === 'string' &&
      /^[0-9A-Z]{5}$/.test(candidate.code) &&
      typeof candidate.severity === 'string'
    ) {
      return {
        code: candidate.code,
        constraint: typeof candidate.constraint_name === 'string' ? candidate.constraint_name : undefined,
      }
    }
    current = candidate.cause
  }
  return undefined
}

function mapPostgresFailure(failure: PostgresFailure): { status: number; code: ErrorCode; message: string } | undefined {
  if (failure.constraint) {
    const known = CONSTRAINT_FAILURES[failure.constraint]
    if (known) return known
  }
  if (failure.code === '23505') return { status: 409, code: 'conflict', message: 'That value already exists' }
  if (failure.code === '23503') {
    return { status: 400, code: 'invalid_reference', message: 'A referenced record does not exist or is still in use' }
  }
  if (failure.code === '23514') {
    return { status: 400, code: 'validation_error', message: 'A value violates a database constraint' }
  }
  if (failure.code === '23502') return { status: 400, code: 'validation_error', message: 'A required field is missing' }
  if (failure.code.startsWith('22')) {
    return { status: 400, code: 'validation_error', message: 'A value is malformed or out of range' }
  }
  return undefined
}

interface BodyParserFailure extends Error {
  type?: string
  status?: number
  statusCode?: number
}

function mapBodyParserFailure(error: BodyParserFailure): { status: number; code: ErrorCode; message: string } | undefined {
  if (typeof error.type !== 'string' || !error.type.startsWith('entity.')) return undefined
  if (error.type === 'entity.parse.failed') {
    return { status: 400, code: 'invalid_json', message: 'Request body is not valid JSON' }
  }
  if (error.type === 'entity.too.large') {
    return { status: 413, code: 'payload_too_large', message: 'Request body is too large' }
  }
  const status = error.status ?? error.statusCode ?? 400
  return { status, code: codeForStatus(status), message: 'Malformed request body' }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'not_found', message: 'Not found' } })
}

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(err)
    return
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'Request validation failed',
        details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      },
    })
    return
  }

  if (err instanceof Error) {
    const bodyFailure = mapBodyParserFailure(err as BodyParserFailure)
    if (bodyFailure) {
      res.status(bodyFailure.status).json({
        error: { code: bodyFailure.code, message: bodyFailure.message },
      })
      return
    }

    const postgresFailure = findPostgresFailure(err)
    if (postgresFailure) {
      const mapped = mapPostgresFailure(postgresFailure)
      if (mapped) {
        res.status(mapped.status).json({
          error: { code: mapped.code, message: mapped.message },
        })
        return
      }
    }
  }

  console.error(err)
  res.status(500).json({ error: { code: 'internal_error', message: 'Internal server error' } })
}

export function asyncHandler<
  T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}
