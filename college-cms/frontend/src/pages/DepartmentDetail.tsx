import { Link, useParams } from 'react-router-dom'
import { useCourseList, useStreamBySlug } from '../api/hooks'
import CourseCard from '../components/CourseCard'
import PageHeader from '../components/PageHeader'
import { EmptyState, ErrorState, Loading } from '../components/states'

export default function DepartmentDetail() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { data: stream, loading, error, refetch } = useStreamBySlug(slug)
  const { data: courses, loading: coursesLoading } = useCourseList({
    stream: slug,
    limit: 100,
    sort: 'sortOrder',
  })

  if (loading) return <Loading label="Loading department…" />
  if (error || !stream) return <ErrorState error={error} onRetry={refetch} />

  return (
    <section>
      <PageHeader title={stream.name} subtitle={stream.tagline} eyebrow={stream.category || undefined} />
      {stream.shortDescription && <p>{stream.shortDescription}</p>}

      <div className="quick-links">
        <Link className="btn-primary btn" to={`/academics/streams/${stream.slug}`}>
          Academic details
        </Link>
        <Link className="btn" to={`/faculty/streams/${stream.slug}`}>
          Faculty
        </Link>
      </div>

      {stream.degreeLevels.length > 0 && (
        <section aria-label="Degree levels offered">
          <h2>Degree levels offered</h2>
          <div className="chip-row">
            {stream.degreeLevels.map((level) => (
              <span key={level.id} className="chip">
                {level.name}
              </span>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Courses">
        <h2>Courses</h2>
        {coursesLoading && <Loading label="Loading courses…" />}
        {!coursesLoading && courses.length === 0 && <EmptyState message="No courses listed for this department yet." />}
        {!coursesLoading && courses.length > 0 && (
          <div className="course-grid">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} to={`/academics/courses/${course.id}`} />
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
