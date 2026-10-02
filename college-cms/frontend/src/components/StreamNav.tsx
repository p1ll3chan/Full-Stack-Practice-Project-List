import { NavLink } from 'react-router-dom'
import { useAllStreams } from '../api/hooks'
import { Loading } from './states'

interface StreamNavProps {
  base: string
  activeSlug?: string
  allLabel?: string
  allTo?: string
}

export default function StreamNav({ base, activeSlug, allLabel, allTo }: StreamNavProps) {
  const { data: streams, loading, error } = useAllStreams()

  if (loading) return <Loading label="Loading departments…" />
  if (error || streams.length === 0) return null

  return (
    <nav className="stream-nav" aria-label="Departments">
      {allTo && (
        <NavLink to={allTo} end className={({ isActive }) => (isActive && !activeSlug ? 'chip active' : 'chip')}>
          {allLabel ?? 'All'}
        </NavLink>
      )}
      {streams.map((stream) => (
        <NavLink
          key={stream.id}
          to={`${base}/${stream.slug}`}
          className={({ isActive }) => (isActive || stream.slug === activeSlug ? 'chip active' : 'chip')}
        >
          {stream.name}
        </NavLink>
      ))}
    </nav>
  )
}
