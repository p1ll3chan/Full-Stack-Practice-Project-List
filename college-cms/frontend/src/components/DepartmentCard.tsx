import { Link } from 'react-router-dom'
import type { Stream } from '../api/types'
import MediaImage from './MediaImage'
import { IconArrowRight } from './icons'

// One real link per card: the title. Its ::after stretches over the whole card (see index.css).
export default function DepartmentCard({ stream, image }: { stream: Stream; image?: { url: string | null; altText: string } | null }) {
  return (
    <article className="dept-card">
      <div className="dept-card-media">
        <MediaImage media={image ?? null} alt={stream.name} />
      </div>
      <div className="dept-card-body">
        {stream.category && <span className="card-eyebrow">{stream.category}</span>}
        <h3 className="card-title">
          <Link to={`/departments/${stream.slug}`} className="card-stretched">
            {stream.name}
          </Link>
        </h3>
        {stream.tagline && <p className="dept-tagline card-clamp">{stream.tagline}</p>}
        {stream.shortDescription && <p className="dept-desc card-clamp">{stream.shortDescription}</p>}
        <div className="card-footer">
          <span className="card-cta">
            View details <IconArrowRight />
          </span>
        </div>
      </div>
    </article>
  )
}
