import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useContact } from '../api/hooks'
import { useHeaderScroll } from '../hooks/useHeaderScroll'
import AcademicMegaMenu from './AcademicMegaMenu'

const primary = [{ to: '/', label: 'Home' }, { to: '/about', label: 'About' }, { to: '/departments', label: 'Departments' }, { to: '/excellence', label: 'Excellence' }]
const secondary = [{ to: '/contact', label: 'Contact' }, { to: '/faculty', label: 'Faculty' }, { to: '/admin', label: 'Admin' }]

export default function Header() {
  const [open, setOpen] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const header = useRef<HTMLElement>(null)
  const intent = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const location = useLocation()
  const compact = useHeaderScroll()
  const { data: contact } = useContact()
  const name = contact?.collegeName || 'College CMS'
  const cancelIntent = () => { clearTimeout(intent.current) }
  const closeMenu = (restore = false) => { cancelIntent(); setOpen(false); if (restore) trigger.current?.focus() }
  const closeDrawer = () => { dialog.current?.close?.(); setDrawer(false); toggle.current?.focus() }

  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) { setLastPath(location.pathname); setOpen(false); setDrawer(false) }
  useEffect(() => () => clearTimeout(intent.current), [])
  useEffect(() => {
    const element = header.current
    const update = () => document.documentElement.style.setProperty('--header-offset', `${(element?.offsetHeight || 124) - (compact && window.innerWidth >= 900 ? 44 : 0)}px`)
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    if (element) observer?.observe(element)
    return () => observer?.disconnect()
  }, [compact])
  useEffect(() => {
    if (!open) return
    const pointer = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) closeMenu() }
    const keyboard = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); closeMenu(true) } }
    document.addEventListener('pointerdown', pointer)
    document.addEventListener('keydown', keyboard)
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', keyboard) }
  }, [open])
  useEffect(() => {
    if (!drawer) { dialog.current?.close?.(); return }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const element = dialog.current
    element?.showModal?.()
    element?.querySelector<HTMLButtonElement>('.drawer-close')?.focus()
    const resize = () => { if (window.innerWidth >= 900) setDrawer(false) }
    window.addEventListener('resize', resize)
    return () => { document.body.style.overflow = previous; element?.close?.(); window.removeEventListener('resize', resize) }
  }, [drawer])
  function hover() {
    if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) {
      cancelIntent(); intent.current = setTimeout(() => setOpen(true), 150)
    }
  }
  return <header ref={header} className={`site-header${compact ? ' is-compact' : ''}`}>
    <div className="header-surface">
      <div className="utility-row" inert={compact}><div className="header-width"><span>{contact?.tagline}</span><nav aria-label="Utility navigation">{secondary.map(link => <Link key={link.to} to={link.to}>{link.label}</Link>)}</nav></div></div>
      <div className="main-header header-width">
        <Link to="/" className="brand"><span className="brand-mark" aria-hidden="true">M</span><span>{name}</span></Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {primary.slice(0, 2).map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'}>{link.label}</NavLink>)}
          <div ref={menu} className="mega-host" onMouseEnter={hover} onMouseLeave={() => { cancelIntent(); if (!menu.current?.contains(document.activeElement)) intent.current = setTimeout(() => setOpen(false), 150) }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) closeMenu() }}>
            <button ref={trigger} className="nav-academics" type="button" aria-expanded={open} aria-controls="academic-mega-menu" onClick={() => { cancelIntent(); setOpen(value => !value) }} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); requestAnimationFrame(() => menu.current?.querySelector<HTMLButtonElement>('[data-category]')?.focus()) } }}>Academics <span aria-hidden="true">⌄</span></button>
            {open && <div id="academic-mega-menu" className="mega-panel"><AcademicMegaMenu /></div>}
          </div>
          {primary.slice(2).map(link => <NavLink key={link.to} to={link.to}>{link.label}</NavLink>)}
        </nav>
        <Link to="/contact" className="header-apply">Apply <span aria-hidden="true">↗</span></Link>
        <button ref={toggle} className="nav-toggle" type="button" aria-expanded={drawer} aria-controls="mobile-navigation" onClick={() => setDrawer(true)}><span aria-hidden="true">☰</span><span className="visually-hidden">Open menu</span></button>
      </div>
    </div>
    {drawer && <dialog ref={dialog} id="mobile-navigation" className="mobile-drawer" aria-label="Site navigation" onCancel={event => { event.preventDefault(); closeDrawer() }}>
      <div className="drawer-heading"><span>{name}</span><button type="button" className="drawer-close" onClick={closeDrawer} aria-label="Close menu">✕</button></div>
      <nav aria-label="Mobile navigation">{primary.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'}>{link.label}</NavLink>)}<Link to="/academics">Academics</Link>{secondary.map(link => <Link key={link.to} to={link.to}>{link.label}</Link>)}</nav>
      <AcademicMegaMenu mobile />
      <Link to="/contact" className="btn btn-primary">Apply ↗</Link>
    </dialog>}
  </header>
}
