import { useParams } from 'react-router-dom'
import { useAcademicDetails } from '../api/hooks'
import CourseNav from '../components/CourseNav'
import PageHeader from '../components/PageHeader'
import RichText from '../components/RichText'
import StreamNav from '../components/StreamNav'
import { EmptyState, ErrorState, Loading } from '../components/states'

export default function AcademicDetail() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { data, loading, error, refetch } = useAcademicDetails(slug)

  if (loading) return <Loading label="Loading department…" />
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />

  const { stream, details } = data
  const hasOverview = details && details.overview.nodes.length > 0
  const programs = details?.programsHtml?.trim()

  return (
    <section>
      <PageHeader title={stream.name} subtitle={stream.tagline} eyebrow={stream.category || undefined} />
      <StreamNav base="/academics/streams" activeSlug={stream.slug} />

      <div className="detail-layout">
        <div className="detail-main">
          {hasOverview ? (
            <RichText doc={details?.overview} />
          ) : (
            <EmptyState message="No overview has been published for this department yet." />
          )}
          {programs && (
            <section aria-label="Programmes offered">
              <h2>Programmes offered</h2>
              <div className="programme-text">{programs}</div>
            </section>
          )}
        </div>
        <aside className="detail-side">
          <CourseNav streamSlug={stream.slug} />
        </aside>
      </div>
    </section>
  )
}
