import { NavLink } from 'react-router-dom'

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
  return (
    <header className="site-header">
      <div className="brand">College CMS</div>
      <nav aria-label="Main navigation">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'}>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
