import type { Course } from '../api/types'

export default function CourseCard({ course }: { course: Course }) {
  return (
    <article className="course-card">
      <div className="course-card-header">
        <span className="course-code">{course.code}</span>
        <span className="course-credits">{course.credits} cr</span>
      </div>
      <h3>{course.title}</h3>
      <p>{course.description}</p>
      <span className="course-dept">{course.department}</span>
    </article>
  )
}
