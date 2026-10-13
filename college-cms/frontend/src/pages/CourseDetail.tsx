import SectionNav from '../components/SectionNav'
import DepartmentCard from '../components/DepartmentCard'
import { RevealGrid } from '../components/Reveal'
import { Link, useParams } from 'react-router-dom'
import { useAllStreams, useCourseById } from '../api/hooks'
import DetailFacts from '../components/DetailFacts'
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
      <div className="detail-band bleed">
        <div className="detail-band-inner">
          <PageHeader
            title={course.title}
            eyebrow={course.code ?? undefined}
            subtitle={course.department || undefined}
            breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Academics', to: '/academics' }, { label: course.title }]}
          />
        </div>
      </div>

      <SectionNav sections={[
        ...(course.description ? [{ id: 'course-overview', label: 'Overview' }] : []),
        { id: 'course-summary', label: 'Summary' },
        ...(stream ? [{ id: 'course-related', label: 'Department' }] : []),
      ]} />
      <div className="detail-layout">
        <div className="detail-main">
          {course.description ? (
            <div className="prose" id="course-overview"><h2>Overview</h2>
              <p>{course.description}</p>
            </div>
          ) : (
            <p className="empty-hint">No description has been published for this course yet.</p>
          )}
        </div>

        <aside id="course-summary" className="detail-side" aria-label="Course summary">
          <DetailFacts
            facts={[
              { label: 'Course code', value: course.code },
              { label: 'Credits', value: course.credits != null ? `${course.credits} credits` : null },
              {
                label: 'Department',
                value: stream?.name || course.department,
              },
            ]}
          />
          <div className="detail-cta">
            {stream && (
              <Link className="btn-primary btn" to={`/academics/streams/${stream.slug}`}>
                Department details
              </Link>
            )}
            <Link className="btn" to="/academics">
              All academics
            </Link>
          </div>
        </aside>
      </div>
      {stream && <section id="course-related" className="related-section"><h2>Related department</h2><RevealGrid><DepartmentCard stream={stream} /></RevealGrid></section>}
    </section>
  )
}
