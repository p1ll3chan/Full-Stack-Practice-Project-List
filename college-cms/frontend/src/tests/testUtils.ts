import { vi } from 'vitest'
import type { ListMeta } from '../api/types'

export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : '',
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response
}

export interface RouteMatch {
  status?: number
  body: unknown
}

export type RouteHandler = (url: string) => RouteMatch | undefined

export function stubFetch(handler: RouteHandler) {
  const spy = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const match = handler(url)
    if (match) return jsonResponse(match.body, match.status ?? 200)
    return jsonResponse({ error: { code: 'not_found', message: `No route for ${url}` } }, 404)
  })
  vi.stubGlobal('fetch', spy)
  return spy
}

export function meta(page = 1, limit = 20, total = 0, totalPages = 0): ListMeta {
  return { page, limit, total, totalPages }
}
