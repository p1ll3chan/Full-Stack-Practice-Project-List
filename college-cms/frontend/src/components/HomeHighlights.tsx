import SectionError from './SectionError'
import { Link } from 'react-router-dom'
import { useContact, useExcellenceDomains, useExcellenceList, useFacultyList, useAllStreams } from '../api/hooks'
import FacultyCard from './FacultyCard'
import { ExcellenceDomainCard, ExcellenceItemCard } from './ExcellenceCard'
import { RevealGrid } from './Reveal'
import { CardGridSkeleton } from './states'
import auditorium from '../assets/marygiri-auditorium.png'
import lab from '../assets/marygiri-computer-lab.png'
import life from '../assets/marygiri-student-life.png'

export function AboutLinks() {
  const { data } = useAllStreams()
  const items = data.filter(stream => stream.tagline || stream.shortDescription).slice(0, 4)
  if (!items.length) return null
  return <nav className="about-links" aria-label="Explore Marygiri">{items.map(stream => <Link key={stream.id} to={`/departments/${stream.slug}`}><strong>{stream.name}</strong><span>{stream.tagline || stream.shortDescription}</span><span className="card-cta">Know more <span aria-hidden="true">↗</span></span></Link>)}</nav>
}
export function FacultyHighlights() {
  const { data, loading, error, refetch } = useFacultyList({ limit: 100, sort: 'name' })
  if (loading) return <CardGridSkeleton label="Loading faculty…" />
  if (error) return <SectionError label="Highlights" onRetry={refetch} />
  if (!data.length) return null
  return <section className="home-section" aria-labelledby="home-faculty"><div className="section-heading"><div><p className="eyebrow">People</p><h2 id="home-faculty">Meet the faculty</h2></div><Link className="text-link" to="/faculty">All faculty ↗</Link></div><div className="highlight-layout"><img className="section-photo" src={auditorium} width="780" height="520" loading="lazy" alt="A speaker addressing a gathering in the Marygiri auditorium" /><RevealGrid>{data.slice(0, 4).map(member => <FacultyCard key={member.id} member={member} />)}</RevealGrid></div></section>
}
export function ExcellenceHighlights() {
  const domains = useExcellenceDomains({ limit: 50 })
  const items = useExcellenceList({ limit: 12, sort: 'year', order: 'desc' })
  if (domains.loading || items.loading) return <CardGridSkeleton label="Loading excellence…" />
  if (domains.error || items.error) return <SectionError label="Excellence highlights" onRetry={() => { domains.refetch(); items.refetch() }} />
  if (!domains.data.length && !items.data.length) return null
  return <section className="home-section excellence-highlight" aria-labelledby="home-excellence"><div className="section-heading"><div><p className="eyebrow">Excellence</p><h2 id="home-excellence">Awards & achievements</h2></div><Link className="text-link" to="/excellence">Explore excellence ↗</Link></div><div className="highlight-layout"><img className="section-photo" src={lab} width="780" height="520" loading="lazy" alt="Students working in the Marygiri computer lab" /><RevealGrid>{domains.data.slice(0, 3).map(domain => <ExcellenceDomainCard key={domain.id} domain={domain} />)}{items.data.slice(0, 3).map(item => <ExcellenceItemCard key={item.id} item={item} />)}</RevealGrid></div></section>
}
export function ApplyBand() {
  const { data } = useContact()
  return <section className="apply-band home-section" aria-label="Apply to Marygiri"><img src={life} width="780" height="520" loading="lazy" alt="Marygiri students playing carrom together" /><div><p className="eyebrow">Marygiri College</p><h2>{data?.tagline || data?.collegeName || 'Contact'}</h2><Link className="hero-cta-primary" to="/contact">Apply <span aria-hidden="true">↗</span></Link></div></section>
}
