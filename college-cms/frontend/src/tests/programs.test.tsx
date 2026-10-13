import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import ProgramsExplorer from '../components/ProgramsExplorer'
vi.mock('../api/hooks', () => ({
  useDegreeLevelList: () => ({ data: [{ id: 1, name: 'Published degree' }] }),
  useCourseList: () => ({ data: [
    { id: 1, title: 'Course with degree', degreeLevelId: 1, department: '', description: '', credits: 3 },
    { id: 2, title: 'Course without degree', degreeLevelId: null, department: '', description: '', credits: 2 },
  ] }),
}))
afterEach(cleanup)
it('filters by real degree and retains unmatched courses in All; arrow keys update tab focus', () => {
  render(<MemoryRouter><ProgramsExplorer /></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'Course without degree' })).toBeTruthy()
  const all = screen.getByRole('tab', { name: 'All programs' })
  all.focus(); fireEvent.keyDown(all, { key: 'ArrowRight' })
  const degree = screen.getByRole('tab', { name: 'Published degree' })
  expect(document.activeElement).toBe(degree)
  expect(degree.getAttribute('aria-selected')).toBe('true')
  expect(screen.queryByRole('link', { name: 'Course without degree' })).toBeNull()
  fireEvent.click(all)
  expect(screen.getByRole('link', { name: 'Course without degree' })).toBeTruthy()
})
