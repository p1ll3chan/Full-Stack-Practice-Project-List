import { useParams } from 'react-router-dom'
import { usePageBySlug } from '../api/hooks'
import PageBlocks from '../components/PageBlocks'
import PageHeader from '../components/PageHeader'
import { ErrorState, Loading } from '../components/states'

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: page, loading, error, refetch } = usePageBySlug(slug ?? '')

  if (loading) return <Loading label="Loading page…" />
  if (error || !page) return <ErrorState error={error} onRetry={refetch} />

  return (
    <section>
      <PageHeader title={page.title} />
      <PageBlocks blocks={page.blocks} />
    </section>
  )
}
