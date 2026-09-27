import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import type { Page } from '../api/types'

interface Stats {
  pages: number
  courses: number
  faculty: number
}

export default function Dashboard() {
  const { data: stats, loading, error } = useApi<Stats>('/admin/stats')
  const { data: pages } = useApi<Page[]>('/pages')

  if (loading) return <p>Loading dashboard...</p>
  if (error) return <p className="error">Failed to load stats: {error}</p>

  return (
    <section>
      <h1>Admin Dashboard</h1>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-value">{stats?.pages ?? '—'}</span>
          <span className="stat-label">Pages</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.courses ?? '—'}</span>
          <span className="stat-label">Courses</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.faculty ?? '—'}</span>
          <span className="stat-label">Faculty</span>
        </div>
      </div>
      <div className="admin-actions">
        <Link to="/admin/pages/new" className="btn">
          New Page
        </Link>
        <Link to="/admin/courses/new" className="btn">
          New Course
        </Link>
      </div>
      <h2>Pages</h2>
      <ul className="admin-list">
        {pages?.map((p) => (
          <li key={p.id}>
            <Link to={`/admin/pages/${p.id}`}>{p.title}</Link>
            <span className={`badge ${p.published ? 'badge-live' : 'badge-draft'}`}>
              {p.published ? 'Published' : 'Draft'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
