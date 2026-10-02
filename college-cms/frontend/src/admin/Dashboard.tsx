import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { AdminStats } from '../api/types'
import { ErrorState, Loading } from '../components/states'

function StatCard({ label, value, detail }: { label: string; value: number | undefined; detail?: string }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
      {detail && <span className="stat-detail">{detail}</span>}
    </div>
  )
}

export default function Dashboard() {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.stats(),
    queryFn: () => api.get<AdminStats>('/admin/stats'),
  })

  if (isLoading) return <Loading label="Loading dashboard…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  return (
    <section className="admin-page">
      <h1>Dashboard</h1>
      <p className="admin-subtitle">Content status across the site.</p>
      <div className="stat-grid">
        <StatCard
          label="Pages"
          value={stats?.pages}
          detail={`${stats?.pagesPublished ?? 0} published · ${stats?.pagesDraft ?? 0} drafts`}
        />
        <StatCard
          label="Departments"
          value={stats?.streams}
          detail={`${stats?.streamsActive ?? 0} active`}
        />
        <StatCard label="Courses" value={stats?.courses} detail={`${stats?.coursesActive ?? 0} active`} />
        <StatCard label="Faculty" value={stats?.faculty} />
        <StatCard label="Excellence items" value={stats?.excellence} />
        <StatCard label="Media" value={stats?.media} />
      </div>
      <div className="quick-actions">
        <Link to="/admin/pages/new" className="btn-primary">
          New page
        </Link>
        <Link to="/admin/departments" className="btn">
          Manage departments
        </Link>
        <Link to="/admin/faculty/new" className="btn">
          Add faculty member
        </Link>
        <Link to="/admin/media" className="btn">
          Media library
        </Link>
      </div>
      {(stats?.pagesDraft ?? 0) > 0 && (
        <p className="admin-note">
          <Link to="/admin/pages">Review draft pages</Link> before they go live.
        </p>
      )}
    </section>
  )
}
