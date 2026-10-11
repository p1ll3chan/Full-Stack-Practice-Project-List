import type { ReactNode } from 'react'
import { usePageBySlug } from '../api/hooks'
import Hero, { type HeroCta } from '../components/Hero'
import PageHeader from '../components/PageHeader'
import PageBlocks from '../components/PageBlocks'
import { ErrorState, Loading } from '../components/states'

interface CmsSectionProps {
  slug: string
  children?: ReactNode
  /** render the page title as a full-width hero instead of the plain page header */
  hero?: { eyebrow?: string; ctas?: HeroCta[] }
}

export default function CmsSection({ slug, children, hero }: CmsSectionProps) {
  const { data: page, loading, error, refetch } = usePageBySlug(slug)

  if (loading) return <Loading label="Loading page…" />
  if (error || !page) return <ErrorState error={error} onRetry={refetch} />

  return (
    <section>
      {hero ? (
        <Hero title={page.title} eyebrow={hero.eyebrow} ctas={hero.ctas} />
      ) : (
        <PageHeader title={page.title} />
      )}
      <PageBlocks blocks={page.blocks} />
      {children}
    </section>
  )
}
