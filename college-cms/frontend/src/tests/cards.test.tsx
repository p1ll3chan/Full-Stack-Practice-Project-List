import { cleanup, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import DepartmentCard from '../components/DepartmentCard'
import CourseCard from '../components/CourseCard'
import FacultyCard from '../components/FacultyCard'
import { ExcellenceDomainCard, ExcellenceItemCard } from '../components/ExcellenceCard'
import type { Course, ExcellenceDomain, ExcellenceItem, FacultyMember, Stream } from '../api/types'

afterEach(cleanup)

const stream: Stream = {
  id: 1,
  slug: 'department-of-physics',
  name: 'Department of Physics',
  tagline: 'Matter, motion and energy',
  shortDescription: 'A short description of the physics department.',
  category: 'Science',
  iconSvg: '',
  imageMediaId: 3,
  sortOrder: 1,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const course: Course = {
  id: 11,
  code: 'PHY101',
  slug: 'intro-physics',
  title: 'Intro to Physics',
  description: 'Mechanics and waves.',
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
  name: 'Dr. Ada Lovelace',
  title: 'Professor',
  department: 'Computer Science',
  email: 'ada@college.edu',
  bio: 'Pioneer of computing.',
  streamId: 1,
  photoMediaId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const domain: ExcellenceDomain = {
  id: 1,
  slug: 'awards',
  name: 'Awards',
  description: 'Institutional awards.',
  color: '#16213e',
  sortOrder: 1,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const item: ExcellenceItem = {
  id: 2,
  title: 'Best Department Award',
  category: 'Institutional',
  description: 'Awarded in 2025.',
  year: 2025,
  domainId: 1,
  sortOrder: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function renderCard(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('cards', () => {
  it('renders department data from the API', () => {
    renderCard(<DepartmentCard stream={stream} />)
    expect(screen.getByRole('heading', { name: 'Department of Physics' })).toBeTruthy()
    expect(screen.getByText('Matter, motion and energy')).toBeTruthy()
    expect(screen.getByText('Science')).toBeTruthy()
    const links = screen.getAllByRole('link', { name: /Department of Physics/ })
    for (const link of links) expect(link.getAttribute('href')).toBe('/departments/department-of-physics')
  })

  it('renders course data with a detail link', () => {
    renderCard(<CourseCard course={course} to={`/academics/courses/${course.id}`} />)
    expect(screen.getByText('PHY101')).toBeTruthy()
    expect(screen.getByText('4 cr')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Intro to Physics' })
    expect(link.getAttribute('href')).toBe('/academics/courses/11')
  })

  it('renders faculty data with a mail link', () => {
    renderCard(<FacultyCard member={member} />)
    expect(screen.getByRole('heading', { name: 'Dr. Ada Lovelace' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'ada@college.edu' })).toBeTruthy()
  })

  it('renders excellence domain and item data', () => {
    renderCard(<ExcellenceDomainCard domain={domain} />)
    expect(screen.getByRole('link', { name: 'Awards' }).getAttribute('href')).toBe('/excellence/domains/awards')

    renderCard(<ExcellenceItemCard item={item} />)
    expect(screen.getByRole('heading', { name: 'Best Department Award' })).toBeTruthy()
    expect(screen.getByText('2025')).toBeTruthy()
  })
})
