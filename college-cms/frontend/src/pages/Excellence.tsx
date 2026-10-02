import { useExcellenceDomains, useExcellenceList } from '../api/hooks'
import { ExcellenceDomainCard, ExcellenceItemCard } from '../components/ExcellenceCard'
import { EmptyState, ErrorState, Loading } from '../components/states'
import CmsSection from './CmsSection'

function DomainGrid() {
  const { data: domains, loading, error, refetch } = useExcellenceDomains({ limit: 50 })

  if (loading) return <Loading label="Loading categories…" />
  if (error) return <ErrorState error={error} onRetry={refetch} title="Could not load categories" />
  if (domains.length === 0) return <EmptyState message="No excellence categories yet." />

  return (
    <section aria-label="Excellence categories">
      <h2>Categories</h2>
      <div className="domain-grid">
        {domains.map((domain) => (
          <ExcellenceDomainCard key={domain.id} domain={domain} />
        ))}
      </div>
    </section>
  )
}

function RecentHighlights() {
  const { data: items, loading, error, refetch } = useExcellenceList({ limit: 12, sort: 'year', order: 'desc' })

  if (loading) return <Loading label="Loading highlights…" />
  if (error) return <ErrorState error={error} onRetry={refetch} title="Could not load highlights" />
  if (items.length === 0) return <EmptyState message="No achievements recorded yet." />

  return (
    <section aria-label="Recent highlights">
      <h2>Highlights</h2>
      <div className="course-grid">
        {items.map((item) => (
          <ExcellenceItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

export default function Excellence() {
  return (
    <CmsSection slug="excellence">
      <DomainGrid />
      <RecentHighlights />
    </CmsSection>
  )
}
