import { Link } from 'react-router-dom'
import type { ExcellenceDomain, ExcellenceItem } from '../api/types'
import { IconArrowRight, IconCalendar, IconTag } from './icons'

export function ExcellenceDomainCard({ domain }: { domain: ExcellenceDomain }) {
  const accent = domain.color || undefined
  return (
    <article className="domain-card" style={accent ? { borderTopColor: accent } : undefined}>
      <h3 className="card-title">
        <Link to={`/excellence/domains/${domain.slug}`} className="card-stretched">
          {domain.name}
        </Link>
      </h3>
      {domain.description && <p className="card-clamp">{domain.description}</p>}
      <div className="card-footer">
        <span className="card-cta">
          View details <IconArrowRight />
        </span>
      </div>
    </article>
  )
}

export function ExcellenceItemCard({ item }: { item: ExcellenceItem }) {
  return (
    <article className="excellence-card">
      <h3 className="card-title">{item.title}</h3>
      {item.description && <p className="card-clamp">{item.description}</p>}
      <ul className="card-facts">
        <li className="card-fact">
          <IconCalendar />
          <span>{item.year}</span>
        </li>
        {item.category && (
          <li className="card-fact">
            <IconTag />
            <span>{item.category}</span>
          </li>
        )}
      </ul>
    </article>
  )
}
