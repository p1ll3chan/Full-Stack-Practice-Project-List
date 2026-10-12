import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Footer from '../components/Footer'
import { useContact } from '../api/hooks'
import type { CollegeContact } from '../api/types'

vi.mock('../api/hooks', () => ({ useContact: vi.fn() }))

const empty: CollegeContact = {
  id: 1, collegeName: '', tagline: '', address: '', phone: '', email: '',
  officeHours: '', mapEmbedUrl: '', createdAt: '', updatedAt: '',
}

function mockContact(data: CollegeContact | null, loading = false, error: Error | null = null) {
  vi.mocked(useContact).mockReturnValue({ data, loading, error, refetch: vi.fn() })
}

function renderFooter() {
  render(<MemoryRouter><Footer /></MemoryRouter>)
  return within(screen.getByRole('region', { name: 'Contact' }))
}

afterEach(cleanup)
beforeEach(() => vi.resetAllMocks())

describe('footer contact details', () => {
  it('shows a fallback instead of an empty list when all fields are empty', () => {
    mockContact(empty)
    const contact = renderFooter()
    expect(contact.getByText('Contact details will be available soon.')).toBeTruthy()
    expect(contact.queryByRole('list')).toBeNull()
    expect(screen.getByRole('heading', { name: 'College CMS' })).toBeTruthy()
  })

  it('treats whitespace-only contact fields as empty', () => {
    mockContact({ ...empty, collegeName: '  ', tagline: '\n ', address: '  ', phone: '\t',
      email: ' ', officeHours: '\n', mapEmbedUrl: '  ' })
    const contact = renderFooter()
    expect(contact.getByText('Contact details will be available soon.')).toBeTruthy()
    expect(contact.queryByRole('list')).toBeNull()
    expect(screen.getByRole('heading', { name: 'College CMS' })).toBeTruthy()
  })

  it('renders only the usable partial fields with trimmed links', () => {
    mockContact({ ...empty, phone: ' +123456789 ', email: ' hello@college.edu ', address: ' ' })
    const contact = renderFooter()
    expect(contact.getAllByRole('listitem')).toHaveLength(2)
    expect(contact.getByRole('link', { name: '+123456789' }).getAttribute('href')).toBe('tel:+123456789')
    expect(contact.getByRole('link', { name: 'hello@college.edu' }).getAttribute('href')).toBe('mailto:hello@college.edu')
    expect(contact.queryByText('Contact details will be available soon.')).toBeNull()
  })

  it('renders all fields and trims the college name, tagline and map URL', () => {
    mockContact({ ...empty, collegeName: ' Example College ', tagline: ' Learn here ',
      address: ' College Road ', phone: ' +123456789 ', email: ' hello@college.edu ',
      officeHours: ' Mon–Fri 9–5 ', mapEmbedUrl: ' https://example.com/map ' })
    const contact = renderFooter()
    expect(contact.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByRole('heading', { name: 'Example College' }).textContent).toBe('Example College')
    expect(screen.getByText('Learn here').textContent).toBe('Learn here')
    expect(contact.getByText('College Road').textContent).toBe('College Road')
    expect(contact.getByText('Mon–Fri 9–5').textContent).toBe('Mon–Fri 9–5')
    expect(contact.getByRole('link', { name: 'View on map' }).getAttribute('href')).toBe('https://example.com/map')
  })

  it('keeps the rest of the footer available when contact loading fails', () => {
    mockContact(null, false, new Error('Unavailable'))
    const contact = renderFooter()
    expect(contact.getByText('Contact details are unavailable right now.')).toBeTruthy()
    expect(contact.queryByRole('list')).toBeNull()
    expect(screen.getByRole('navigation', { name: 'Quick links' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'College CMS' })).toBeTruthy()
  })

  it('announces loading without blocking the quick links', () => {
    mockContact(null, true)
    const contact = renderFooter()
    expect(contact.getByRole('status', { name: 'Loading contact details' })).toBeTruthy()
    expect(contact.queryByText('Contact details will be available soon.')).toBeNull()
    expect(screen.getByRole('navigation', { name: 'Quick links' })).toBeTruthy()
  })

  it('shows the fallback when an unusable map URL is the only detail', () => {
    mockContact({ ...empty, mapEmbedUrl: 'not-a-map-url' })
    const contact = renderFooter()
    expect(contact.getByText('Contact details will be available soon.')).toBeTruthy()
    expect(contact.queryByRole('link')).toBeNull()
  })
})
