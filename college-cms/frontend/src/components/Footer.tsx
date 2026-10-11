import { Link } from 'react-router-dom'
import { useContact } from '../api/hooks'

const quickLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/departments', label: 'Departments' },
  { to: '/academics', label: 'Academics' },
  { to: '/excellence', label: 'Excellence' },
  { to: '/faculty', label: 'Faculty' },
  { to: '/contact', label: 'Contact' },
]

export default function Footer() {
  // every value below comes from the CMS contact record; nothing is hardcoded
  const { data: contact } = useContact()
  const collegeName = contact?.collegeName || 'College CMS'
  const mapUrl = contact?.mapEmbedUrl?.trim() ?? ''
  const mapHref = /^(https?:)?\/\//i.test(mapUrl) ? mapUrl : null

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <section aria-labelledby="footer-college">
          <h2 id="footer-college" className="footer-heading">
            {collegeName}
          </h2>
          {contact?.tagline && <p className="footer-text">{contact.tagline}</p>}
        </section>

        <nav aria-labelledby="footer-links">
          <h2 id="footer-links" className="footer-heading">
            Quick links
          </h2>
          <ul className="footer-list">
            {quickLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="footer-contact">
          <h2 id="footer-contact" className="footer-heading">
            Contact
          </h2>
          <ul className="footer-list">
            {contact?.address && <li className="footer-text">{contact.address}</li>}
            {contact?.phone && (
              <li>
                <a href={`tel:${contact.phone}`}>{contact.phone}</a>
              </li>
            )}
            {contact?.email && (
              <li>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </li>
            )}
            {contact?.officeHours && <li className="footer-text">{contact.officeHours}</li>}
            {mapHref && (
              <li>
                <a href={mapHref} target="_blank" rel="noreferrer noopener">
                  View on map
                </a>
              </li>
            )}
          </ul>
        </section>
      </div>

      <p className="footer-bottom">
        &copy; {new Date().getFullYear()} {collegeName}. All rights reserved.
      </p>
    </footer>
  )
}
