import SectionError from './SectionError'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStreamList } from '../api/hooks'
import DepartmentCard from './DepartmentCard'
import { CardGridSkeleton } from './states'

export default function DepartmentCarousel() {
  const { data, loading, error, refetch } = useStreamList({ limit: 6, sort: 'sortOrder' })
  const rail = useRef<HTMLUListElement>(null)
  const drag = useRef<{ x: number; scroll: number; moved: boolean } | null>(null)
  const [edges, setEdges] = useState({ start: true, end: true })
  const id = useId()
  const measure = () => { const el = rail.current; if (el) setEdges({ start: el.scrollLeft < 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 }) }
  useEffect(() => {
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    if (rail.current) observer?.observe(rail.current)
    return () => observer?.disconnect()
  }, [data])
  function move(direction: number) {
    const el = rail.current
    if (el) el.scrollBy({ left: direction * ((el.firstElementChild?.getBoundingClientRect().width || 300) + 24), behavior: 'instant' })
  }
  if (loading) return <CardGridSkeleton label="Loading departments…" />
  if (error) return <SectionError label="Highlights" onRetry={refetch} />
  if (!data.length) return null
  return <section className="home-section" aria-labelledby={`${id}-heading`}>
    <div className="section-heading"><div><p className="eyebrow">Find your department</p><h2 id={`${id}-heading`}>Departments</h2></div><div className="rail-actions"><button type="button" className="round-button" aria-label="Previous departments" aria-controls={id} disabled={edges.start} onClick={() => move(-1)}>←</button><button type="button" className="round-button" aria-label="Next departments" aria-controls={id} disabled={edges.end} onClick={() => move(1)}>→</button></div></div>
    <ul ref={rail} id={id} className="department-rail" tabIndex={0} aria-label="Department cards" onScroll={measure}
      onKeyDown={event => { if (event.target === event.currentTarget && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1) } }}
      onPointerDown={event => { if (event.pointerType === 'mouse' && event.button === 0) drag.current = { x: event.clientX, scroll: event.currentTarget.scrollLeft, moved: false } }}
      onPointerMove={event => { if (!drag.current || !event.buttons) return; const delta = event.clientX - drag.current.x; if (Math.abs(delta) > 6) { drag.current.moved = true; event.currentTarget.scrollLeft = drag.current.scroll - delta; event.preventDefault() } }}
      onPointerLeave={() => { drag.current = null }}
      onClickCapture={event => { if (drag.current?.moved) { event.preventDefault(); event.stopPropagation() } drag.current = null }}>
      {data.map(stream => <li key={stream.id}><DepartmentCard stream={stream} /></li>)}
    </ul>
    <Link className="text-link section-more" to="/departments">All departments <span aria-hidden="true">↗</span></Link>
  </section>
}
