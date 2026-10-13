import SectionError from './SectionError'
import { useId, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCourseList, useDegreeLevelList } from '../api/hooks'
import CourseCard from './CourseCard'
import { CardGridSkeleton } from './states'
import classroom from '../assets/marygiri-classroom.png'

export default function ProgramsExplorer() {
  const courses = useCourseList({ limit: 100, sort: 'sortOrder' })
  const levels = useDegreeLevelList({ limit: 50 })
  const [selected, setSelected] = useState('all')
  const id = useId()
  if (courses.loading) return <CardGridSkeleton label="Loading programs…" />
  if (courses.error) return <SectionError label="Programs" onRetry={courses.refetch} />
  if (!courses.data.length) return null
  const populated = levels.data.filter(level => courses.data.some(course => course.degreeLevelId === level.id))
  const groups = populated.length ? populated.map(level => ({ id: String(level.id), name: level.name })) : [...new Set(courses.data.map(course => course.department).filter(Boolean))].map(name => ({ id: name, name }))
  const tabs = [{ id: 'all', name: 'All programs' }, ...groups]
  const active = tabs.some(tab => tab.id === selected) ? selected : 'all'
  const filtered = courses.data.filter(course => active === 'all' || (populated.length ? String(course.degreeLevelId) === active : course.department === active))
  function keys(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]'))
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
    buttons[next]?.focus()
    setSelected(tabs[next].id)
  }
  return <section className="program-explorer home-section" aria-labelledby={`${id}-heading`}>
    <div className="section-heading"><div><p className="eyebrow">Academics</p><h2 id={`${id}-heading`}>Explore our programs</h2></div><Link className="text-link" to="/academics">View all programs <span aria-hidden="true">↗</span></Link></div>
    <div className="program-layout">
      <img className="section-photo" src={classroom} width="780" height="520" loading="lazy" alt="Students writing in a Marygiri classroom" />
      <div className="program-content">
        <div className="program-tabs" role="tablist" aria-label="Program groups" onKeyDown={keys}>{tabs.map((tab, index) => <button key={tab.id} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel`} aria-selected={active === tab.id} tabIndex={active === tab.id ? 0 : -1} onClick={() => setSelected(tab.id)}>{tab.name}</button>)}</div>
        <div className="program-panel" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tabs.findIndex(tab => tab.id === active)}`} tabIndex={0}>
          <ul key={active} className="program-results fade-in">{filtered.map(course => <li key={course.id}><CourseCard course={course} to={`/academics/courses/${course.id}`} /></li>)}</ul>
        </div>
      </div>
    </div>
  </section>
}
