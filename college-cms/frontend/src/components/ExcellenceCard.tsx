import { Link } from 'react-router-dom'
import type { ExcellenceDomain, ExcellenceItem } from '../api/types'

export function ExcellenceDomainCard({ domain }: { domain: ExcellenceDomain }) {
  const accent = domain.color || undefined
  return (
    <article className="domain-card" style={accent ? { borderTopColor: accent } : undefined}>
      <h3>
        <Link to={`/excellence/domains/${domain.slug}`}>{domain.name}</Link>
      </h3>
      {domain.description && <p>{domain.description}</p>}
    </article>
  )
}

export function ExcellenceItemCard({ item }: { item: ExcellenceItem }) {
  return (
    <article className="excellence-card">
      <div className="course-card-header">
        <span className="course-code">{item.year}</span>
        {item.category && <span className="course-dept">{item.category}</span>}
      </div>
      <h3>{item.title}</h3>
      {item.description && <p>{item.description}</p>}
    </article>
  )
}
