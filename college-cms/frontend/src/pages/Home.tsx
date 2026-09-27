import { Link } from 'react-router-dom'
import ContentBlock from '../components/ContentBlock'
import { useApi } from '../hooks/useApi'
import type { Page } from '../api/types'

export default function Home() {
  const { data: page, loading, error } = useApi<Page>('/pages/home')

  if (loading) return <p>Loading...</p>
  if (error) return <p className="error">Failed to load home page: {error}</p>
  if (!page) return null

  return (
    <section>
      {page.blocks.map((block) => (
        <ContentBlock key={block.id} block={block} />
      ))}
      <div className="quick-links">
        <Link to="/academics">Browse Academics</Link>
        <Link to="/faculty">Meet the Faculty</Link>
      </div>
    </section>
  )
}
