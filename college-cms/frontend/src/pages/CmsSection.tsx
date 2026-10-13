import PagePhoto from '../components/PagePhoto'
import Reveal from '../components/Reveal'
import type { ReactNode } from 'react'
import { usePageBySlug } from '../api/hooks'
import Hero, { type HeroCta } from '../components/Hero'
import PageHeader, { type Crumb } from '../components/PageHeader'
import PageBlocks from '../components/PageBlocks'
import { ErrorState, Loading } from '../components/states'

interface CmsSectionProps {
  slug: string
  children?: ReactNode
  /** render the page title as a full-width hero instead of the plain page header */
  hero?: { eyebrow?: string; ctas?: HeroCta[] }
  /** breadcrumb trail above the page title; the CMS page title is appended as the current page */
  parents?: Crumb[]
  eyebrow?: string
}

export default function CmsSection({ slug, children, hero, parents, eyebrow }: CmsSectionProps) {
  const { data: page, loading, error, refetch } = usePageBySlug(slug)

  if (loading) return <Loading label="Loading page…" />
  if (error || !page) return <ErrorState error={error} onRetry={refetch} />

  return (
    <section className={slug === 'home' ? 'home-page' : undefined}>
      <div className={['academics', 'faculty', 'excellence'].includes(slug) ? 'photo-page-intro' : undefined}>
      {hero ? (
        <Hero title={page.title} eyebrow={hero.eyebrow} ctas={hero.ctas} />
      ) : (
        <PageHeader
          title={page.title}
          eyebrow={eyebrow}
          breadcrumbs={parents ? [...parents, { label: page.title }] : undefined}
        />
      )}
      <PagePhoto section={slug} />
      </div>
      <Reveal className={slug === 'home' ? 'home-about' : 'cms-intro'}><div className="prose">
        <PageBlocks blocks={page.blocks} />
      </div></Reveal>
      {children}
    </section>
  )
}
