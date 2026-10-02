import { Link, useParams } from 'react-router-dom'
import { useExcellenceDomain, useExcellenceList } from '../api/hooks'
import { ExcellenceItemCard } from '../components/ExcellenceCard'
import PageHeader from '../components/PageHeader'
import { EmptyState, ErrorState, Loading } from '../components/states'

export default function ExcellenceDomainPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { data: domain, loading, error, refetch } = useExcellenceDomain(slug)
  const {
    data: items,
    loading: itemsLoading,
    error: itemsError,
    refetch: refetchItems,
  } = useExcellenceList({ domain: slug, limit: 50, sort: 'year', order: 'desc' })

  if (loading) return <Loading label="Loading category…" />
  if (error || !domain) return <ErrorState error={error} onRetry={refetch} />

  return (
    <section>
      <PageHeader title={domain.name} subtitle={domain.description || undefined} eyebrow="Excellence" />
      <div className="quick-links">
        <Link className="btn" to="/excellence">
          All excellence
        </Link>
      </div>
      {itemsLoading && <Loading label="Loading achievements…" />}
      {itemsError && <ErrorState error={itemsError} onRetry={refetchItems} title="Could not load achievements" />}
      {!itemsLoading && !itemsError && items.length === 0 && (
        <EmptyState message="No achievements in this category yet." />
      )}
      {!itemsLoading && !itemsError && items.length > 0 && (
        <div className="course-grid">
          {items.map((item) => (
            <ExcellenceItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}
