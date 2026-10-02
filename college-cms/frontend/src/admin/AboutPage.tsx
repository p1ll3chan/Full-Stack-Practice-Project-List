import { useQuery } from '@tanstack/react-query'
import { Navigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { adminKeys } from '../api/queryKeys'
import type { PageListItem } from '../api/types'
import { EmptyState, ErrorState, Loading } from '../components/states'
import { qs } from './api'

export default function AboutPage() {
  const params = { q: 'about', limit: 50, sort: 'slug', order: 'asc' as const }
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.pages.of(params),
    queryFn: () => api.list<PageListItem>(`/admin/pages${qs(params)}`),
  })

  if (isLoading) return <Loading label="Looking for the About page…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const about = (data?.data ?? []).find((page) => page.slug === 'about')

  if (about) return <Navigate to={`/admin/pages/${about.id}`} replace />

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <h1>About us</h1>
      </div>
      <EmptyState
        message="No About page exists yet."
        hint="The public site reads the page with slug “about”. Create it and set the section to “about”."
      />
      <div className="editor-actions">
        <Link to="/admin/pages/new?section=about&title=About%20us" className="btn-primary">
          Create the About page
        </Link>
        <Link to="/admin/pages" className="btn">
          All pages
        </Link>
      </div>
    </section>
  )
}
