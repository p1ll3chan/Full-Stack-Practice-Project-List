import { Link, useParams } from 'react-router-dom'
import { useFacultyById } from '../api/hooks'
import DetailFacts from '../components/DetailFacts'
import PageHeader from '../components/PageHeader'
import { ErrorState, Loading, NotFoundPage } from '../components/states'

export default function FacultyDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const valid = /^\d+$/.test(id)
  const { data: member, loading, error, refetch } = useFacultyById(valid ? id : undefined)

  if (!valid) return <NotFoundPage message="That faculty address is not valid." />
  if (loading) return <Loading label="Loading faculty member…" />
  if (error || !member) return <ErrorState error={error} onRetry={refetch} />

  return (
    <section>
      <div className="detail-band bleed">
        <div className="detail-band-inner">
          <PageHeader
            title={member.name}
            subtitle={member.title}
            eyebrow={member.department || undefined}
            breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Faculty', to: '/faculty' }, { label: member.name }]}
          />
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          {member.bio ? (
            <div className="prose">
              <p>{member.bio}</p>
            </div>
          ) : (
            <p className="empty-hint">No biography has been published yet.</p>
          )}
        </div>

        <aside className="detail-side" aria-label="Faculty summary">
          <DetailFacts
            facts={[
              { label: 'Title', value: member.title },
              { label: 'Department', value: member.department },
              {
                label: 'Email',
                value: member.email ? <a href={`mailto:${member.email}`}>{member.email}</a> : null,
              },
            ]}
          />
          <div className="detail-cta">
            <Link className="btn" to="/faculty">
              All faculty
            </Link>
          </div>
        </aside>
      </div>
    </section>
  )
}
