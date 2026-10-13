import { Link } from 'react-router-dom'
import type { Course } from '../api/types'
import { IconAward, IconArrowRight, IconBuilding } from './icons'

export default function CourseCard({ course, to }: { course: Course; to?: string }) {
  return (
    <article className="course-card">
      <span className="card-eyebrow course-code">{course.code ?? '—'}</span>
      <h3 className="card-title">
        {to ? (
          <Link to={to} className="card-stretched">
            {course.title}
          </Link>
        ) : (
          course.title
        )}
      </h3>
      {course.description && <p className="card-clamp">{course.description}</p>}
      <ul className="card-facts">
        {course.department && (
          <li className="card-fact">
            <IconBuilding />
            <span className="course-dept">{course.department}</span>
          </li>
        )}
        {course.credits != null && <li className="card-fact">
          <IconAward />
          <span className="course-credits">{course.credits} cr</span>
        </li>}
      </ul>
      {to && (
        <div className="card-footer">
          <span className="card-cta">
            View details <IconArrowRight />
          </span>
        </div>
      )}
    </article>
  )
}
