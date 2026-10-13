import { useId, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAllStreams, useCourseList } from '../api/hooks'
import { ErrorState, Loading } from './states'

function CourseLinks({ slug }: { slug: string }) {
  const { data, loading, error, refetch } = useCourseList({ stream: slug, limit: 100, sort: 'sortOrder' })
  if (loading) return <Loading label="Loading courses…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  return <div className="mega-courses">
    <Link className="mega-overview" to={`/academics/streams/${slug}`}>Department overview <span aria-hidden="true">↗</span></Link>
    {data.map(course => <Link key={course.id} to={`/academics/courses/${course.id}`}>{course.title}<span aria-hidden="true">↗</span></Link>)}
  </div>
}

export default function AcademicMegaMenu({ mobile = false }: { mobile?: boolean }) {
  const { data: streams, loading, error, refetch } = useAllStreams()
  const [selected, setSelected] = useState<string | null>(null)
  const id = useId()
  const active = streams.find(s => s.slug === selected)?.slug ?? (mobile ? null : streams[0]?.slug)
  function onKeys(event: KeyboardEvent<HTMLDivElement>) {
    const current = event.target as HTMLElement
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-category]'))
    const index = buttons.indexOf(current as HTMLButtonElement)
    if (index >= 0 && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
      buttons[next]?.focus()
      if (!mobile) setSelected(streams[next]?.slug ?? null)
    } else if (event.key === 'ArrowRight' && index >= 0) {
      event.preventDefault()
      event.currentTarget.querySelector<HTMLElement>('.mega-courses a')?.focus()
    } else if (event.key === 'ArrowLeft' && current.closest('.mega-courses')) {
      event.preventDefault()
      buttons.find(b => b.getAttribute('aria-expanded') === 'true')?.focus()
    } else if (current.closest('.mega-courses') && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault()
      const links = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('.mega-courses a'))
      links[(links.indexOf(current) + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length]?.focus()
    }
  }
  if (loading) return <Loading label="Loading departments…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!streams.length) return <Link to="/academics">View all programs</Link>
  return <div className={mobile ? 'academic-menu accordion-menu' : 'academic-menu'} onKeyDown={onKeys}>
    <div className="mega-categories">
      <p className="eyebrow">Explore departments</p>
      {streams.map(stream => <div key={stream.id}>
        <button data-category type="button" aria-expanded={active === stream.slug} aria-controls={`${id}-${mobile ? stream.id : 'courses'}`} onClick={() => setSelected(mobile && active === stream.slug ? null : stream.slug)}>
          {stream.name}<span aria-hidden="true">{mobile && active === stream.slug ? '−' : '›'}</span>
        </button>
        {mobile && <div id={`${id}-${stream.id}`} hidden={active !== stream.slug}>{active === stream.slug && <CourseLinks slug={stream.slug} />}</div>}
      </div>)}
      <Link className="mega-overview" to="/academics">View all programs ↗</Link>
    </div>
    {!mobile && <div id={`${id}-courses`} className="mega-course-panel">{active && <CourseLinks slug={active} />}</div>}
  </div>
}
