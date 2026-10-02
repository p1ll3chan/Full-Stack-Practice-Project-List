import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../admin/auth'
import ContentSync from '../admin/ContentSync'
import LoginPage from '../admin/LoginPage'
import AdminLayout from '../admin/AdminLayout'
import { createQueryClient } from '../api/queryClient'
import App from '../App'
import { AppRoutes } from '../routes'
import { meta, stubFetch } from './testUtils'
import type { Stream, StreamWithLevels } from '../api/types'

class FakeEventSource {
  static instances: FakeEventSource[] = []
  url: string
  private handlers = new Map<string, Set<(event: MessageEvent) => void>>()

  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, handler: (event: MessageEvent) => void) {
    const set = this.handlers.get(type) ?? new Set<(event: MessageEvent) => void>()
    set.add(handler)
    this.handlers.set(type, set)
  }

  close() {
    this.handlers.clear()
  }

  emit(type: string, payload: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(payload) })
    for (const handler of [...(this.handlers.get(type) ?? [])]) handler(event)
  }
}

function emitContentEvent(entity = 'streams') {
  for (const source of FakeEventSource.instances) {
    source.emit('content', { entity, action: 'mutated', at: new Date().toISOString() })
  }
}

async function settleDebounce() {
  await new Promise((resolve) => setTimeout(resolve, 350))
}

function makeStream(id: number, name: string, slug: string): Stream {
  return {
    id,
    slug,
    name,
    tagline: `${name} tagline`,
    shortDescription: `${name} description`,
    category: 'Science',
    iconSvg: '',
    imageMediaId: null,
    sortOrder: id,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

const physics: Stream = makeStream(1, 'Department of Physics', 'physics')

const streamWithLevels: StreamWithLevels = { ...physics, degreeLevels: [] }

function pageBody(slug: string, title: string, text: string) {
  return {
    data: {
      id: 1,
      slug,
      title,
      section: 'general',
      published: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      blocks: [
        { id: 1, type: 'heading', content: { text, level: 2 } },
        { id: 2, type: 'paragraph', content: { text: `Body of ${slug}` } },
      ],
    },
  }
}

beforeEach(() => {
  FakeEventSource.instances = []
  vi.stubGlobal('EventSource', FakeEventSource)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function renderPublic(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('content event sync', () => {
  it('refreshes the open public page when a content event arrives', async () => {
    let streamName = 'Department of Physics'
    const fetchSpy = stubFetch((url) => {
      if (url.startsWith('/api/streams/physics')) {
        return { body: { data: { ...streamWithLevels, name: streamName } } }
      }
      if (url.startsWith('/api/academics/courses')) return { body: { data: [], meta: meta() } }
      if (url.startsWith('/api/streams')) return { body: { data: [physics], meta: meta(1, 9, 1, 1) } }
      return undefined
    })

    renderPublic('/departments')
    expect(await screen.findByRole('heading', { level: 1, name: 'Departments' })).toBeTruthy()

    const cardLink = (await screen.findAllByRole('link', { name: 'Department of Physics' }))[0]
    fireEvent.click(cardLink)
    expect(await screen.findByRole('heading', { level: 1, name: 'Department of Physics' })).toBeTruthy()

    const detailCalls = () =>
      fetchSpy.mock.calls.filter(([input]) => String(input).startsWith('/api/streams/physics')).length
    const before = detailCalls()
    expect(before).toBeGreaterThan(0)

    streamName = 'Department of Physics & Astronomy'
    emitContentEvent('streams')
    await settleDebounce()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Department of Physics & Astronomy' }),
    ).toBeTruthy()
    expect(detailCalls()).toBeGreaterThan(before)
    expect(screen.queryByText('Loading department…')).toBeNull()
  })

  it('invalidates admin queries when a content event arrives', async () => {
    const client = createQueryClient()
    const spy = vi.spyOn(client, 'invalidateQueries')

    render(
      <QueryClientProvider client={client}>
        <ContentSync />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(FakeEventSource.instances.length).toBeGreaterThan(0))

    emitContentEvent('pages')
    await settleDebounce()

    expect(spy).toHaveBeenCalledWith({ queryKey: ['admin'] })
  })

  it('keeps the header skip link and main landmark wired together', async () => {
    stubFetch(() => undefined)
    render(<App />)

    const skip = await screen.findByRole('link', { name: 'Skip to content' })
    expect(skip.getAttribute('href')).toBe('#main')
    expect(document.querySelector('main#main')).toBeTruthy()
  })
})

describe('empty dataset', () => {
  it('renders empty states on the homepage', async () => {
    stubFetch((url) => {
      if (url.startsWith('/api/pages/home')) return { body: pageBody('home', 'Welcome', 'Hello homepage') }
      if (url.startsWith('/api/streams')) return { body: { data: [], meta: meta(1, 9, 0, 0) } }
      return undefined
    })

    renderPublic('/')

    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome' })).toBeTruthy()
    expect(await screen.findByText('No departments to show yet.')).toBeTruthy()
  })

  it('renders the empty state on the departments listing', async () => {
    stubFetch((url) => {
      if (url.startsWith('/api/streams')) return { body: { data: [], meta: meta(1, 9, 0, 0) } }
      return undefined
    })

    renderPublic('/departments')

    expect(await screen.findByRole('heading', { level: 1, name: 'Departments' })).toBeTruthy()
    expect(await screen.findByText('No departments available yet.')).toBeTruthy()
  })
})

describe('outage handling', () => {
  it('shows an error state and recovers when the API comes back', async () => {
    let failing = true
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (failing) {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => JSON.stringify({ error: { code: 'internal_error', message: 'Database unavailable' } }),
          json: async () => ({ error: { code: 'internal_error', message: 'Database unavailable' } }),
        } as unknown as Response
      }
      if (url.startsWith('/api/streams')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify({ data: [physics], meta: meta(1, 9, 1, 1) }),
          json: async () => ({ data: [physics], meta: meta(1, 9, 1, 1) }),
        } as unknown as Response
      }
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ error: { code: 'not_found', message: 'missing' } }),
        json: async () => ({ error: { code: 'not_found', message: 'missing' } }),
      } as unknown as Response
    })
    vi.stubGlobal('fetch', fetchSpy)

    renderPublic('/departments')

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Could not load departments')

    failing = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Department of Physics' })).toBeTruthy()
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(1)
  })
})

