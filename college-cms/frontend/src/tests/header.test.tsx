import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import Header from '../components/Header'
vi.mock('../api/hooks', () => ({
  useContact: () => ({ data: { collegeName: 'Marygiri College', tagline: 'Learn Love Lead' } }),
  useAllStreams: () => ({ data: [{ id: 1, slug: 'arts', name: 'Arts' }, { id: 2, slug: 'science', name: 'Science' }] }),
  useCourseList: () => ({ data: [{ id: 1, title: 'Published course' }] }),
}))
afterEach(cleanup)
const setup = () => render(<MemoryRouter><Header /></MemoryRouter>)
it('opens on click, navigates categories with arrows, and closes with Escape restoring focus', async () => {
  setup()
  const trigger = screen.getByRole('button', { name: 'Academics' })
  fireEvent.click(trigger)
  const arts = screen.getByRole('button', { name: 'Arts' })
  arts.focus()
  fireEvent.keyDown(arts, { key: 'ArrowDown' })
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Science' }))
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
  expect(document.activeElement).toBe(screen.getByRole('link', { name: /Department overview/ }))
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'))
  expect(document.activeElement).toBe(trigger)
})
it('closes on outside pointer and on a second click', () => {
  setup()
  const trigger = screen.getByRole('button', { name: 'Academics' })
  fireEvent.click(trigger); fireEvent.pointerDown(document.body)
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(trigger); fireEvent.click(trigger)
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
})
it('opens a drawer, locks scrolling, and restores focus and overflow on close', () => {
  setup()
  const toggle = screen.getByRole('button', { name: 'Open menu' })
  fireEvent.click(toggle)
  expect(document.body.style.overflow).toBe('hidden')
  const dialog = document.querySelector('dialog')!
  fireEvent.click(dialog.querySelector('.drawer-close')!)
  expect(document.body.style.overflow).toBe('')
  expect(document.activeElement).toBe(toggle)
})
