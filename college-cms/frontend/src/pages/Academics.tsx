import { Link } from 'react-router-dom'
import { useCourseList, useDegreeLevelList, useStreamList } from '../api/hooks'
import CourseCard from '../components/CourseCard'
import { EmptyState, Loading } from '../components/states'
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
  const { data: courses, loading } = useCourseList({ limit: 100, sort: 'sortOrder' })
  if (loading) return <Loading label="Loading courses…" />
  if (courses.length === 0) return <EmptyState message="No courses available yet." />
  return (
    <section aria-label="Courses">
      <h2>All courses</h2>
      <div className="course-grid">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} to={`/academics/courses/${course.id}`} />
        ))}
      </div>
    </section>
  )
}

export default function Academics() {
  return (
    <CmsSection slug="academics">
      <DegreeLevels />
      <DepartmentLinks />
      <AllCourses />
    </CmsSection>
  )
}
