import { useState } from 'react'
import { RevealList } from '../components/Reveal'
import { Link } from 'react-router-dom'
import { useCourseList, useDegreeLevelList, useStreamList } from '../api/hooks'
import CourseCard from '../components/CourseCard'
import ResultsCount from '../components/ResultsCount'
import { CardGridSkeleton, EmptyState, Loading } from '../components/states'
import CmsSection from './CmsSection'

function DegreeLevels() {
  const { data: levels, loading } = useDegreeLevelList({ limit: 50 })
  if (loading) return <Loading label="Loading degree levels…" />
  if (levels.length === 0) return null
  return (
    <section aria-label="Degree levels">
      <h2>Degree levels</h2>
      <div className="chip-row">
        {levels.map((level) => (
          <span key={level.id} className="chip">
            {level.name}
          </span>
        ))}
      </div>
    </section>
  )
}

function DepartmentLinks() {
  const { data: streams, loading } = useStreamList({ limit: 100, sort: 'sortOrder' })
  if (loading) return <Loading label="Loading departments…" />
  if (streams.length === 0) return null
  return (
    <section aria-label="Departments">
      <h2>Departments</h2>
      <div className="chip-row">
        {streams.map((stream) => (
          <Link key={stream.id} to={`/academics/streams/${stream.slug}`} className="chip">
            {stream.name}
          </Link>
        ))}
      </div>
    </section>
  )
}

function AllCourses() {
  const [department, setDepartment] = useState('')
  const { data: courses, loading } = useCourseList({ limit: 100, sort: 'sortOrder' })
  if (loading) {
    return (
      <section aria-label="Courses">
        <h2>All courses</h2>
        <CardGridSkeleton label="Loading courses…" />
      </section>
    )
  }
  if (courses.length === 0) return <EmptyState message="No courses available yet." />
  const departments = [...new Set(courses.map(course => course.department).filter(Boolean))]
  const filtered = courses.filter(course => !department || course.department === department)
  return (
    <section aria-label="Courses">
      <h2>All courses</h2>
      <div className="filter-chips" role="group" aria-label="Program departments">{['', ...departments].map(value => <button type="button" key={value} className="chip" aria-pressed={department === value} onClick={() => setDepartment(value)}>{value || 'All courses'}</button>)}</div>
      <ResultsCount count={filtered.length} singular="course" plural="courses" />
      <RevealList>
        {filtered.map((course) => (
          <li key={course.id}>
            <CourseCard course={course} to={`/academics/courses/${course.id}`} />
          </li>
        ))}
      </RevealList>
    </section>
  )
}

export default function Academics() {
  return (
    <CmsSection slug="academics" eyebrow="Programmes" parents={[{ label: 'Home', to: '/' }]}>
      <DegreeLevels />
      <DepartmentLinks />
      <AllCourses />
    </CmsSection>
  )
}
