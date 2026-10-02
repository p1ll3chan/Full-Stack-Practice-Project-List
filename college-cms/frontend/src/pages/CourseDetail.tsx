import { Link, useParams } from 'react-router-dom'
import { useAllStreams, useCourseById } from '../api/hooks'
import PageHeader from '../components/PageHeader'
import { ErrorState, Loading, NotFoundPage } from '../components/states'

export default function CourseDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const valid = /^\d+$/.test(id)
  const { data: course, loading, error, refetch } = useCourseById(valid ? id : undefined)
  const { data: streams } = useAllStreams()

  if (!valid) return <NotFoundPage message="That course address is not valid." />
  if (loading) return <Loading label="Loading course…" />
  if (error || !course) return <ErrorState error={error} onRetry={refetch} />

  const stream = course.streamId != null ? streams.find((s) => s.id === course.streamId) : undefined

  return (
    <section>
      <PageHeader
        title={course.title}
        eyebrow={course.code ?? undefined}
        subtitle={course.department || undefined}
      />
      <p className="course-meta">
        {course.credits != null && <span>{course.credits} credits</span>}
        {stream && (
          <span>
            <Link to={`/departments/${stream.slug}`}>{stream.name}</Link>
          </span>
        )}
      </p>
      {course.description && <p>{course.description}</p>}
      <div className="quick-links">
        <Link className="btn" to="/academics">
          All academics
        </Link>
        {stream && (
          <Link className="btn" to={`/academics/streams/${stream.slug}`}>
            Department details
          </Link>
        )}
      </div>
    </section>
  )
}
