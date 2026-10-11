import { Link, useParams } from 'react-router-dom'
import { useExcellenceDomain, useExcellenceList } from '../api/hooks'
import { ExcellenceItemCard } from '../components/ExcellenceCard'
import PageHeader from '../components/PageHeader'
import ResultsCount from '../components/ResultsCount'
import { CardGridSkeleton, EmptyState, ErrorState, Loading } from '../components/states'

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
      <PageHeader
        title={domain.name}
        subtitle={domain.description || undefined}
        eyebrow="Excellence"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Excellence', to: '/excellence' },
          { label: domain.name },
        ]}
      />
      <div className="quick-links">
        <Link className="btn" to="/excellence">
          All excellence
        </Link>
      </div>
      {itemsLoading && <CardGridSkeleton label="Loading achievements…" />}
      {itemsError && <ErrorState error={itemsError} onRetry={refetchItems} title="Could not load achievements" />}
      {!itemsLoading && !itemsError && items.length === 0 && (
        <EmptyState message="No achievements in this category yet." />
      )}
      {!itemsLoading && !itemsError && items.length > 0 && (
        <>
          <ResultsCount count={items.length} singular="achievement" plural="achievements" />
          <ul className="card-grid">
            {items.map((item) => (
              <li key={item.id}>
                <ExcellenceItemCard item={item} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
