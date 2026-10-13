import { useEffect, useState } from 'react'
export interface PageSectionLink { id: string; label: string }
export default function SectionNav({ sections }: { sections: PageSectionLink[] }) {
  const [active, setActive] = useState(sections[0]?.id)
  const signature = sections.map(section => section.id).join('|')
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const visible = new Set<string>()
    const ids = signature.split('|')
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id)
        else visible.delete(entry.target.id)
      }
      const first = ids.find(id => visible.has(id))
      if (first) setActive(first)
    }, { rootMargin: '-160px 0px -30% 0px', threshold: 0 })
    for (const id of ids) { const element = document.getElementById(id); if (element) observer.observe(element) }
    return () => observer.disconnect()
  }, [signature])
  if (sections.length < 2) return null
  return <nav className="section-nav" aria-label="On this page">{sections.map(section => <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? 'location' : undefined} onClick={() => setActive(section.id)}>{section.label}</a>)}</nav>
}
