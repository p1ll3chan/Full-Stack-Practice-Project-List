import { useParams } from 'react-router-dom'
import { useFacultyList, useStreamBySlug } from '../api/hooks'
import CourseNav from '../components/CourseNav'
import FacultyCard from '../components/FacultyCard'
import PageHeader from '../components/PageHeader'
import StreamNav from '../components/StreamNav'
import { EmptyState, ErrorState, Loading } from '../components/states'

export default function FacultyStream() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { data: stream, loading, error, refetch } = useStreamBySlug(slug)
  const { data: members, loading: membersLoading, error: membersError, refetch: refetchMembers } = useFacultyList({
    stream: slug,
    limit: 100,
    sort: 'name',
  })

  if (loading) return <Loading label="Loading department…" />
  if (error || !stream) return <ErrorState error={error} onRetry={refetch} />

  return (
    <section>
      <PageHeader title={stream.name} subtitle={stream.tagline} eyebrow="Faculty" />
      <StreamNav base="/faculty/streams" activeSlug={stream.slug} />

      <div className="detail-layout">
        <div className="detail-main">
          {membersLoading && <Loading label="Loading faculty…" />}
          {membersError && <ErrorState error={membersError} onRetry={refetchMembers} title="Could not load faculty" />}
          {!membersLoading && !membersError && members.length === 0 && (
            <EmptyState
              message="No faculty members are listed for this department yet."
              hint="Check the other departments in the navigation above."
            />
          )}
          {!membersLoading && !membersError && members.length > 0 && (
            <div className="faculty-grid">
              {members.map((member) => (
                <FacultyCard key={member.id} member={member} streamSlug={stream.slug} />
              ))}
            </div>
          )}
        </div>
        <aside className="detail-side">
          <CourseNav streamSlug={stream.slug} />
        </aside>
      </div>
    </section>
  )
}
