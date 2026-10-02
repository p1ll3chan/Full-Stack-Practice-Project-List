import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../routes'
import { meta, stubFetch } from './testUtils'
import type { Course, FacultyMember, Stream, StreamWithLevels } from '../api/types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const physics: Stream = {
  id: 1,
  slug: 'physics',
  name: 'Department of Physics',
  tagline: 'Matter, motion and energy',
  shortDescription: 'Physics department.',
  category: 'Science',
  iconSvg: '',
  imageMediaId: null,
  sortOrder: 1,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const math: Stream = { ...physics, id: 2, slug: 'mathematics', name: 'Department of Mathematics' }

const course: Course = {
  id: 11,
  code: 'PHY101',
  slug: 'intro-physics',
  title: 'Intro to Physics',
  description: 'Mechanics.',
  credits: 4,
  department: 'Physics',
  streamId: 1,
  degreeLevelId: null,
  sortOrder: 1,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const member: FacultyMember = {
  id: 5,
  name: 'Dr. Grace Hopper',
  title: 'Professor',
  department: 'Physics',
  email: 'grace@college.edu',
  bio: 'Known for compilers.',
  streamId: 1,
  photoMediaId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

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

describe('public routes', () => {
  it('renders the homepage from API content', async () => {
    stubFetch((url) => {
      if (url.startsWith('/api/pages/home')) return { body: pageBody('home', 'Welcome', 'Hello homepage') }
      if (url.startsWith('/api/streams')) return { body: { data: [], meta: meta() } }
      return undefined
    })

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Hello homepage' })).toBeTruthy()
    expect(screen.getByText('Body of home')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Browse Academics' }).getAttribute('href')).toBe('/academics')
  })

  it('shows the not-found page for an invalid department slug', async () => {
    stubFetch((url) => {
      if (url.startsWith('/api/streams/')) return undefined
      if (url.startsWith('/api/streams')) return { body: { data: [], meta: meta() } }
      return undefined
    })

    render(
      <MemoryRouter initialEntries={['/departments/does-not-exist']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByTestId('not-found')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy()
  })

  it('shows the not-found page for an unknown CMS slug', async () => {
    stubFetch(() => undefined)

    render(
      <MemoryRouter initialEntries={['/no-such-page']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByTestId('not-found')).toBeTruthy()
  })

  it('shares stream and course navigation between academics and faculty detail', async () => {
    stubFetch((url) => {
      if (url.startsWith('/api/academics/details/')) {
        return {
          body: {
            data: {
              stream: physics,
              details: {
                id: 1,
                streamId: 1,
                overview: {
                  nodes: [{ type: 'paragraph', align: 'auto', runs: [{ text: 'We teach physics.' }] }],
                },
                programsHtml: 'B.Sc. Physics\nM.Sc. Physics',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            },
          },
        }
      }
      if (url.startsWith('/api/academics/courses')) return { body: { data: [course], meta: meta(1, 100, 1, 1) } }
      if (url.startsWith('/api/faculty')) return { body: { data: [member], meta: meta(1, 100, 1, 1) } }
      if (url.startsWith('/api/streams/')) {
        const streamWithLevels: StreamWithLevels = { ...physics, degreeLevels: [] }
        return { body: { data: streamWithLevels } }
      }
      if (url.includes('limit=100')) return { body: { data: [physics, math], meta: meta(1, 100, 2, 1) } }
      return undefined
    })

    const academics = render(
      <MemoryRouter initialEntries={['/academics/streams/physics']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Department of Physics' })).toBeTruthy()
    const acadNav = await screen.findByRole('navigation', { name: 'Departments' })
    expect(acadNav.querySelector('a[href="/academics/streams/mathematics"]')).toBeTruthy()
    const acadCourses = await screen.findByRole('navigation', { name: 'Courses in this department' })
    expect(acadCourses.querySelector('a[href="/academics/courses/11"]')).toBeTruthy()
    expect(screen.getByText('We teach physics.')).toBeTruthy()
    expect(screen.getByText(/B\.Sc\. Physics/)).toBeTruthy()
    academics.unmount()

    render(
      <MemoryRouter initialEntries={['/faculty/streams/physics']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Department of Physics' })).toBeTruthy()
    const facNav = await screen.findByRole('navigation', { name: 'Departments' })
    expect(facNav.querySelector('a[href="/faculty/streams/mathematics"]')).toBeTruthy()
    const facCourses = await screen.findByRole('navigation', { name: 'Courses in this department' })
    expect(facCourses.querySelector('a[href="/academics/courses/11"]')).toBeTruthy()
    expect(await screen.findByText('Dr. Grace Hopper')).toBeTruthy()
  })

  it('renders a course detail page fetched by id', async () => {
    stubFetch((url) => {
      if (url.startsWith('/api/academics/courses/11')) return { body: { data: course } }
      if (url.startsWith('/api/streams')) return { body: { data: [physics], meta: meta(1, 100, 1, 1) } }
      return undefined
    })

    render(
      <MemoryRouter initialEntries={['/academics/courses/11']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Intro to Physics' })).toBeTruthy()
    const streamLink = await screen.findByRole('link', { name: 'Department of Physics' })
    expect(streamLink.getAttribute('href')).toBe('/departments/physics')
  })
})
