import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Departments from '../pages/Departments'
import { meta, stubFetch } from './testUtils'
import type { Stream } from '../api/types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function makeStream(id: number, name: string, slug: string, category: string): Stream {
  return {
    id,
    slug,
    name,
    tagline: `${name} tagline`,
    shortDescription: `${name} description`,
    category,
    iconSvg: '',
    imageMediaId: null,
    sortOrder: id,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

const all = [
  makeStream(1, 'Department of Physics', 'physics', 'Science'),
  makeStream(2, 'Department of English', 'english', 'Arts'),
  makeStream(3, 'Department of Botany', 'botany', 'Science'),
]

describe('departments listing', () => {
  it('renders department cards, category filters and pagination from API data', async () => {
    stubFetch((url) => {
      if (url.includes('limit=100')) return { body: { data: all, meta: meta(1, 100, 3, 1) } }
      if (url.includes('q=physics')) return { body: { data: [all[0]], meta: meta(1, 9, 1, 1) } }
      return { body: { data: all, meta: meta(1, 9, 12, 2) } }
    })

    render(
      <MemoryRouter initialEntries={['/departments']}>
        <Departments />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Departments' })).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Department of Physics' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Department of English' })).toBeTruthy()

    const category = screen.getByLabelText('Category')
    const options = Array.from((category as HTMLSelectElement).options).map((option) => option.textContent)
    expect(options).toEqual(['All categories', 'Arts', 'Science'])

    expect(screen.getByText('Page 1 of 2 · 12 results')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('sends debounced search text to the API', async () => {
    const fetchSpy = stubFetch((url) => {
      if (url.includes('limit=100')) return { body: { data: all, meta: meta(1, 100, 3, 1) } }
      if (url.includes('q=physics')) return { body: { data: [all[0]], meta: meta(1, 9, 1, 1) } }
      return { body: { data: all, meta: meta(1, 9, 3, 1) } }
    })

    render(
      <MemoryRouter initialEntries={['/departments']}>
        <Departments />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Search departments'), { target: { value: 'physics' } })

    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some(([input]) => String(input).includes('q=physics')),
      ).toBe(true)
    })

    expect(await screen.findByRole('heading', { name: 'Department of Physics' })).toBeTruthy()
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Department of English' })).toBeNull()
    })
  })
})
