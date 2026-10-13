import { RevealList } from '../components/Reveal'
import { useFacultyList } from '../api/hooks'
import FacultyCard from '../components/FacultyCard'
import ResultsCount from '../components/ResultsCount'
import StreamNav from '../components/StreamNav'
import { CardGridSkeleton, EmptyState, ErrorState } from '../components/states'
import CmsSection from './CmsSection'

function FacultyGrid() {
  const { data: members, loading, error, refetch } = useFacultyList({ limit: 100, sort: 'name' })

  if (loading) return <CardGridSkeleton label="Loading faculty…" />
  if (error) return <ErrorState error={error} onRetry={refetch} title="Could not load faculty" />
  if (members.length === 0) return <EmptyState message="No faculty members have been published yet." />

  return (
    <>
      <h2 className="visually-hidden">Faculty members</h2>
      <ResultsCount count={members.length} singular="faculty member" plural="faculty members" />
      <RevealList>
        {members.map((member) => (
          <li key={member.id}>
            <FacultyCard member={member} />
          </li>
        ))}
      </RevealList>
    </>
  )
}

export default function Faculty() {
  return (
    <CmsSection slug="faculty" eyebrow="People" parents={[{ label: 'Home', to: '/' }]}>
      <StreamNav base="/faculty/streams" allTo="/faculty" allLabel="All faculty" />
      <FacultyGrid />
    </CmsSection>
  )
}
