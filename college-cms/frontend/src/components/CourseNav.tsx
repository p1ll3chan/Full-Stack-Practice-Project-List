import { NavLink } from 'react-router-dom'
import { useCourseList } from '../api/hooks'
import { Loading } from './states'

export default function CourseNav({ streamSlug }: { streamSlug: string }) {
  const { data: courses, loading } = useCourseList({ stream: streamSlug, limit: 100, sort: 'sortOrder' })

  if (loading) return <Loading label="Loading courses…" />
  if (courses.length === 0) return null

  return (
    <nav className="course-nav" aria-label="Courses in this department">
      <h2 className="nav-heading">Courses</h2>
      <ul className="course-nav-list">
        {courses.map((course) => (
          <li key={course.id}>
            <NavLink to={`/academics/courses/${course.id}`} className="course-nav-link">
              {course.code && <span className="course-code">{course.code}</span>}
              <span>{course.title}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
