import type { ReactNode } from 'react'

export interface DetailFact {
  label: string
  value: ReactNode
}

/** Key facts for a detail sidebar. Facts with an empty value are skipped. */
export default function DetailFacts({ facts }: { facts: DetailFact[] }) {
  const visible = facts.filter((fact) => fact.value !== null && fact.value !== undefined && fact.value !== '')
  if (visible.length === 0) return null
  return (
    <dl className="fact-list">
      {visible.map((fact) => (
        <div key={fact.label} className="fact-item">
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}
