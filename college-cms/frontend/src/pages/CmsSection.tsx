import type { ReactNode } from 'react'
import { usePageBySlug } from '../api/hooks'
import PageHeader from '../components/PageHeader'
import PageBlocks from '../components/PageBlocks'
import { ErrorState, Loading } from '../components/states'

interface CmsSectionProps {
  slug: string
  children?: ReactNode
}

export default function CmsSection({ slug, children }: CmsSectionProps) {
  const { data: page, loading, error, refetch } = usePageBySlug(slug)

  if (loading) return <Loading label="Loading page…" />
  if (error || !page) return <ErrorState error={error} onRetry={refetch} />

  return (
    <section>
      <PageHeader title={page.title} />
      <PageBlocks blocks={page.blocks} />
      {children}
    </section>
  )
}
