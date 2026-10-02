import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '../api/client'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : '',
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api client', () => {
  it('unwraps the data envelope for single resources', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ data: { slug: 'home', title: 'Welcome' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.get<{ slug: string }>('/pages/home')).resolves.toEqual({ slug: 'home', title: 'Welcome' })
    expect(fetchMock).toHaveBeenCalledWith('/api/pages/home', expect.anything())
  })

  it('keeps list meta alongside rows', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        data: [{ id: 1, name: 'Physics' }],
        meta: { page: 2, limit: 9, total: 12, totalPages: 2 },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.list<{ id: number; name: string }>('/streams?page=2')
    expect(result.data).toHaveLength(1)
    expect(result.meta).toEqual({ page: 2, limit: 9, total: 12, totalPages: 2 })
  })

  it('throws a typed ApiError from the error envelope', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: { code: 'not_found', message: 'Page "nope" not found' } }, 404),
    )
    vi.stubGlobal('fetch', fetchMock)

    const error = await api.get('/pages/nope').catch((err: unknown) => err)
    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.status).toBe(404)
    expect(apiError.code).toBe('not_found')
    expect(apiError.isNotFound).toBe(true)
    expect(apiError.message).toBe('Page "nope" not found')
  })

  it('maps network failures to a retryable network error', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    vi.stubGlobal('fetch', fetchMock)

    const error = await api.get('/pages/home').catch((err: unknown) => err)
    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.status).toBe(0)
    expect(apiError.code).toBe('network_error')
    expect(apiError.isRetryable).toBe(true)
  })
})
