import { Link } from 'react-router-dom'
import type { Course } from '../api/types'

export default function CourseCard({ course, to }: { course: Course; to?: string }) {
  return (
    <article className="course-card">
      <div className="course-card-header">
        <span className="course-code">{course.code ?? '—'}</span>
        <span className="course-credits">{course.credits ?? 0} cr</span>
      </div>
      <h3>{to ? <Link to={to}>{course.title}</Link> : course.title}</h3>
      {course.description && <p>{course.description}</p>}
      {course.department && <span className="course-dept">{course.department}</span>}
    </article>
  )
}
