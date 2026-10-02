import { useFacultyList } from '../api/hooks'
import FacultyCard from '../components/FacultyCard'
import StreamNav from '../components/StreamNav'
import { EmptyState, ErrorState, Loading } from '../components/states'
import CmsSection from './CmsSection'

function FacultyGrid() {
  const { data: members, loading, error, refetch } = useFacultyList({ limit: 100, sort: 'name' })

  if (loading) return <Loading label="Loading faculty…" />
  if (error) return <ErrorState error={error} onRetry={refetch} title="Could not load faculty" />
  if (members.length === 0) return <EmptyState message="No faculty members have been published yet." />

  return (
    <div className="faculty-grid">
      {members.map((member) => (
        <FacultyCard key={member.id} member={member} />
      ))}
    </div>
  )
}

export default function Faculty() {
  return (
    <CmsSection slug="faculty">
      <StreamNav base="/faculty/streams" allTo="/faculty" allLabel="All faculty" />
      <FacultyGrid />
    </CmsSection>
  )
}
