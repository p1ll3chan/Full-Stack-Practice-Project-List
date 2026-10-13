import { RevealList } from '../components/Reveal'
import { useExcellenceDomains, useExcellenceList } from '../api/hooks'
import { ExcellenceDomainCard, ExcellenceItemCard } from '../components/ExcellenceCard'
import ResultsCount from '../components/ResultsCount'
import { CardGridSkeleton, EmptyState, ErrorState } from '../components/states'
import CmsSection from './CmsSection'

function DomainGrid() {
  const { data: domains, loading, error, refetch } = useExcellenceDomains({ limit: 50 })

  if (loading) return <CardGridSkeleton label="Loading categories…" />
  if (error) return <ErrorState error={error} onRetry={refetch} title="Could not load categories" />
  if (domains.length === 0) return <EmptyState message="No excellence categories yet." />

  return (
    <section aria-label="Excellence categories">
      <h2>Categories</h2>
      <RevealList>
        {domains.map((domain) => (
          <li key={domain.id}>
            <ExcellenceDomainCard domain={domain} />
          </li>
        ))}
      </RevealList>
    </section>
  )
}

function RecentHighlights() {
  const { data: items, loading, error, refetch } = useExcellenceList({ limit: 12, sort: 'year', order: 'desc' })

  if (loading) return <CardGridSkeleton label="Loading highlights…" />
  if (error) return <ErrorState error={error} onRetry={refetch} title="Could not load highlights" />
  if (items.length === 0) return <EmptyState message="No achievements recorded yet." />

  return (
    <section aria-label="Recent highlights">
      <h2>Highlights</h2>
      <ResultsCount count={items.length} singular="achievement" plural="achievements" />
      <RevealList>
        {items.map((item) => (
          <li key={item.id}>
            <ExcellenceItemCard item={item} />
          </li>
        ))}
      </RevealList>
    </section>
  )
}

export default function Excellence() {
  return (
    <CmsSection slug="excellence" eyebrow="Achievements" parents={[{ label: 'Home', to: '/' }]}>
      <DomainGrid />
      <RecentHighlights />
    </CmsSection>
  )
}
