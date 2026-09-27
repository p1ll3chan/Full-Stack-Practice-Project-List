import { useParams } from 'react-router-dom'
import ContentBlock from '../components/ContentBlock'
import { useApi } from '../hooks/useApi'
import type { Page } from '../api/types'

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: page, loading, error } = useApi<Page>(`/pages/${slug ?? ''}`)

  if (loading) return <p>Loading...</p>
  if (error) return <p className="error">Page not found: {error}</p>
  if (!page) return null

  return (
    <section>
      <h1>{page.title}</h1>
      {page.blocks.map((block) => (
        <ContentBlock key={block.id} block={block} />
      ))}
    </section>
  )
}
