import { useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuth } from './session'

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/pages', label: 'Pages' },
  { to: '/admin/about', label: 'About Us' },
  { to: '/admin/departments', label: 'Departments' },
  { to: '/admin/academics/degree-levels', label: 'Degree Levels' },
  { to: '/admin/academics/courses', label: 'Courses' },
  { to: '/admin/faculty', label: 'Faculty' },
  { to: '/admin/excellence', label: 'Excellence' },
  { to: '/admin/media', label: 'Media' },
  { to: '/admin/contact', label: 'Contact' },
]

export default function AdminLayout() {
  const { session, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const activeNav = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )
  usePageTitle(activeNav ? `${activeNav.label} admin` : 'Admin')

  return (
    <div className={`admin-shell${menuOpen ? ' menu-open' : ''}`}>
      <div className="admin-topbar">
        <Link to="/admin" className="admin-brand" onClick={() => setMenuOpen(false)}>
          CMS Admin
        </Link>
        <button
          type="button"
          className="btn admin-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="admin-sidebar"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'Close menu' : 'Menu'}
        </button>
      </div>
      <nav id="admin-sidebar" className="admin-sidebar" aria-label="Admin">
        <ul className="admin-nav">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="admin-sidebar-footer">
          <span className="admin-role" data-testid="admin-role">
            {session?.role}
          </span>
          <Link to="/" className="admin-view-site" onClick={() => setMenuOpen(false)}>
            View site
          </Link>
          <button type="button" className="btn" data-testid="logout" onClick={logout}>
            Sign out
          </button>
        </div>
      </nav>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
