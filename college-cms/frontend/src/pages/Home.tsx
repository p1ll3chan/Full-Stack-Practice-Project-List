import { Link } from 'react-router-dom'
import { useStreamList } from '../api/hooks'
import DepartmentCard from '../components/DepartmentCard'
import CmsSection from './CmsSection'
import { EmptyState, Loading } from '../components/states'

function DepartmentPreview() {
  const { data: streams, loading, error } = useStreamList({ limit: 6, sort: 'sortOrder' })

  return (
    <section className="home-preview">
      <h2>Departments</h2>
      {loading && <Loading label="Loading departments…" />}
      {!loading && error && <p className="error">Departments are unavailable right now.</p>}
      {!loading && !error && streams.length === 0 && <EmptyState message="No departments to show yet." />}
      {!loading && !error && streams.length > 0 && (
        <>
          <div className="dept-grid">
            {streams.map((stream) => (
              <DepartmentCard key={stream.id} stream={stream} />
            ))}
          </div>
          <div className="quick-links">
            <Link to="/departments" className="btn">
              All departments
            </Link>
          </div>
        </>
      )}
    </section>
  )
}

export default function Home() {
  return (
    <CmsSection slug="home">
      <div className="quick-links">
        <Link to="/academics">Browse Academics</Link>
        <Link to="/faculty">Meet the Faculty</Link>
        <Link to="/departments">Explore Departments</Link>
      </div>
      <DepartmentPreview />
    </CmsSection>
  )
}
