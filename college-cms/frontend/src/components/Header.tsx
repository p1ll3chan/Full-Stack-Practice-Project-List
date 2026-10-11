import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useContact } from '../api/hooks'

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/departments', label: 'Departments' },
  { to: '/academics', label: 'Academics' },
  { to: '/excellence', label: 'Excellence' },
  { to: '/faculty', label: 'Faculty' },
  { to: '/contact', label: 'Contact' },
  { to: '/admin', label: 'Admin' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const { data: contact } = useContact()
  const collegeName = contact?.collegeName || 'College CMS'

  // collapse the mobile menu whenever the route changes
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setOpen(false)
  }

  // Escape closes the mobile menu and returns focus to the toggle
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <header className={open ? 'site-header nav-open' : 'site-header'}>
      <Link to="/" className="brand">
        {collegeName}
      </Link>
      <Link to="/contact" className="header-apply">
        Apply
      </Link>
      <button
        ref={toggleRef}
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="nav-toggle-bars" aria-hidden="true" />
        <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
      </button>
      <nav id="site-nav" aria-label="Main navigation">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'}>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
