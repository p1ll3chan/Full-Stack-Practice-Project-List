import { Link } from 'react-router-dom'
import type { Stream } from '../api/types'
import MediaImage from './MediaImage'

export default function DepartmentCard({ stream, image }: { stream: Stream; image?: { url: string | null; altText: string } | null }) {
  return (
    <article className="dept-card">
      <Link to={`/departments/${stream.slug}`} className="dept-card-media" aria-label={stream.name}>
        <MediaImage media={image ?? null} alt={stream.name} />
      </Link>
      <div className="dept-card-body">
        {stream.category && <span className="badge dept-badge">{stream.category}</span>}
        <h3>
          <Link to={`/departments/${stream.slug}`}>{stream.name}</Link>
        </h3>
        {stream.tagline && <p className="dept-tagline">{stream.tagline}</p>}
        {stream.shortDescription && <p className="dept-desc">{stream.shortDescription}</p>}
      </div>
    </article>
  )
}
