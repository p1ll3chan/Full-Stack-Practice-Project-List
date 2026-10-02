import type { ApiErrorCode, ErrorBody, ListEnvelope, ListMeta } from './types'

const BASE = '/api'

let authToken: string | null = null
let unauthorizedHandler: (() => void) | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

export function getAuthToken(): string | null {
  return authToken
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  status: number
  code: ApiErrorCode
  details?: { path?: string; message: string }[]

  constructor(status: number, code: ApiErrorCode, message: string, details?: { path?: string; message: string }[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isRetryable(): boolean {
    return this.status >= 500 || this.status === 0
  }
}

function toApiError(status: number, body: unknown): ApiError {
  const error = (body as Partial<ErrorBody> | undefined)?.error
  if (error) {
    return new ApiError(status, error.code as ApiErrorCode, error.message, error.details)
  }
  return new ApiError(status, 'internal_error', `Request failed with status ${status}`)
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'network_error', 'Could not reach the server')
  }

  if (res.status === 401 && authToken !== null) {
    unauthorizedHandler?.()
  }

  if (res.status === 204) return undefined

  const text = await res.text()
  let body: unknown = undefined
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      if (res.ok) throw new ApiError(res.status, 'invalid_json', 'The server returned an invalid response')
      throw toApiError(res.status, undefined)
    }
  }

  if (!res.ok) throw toApiError(res.status, body)
  return body
}

function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data
  }
  return body as T
}

export const api = {
  get: async <T>(path: string): Promise<T> => unwrap<T>(await request(path)),
  list: async <T>(path: string): Promise<{ data: T[]; meta: ListMeta }> => {
    const body = (await request(path)) as ListEnvelope<T> | undefined
    if (!body || !Array.isArray(body.data)) {
      throw new ApiError(500, 'internal_error', 'Expected a list response')
    }
    return { data: body.data, meta: body.meta }
  },
  post: async <T>(path: string, body: unknown): Promise<T> =>
    unwrap<T>(await request(path, { method: 'POST', body: JSON.stringify(body) })),
  put: async <T>(path: string, body: unknown): Promise<T> =>
    unwrap<T>(await request(path, { method: 'PUT', body: JSON.stringify(body) })),
  delete: async <T>(path: string): Promise<T> => unwrap<T>(await request(path, { method: 'DELETE' })),
}
