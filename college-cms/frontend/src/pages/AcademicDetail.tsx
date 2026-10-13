import SectionNav from '../components/SectionNav'
import { Link, useParams } from 'react-router-dom'
import { useAcademicDetails } from '../api/hooks'
import CourseNav from '../components/CourseNav'
import DetailFacts from '../components/DetailFacts'
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
      <div className="detail-band bleed">
        <div className="detail-band-inner">
          <PageHeader
            title={stream.name}
            subtitle={stream.tagline}
            eyebrow={stream.category || undefined}
            breadcrumbs={[
              { label: 'Home', to: '/' },
              { label: 'Academics', to: '/academics' },
              { label: stream.name },
            ]}
          />
        </div>
      </div>
      <StreamNav base="/academics/streams" activeSlug={stream.slug} />

      <SectionNav sections={[
        ...(hasOverview ? [{ id: 'academic-overview', label: 'Overview' }] : []),
        ...(programs ? [{ id: 'academic-programs', label: 'Programs' }] : []),
        { id: 'academic-summary', label: 'Summary' },
      ]} />
      <div className="detail-layout">
        <div className="detail-main">
          {hasOverview ? (
            <section id="academic-overview"><h2>Overview</h2><RichText doc={details?.overview} /></section>
          ) : (
            <EmptyState message="No overview has been published for this department yet." />
          )}
          {programs && (
            <section id="academic-programs" aria-label="Programmes offered">
              <h2>Programmes offered</h2>
              <div className="programme-text">{programs}</div>
            </section>
          )}
        </div>
        <aside id="academic-summary" className="detail-side" aria-label="Department summary">
          <DetailFacts facts={[{ label: 'Category', value: stream.category }]} />
          <div className="detail-cta">
            <Link className="btn-primary btn" to={`/departments/${stream.slug}`}>
              Department page
            </Link>
          </div>
          <CourseNav streamSlug={stream.slug} />
        </aside>
      </div>
    </section>
  )
}
