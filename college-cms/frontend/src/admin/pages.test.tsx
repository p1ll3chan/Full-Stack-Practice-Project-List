import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '../api/queryClient'
import { jsonResponse, meta } from '../tests/testUtils'
import PageEditor from './PageEditor'
import PagesManager from './PagesManager'

const pageRow = {
  id: 1,
  slug: 'about',
  title: 'About us',
  section: 'about',
  published: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  blocks: [],
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderAdmin(ui: ReactNode, route: string) {
  const client = createQueryClient()
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...view, client }
}

function EditorStub() {
  const { id } = useParams()
  return <div>Page editor {id}</div>
}

describe('admin page workflows', () => {
  it('lists pages with status badges and filters', async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/admin/pages?')) {
        return jsonResponse({ data: [pageRow], meta: meta(1, 10, 1, 1) })
      }
      return jsonResponse({ error: { code: 'not_found', message: 'missing' } }, 404)
    })
    vi.stubGlobal('fetch', fetchSpy)

    renderAdmin(
      <Routes>
        <Route path="/admin/pages" element={<PagesManager />} />
      </Routes>,
      '/admin/pages',
    )

    await screen.findByText('About us')
    expect(screen.getAllByText('Draft').length).toBeGreaterThan(0)
    expect(screen.getByText('/about')).toBeTruthy()
    const url = String(fetchSpy.mock.calls[0]?.[0])
    expect(url).toContain('sort=updatedAt')
    expect(url).toContain('order=desc')
  })

  it('creates a page and navigates to the new editor', async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/admin/pages' && init?.method === 'POST') {
        return jsonResponse({ data: { ...pageRow, id: 42, title: 'College News', slug: 'college-news' } })
      }
      return jsonResponse({ error: { code: 'not_found', message: 'missing' } }, 404)
    })
    vi.stubGlobal('fetch', fetchSpy)

    renderAdmin(
      <Routes>
        <Route path="/admin/pages/new" element={<PageEditor />} />
        <Route path="/admin/pages/:id" element={<EditorStub />} />
      </Routes>,
      '/admin/pages/new',
    )

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'College News' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create page' }))

    await screen.findByText('Page editor 42')
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>
    expect(body).toMatchObject({ title: 'College News', slug: 'college-news', section: 'general' })
  })

  it('saves only dirty page fields and invalidates narrow query keys', async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/admin/pages/1' && (!init || !init.method || init.method === 'GET')) {
        return jsonResponse({ data: pageRow })
      }
      if (url === '/api/admin/pages/1' && init?.method === 'PUT') {
        return jsonResponse({ data: { ...pageRow, title: 'Renamed' } })
      }
      return jsonResponse({ error: { code: 'not_found', message: 'missing' } }, 404)
    })
    vi.stubGlobal('fetch', fetchSpy)

    const { client } = renderAdmin(
      <Routes>
        <Route path="/admin/pages/:id" element={<PageEditor />} />
      </Routes>,
      '/admin/pages/1',
    )
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

    await screen.findByDisplayValue('About us')

    fireEvent.click(screen.getByRole('button', { name: 'Save details' }))
    await screen.findByText('No changes to save.')
    const putsBeforeChange = fetchSpy.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'PUT')
    expect(putsBeforeChange).toHaveLength(0)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Renamed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save details' }))
    await screen.findByText('Saved.')

    const putCall = fetchSpy.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PUT')
    if (!putCall) throw new Error('PUT request was never sent')
    const putInit = putCall[1] as RequestInit
    const body = JSON.parse(String(putInit.body)) as Record<string, unknown>
    expect(body).toEqual({ title: 'Renamed' })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'pages'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'page', 1] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'stats'] })
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['admin', 'courses'] })
  })

  it('blocks invalid new blocks with validation feedback before any request', async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/admin/pages/1') return jsonResponse({ data: pageRow })
      return jsonResponse({ error: { code: 'not_found', message: 'missing' } }, 404)
    })
    vi.stubGlobal('fetch', fetchSpy)

    renderAdmin(
      <Routes>
        <Route path="/admin/pages/:id" element={<PageEditor />} />
      </Routes>,
      '/admin/pages/1',
    )

    await screen.findByDisplayValue('About us')
    fireEvent.change(screen.getByLabelText('Block type'), { target: { value: 'heading' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }))

    await screen.findByText('Fix the highlighted fields before saving.')
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    const blockRequests = fetchSpy.mock.calls.filter(([input]) => String(input).includes('/blocks'))
    expect(blockRequests).toHaveLength(0)
  })
})
