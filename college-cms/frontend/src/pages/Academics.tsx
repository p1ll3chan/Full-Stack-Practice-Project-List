import CourseCard from '../components/CourseCard'
import { useApi } from '../hooks/useApi'
import type { Course } from '../api/types'

export default function Academics() {
  const { data: courses, loading, error } = useApi<Course[]>('/academics/courses')

  if (loading) return <p>Loading courses...</p>
  if (error) return <p className="error">Failed to load courses: {error}</p>

  return (
    <section>
      <h1>Academics</h1>
      <div className="course-grid">
        {courses?.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </section>
  )
}
