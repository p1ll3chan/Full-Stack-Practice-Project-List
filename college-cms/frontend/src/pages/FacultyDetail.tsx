import { Link, useParams } from 'react-router-dom'
import { useFacultyById } from '../api/hooks'
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
      <PageHeader title={member.name} subtitle={member.title} eyebrow={member.department || undefined} />
      {member.bio && <p>{member.bio}</p>}
      {member.email && (
        <p>
          <a href={`mailto:${member.email}`}>{member.email}</a>
        </p>
      )}
      <div className="quick-links">
        <Link className="btn" to="/faculty">
          All faculty
        </Link>
      </div>
    </section>
  )
}