describe('deep routes', () => {
  it('renders an excellence domain entered directly', async () => {
    stubFetch((url) => {
      if (url.startsWith('/api/excellence-domains/science')) {
        return {
          body: {
            data: {
              id: 3,
              slug: 'science',
              name: 'Research Excellence',
              description: 'Published research output.',
              color: '#123456',
              sortOrder: 1,
              isActive: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          },
        }
      }
      if (url.startsWith('/api/excellence')) return { body: { data: [], meta: meta(1, 50, 0, 0) } }
      return undefined
    })

    renderPublic('/excellence/domains/science')

    expect(await screen.findByRole('heading', { level: 1, name: 'Research Excellence' })).toBeTruthy()
    expect(document.title).toBe('Research Excellence | College CMS')
  })

  it('renders a faculty member entered directly', async () => {
    stubFetch((url) => {
      if (url.startsWith('/api/faculty/7')) {
        return {
          body: {
            data: {
              id: 7,
              name: 'Dr. Ada Lovelace',
              title: 'Professor',
              department: 'Physics',
              email: 'ada@college.edu',
              bio: 'Computing pioneer.',
              streamId: 1,
              photoMediaId: null,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          },
        }
      }
      return undefined
    })

    renderPublic('/faculty/7')

    expect(await screen.findByRole('heading', { level: 1, name: 'Dr. Ada Lovelace' })).toBeTruthy()
    expect(document.title).toBe('Dr. Ada Lovelace | College CMS')
  })
})

describe('page titles', () => {
  it('sets document.title from the CMS page header', async () => {
    stubFetch((url) => {
      if (url.startsWith('/api/pages/home')) return { body: pageBody('home', 'Welcome', 'Hello homepage') }
      if (url.startsWith('/api/streams')) return { body: { data: [], meta: meta(1, 9, 0, 0) } }
      return undefined
    })

    renderPublic('/')

    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome' })).toBeTruthy()
    expect(document.title).toBe('Welcome | College CMS')
  })

  it('sets document.title on the not-found page', async () => {
    stubFetch(() => undefined)

    renderPublic('/no-such-page')

    expect(await screen.findByTestId('not-found')).toBeTruthy()
    expect(document.title).toBe('Page not found | College CMS')
  })

  it('sets document.title on the login page', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'CMS sign in' })).toBeTruthy()
    expect(document.title).toBe('Sign in | College CMS')
  })

  it('sets document.title from the active admin section', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/pages']}>
        <AuthProvider>
          <AdminLayout />
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(document.title).toBe('Pages admin | College CMS'))
  })
})

describe('admin cross-entity invalidation', () => {
  it('invalidates the degree-level view when department links change', async () => {
    const client = createQueryClient()
    const spy = vi.spyOn(client, 'invalidateQueries')

    const { default: DepartmentEditor } = await import('../admin/DepartmentEditor')

    stubFetch((url) => {
      if (url.startsWith('/api/admin/streams/1/degree-levels')) return { body: { data: { ok: true } } }
      if (url.startsWith('/api/admin/streams/1')) return { body: { data: streamWithLevels } }
      if (url.startsWith('/api/admin/degree-levels')) return { body: { data: [], meta: meta(1, 100, 0, 0) } }
      if (url.startsWith('/api/admin/streams')) return { body: { data: [], meta: meta(1, 100, 0, 0) } }
      return undefined
    })

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/admin/departments/1']}>
          <Routes>
            <Route path="/admin/departments/:id" element={<DepartmentEditor />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await screen.findByRole('heading', { name: 'Degree levels' })

    fireEvent.click(screen.getByRole('button', { name: 'Save degree levels' }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['admin', 'degree-levels'] }))
    expect(spy).toHaveBeenCalledWith({ queryKey: ['admin', 'degree-level'] })
  })

  it('invalidates cached page views when media changes', async () => {
    const client = createQueryClient()
    const spy = vi.spyOn(client, 'invalidateQueries')

    const { default: MediaManager } = await import('../admin/MediaManager')

    stubFetch((url) => {
      if (url.startsWith('/api/admin/media')) {
        if (url.includes('page=1')) {
          return {
            body: {
              data: [
                {
                  id: 2,
                  url: 'https://cdn.example/hero.jpg',
                  fileName: 'hero.jpg',
                  altText: 'Hero image',
                  mimeType: 'image/jpeg',
                  width: 1200,
                  height: 800,
                  status: 'ready',
                  sourceSystem: 'seed',
                  sourceRef: 'hero',
                  createdAt: '2026-01-01T00:00:00.000Z',
                  updatedAt: '2026-01-01T00:00:00.000Z',
                },
              ],
              meta: meta(1, 10, 1, 1),
            },
          }
        }
        return { body: { data: [], meta: meta(1, 10, 0, 0) } }
      }
      return undefined
    })

    render(
      <QueryClientProvider client={client}>
        <MediaManager />
      </QueryClientProvider>,
    )

    await screen.findByText('Hero image')

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['admin', 'pages'] }))
  })
})
