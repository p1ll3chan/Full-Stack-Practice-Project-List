import { useInView } from '../hooks/useInView'
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
  const ref = useInView<HTMLElement>()
  const { data: contact, loading, error } = useContact()
  const collegeName = contact?.collegeName?.trim() || 'College CMS'
  const tagline = contact?.tagline?.trim() ?? ''
  const address = contact?.address?.trim() ?? ''
  const phone = contact?.phone?.trim() ?? ''
  const email = contact?.email?.trim() ?? ''
  const officeHours = contact?.officeHours?.trim() ?? ''
  const mapUrl = contact?.mapEmbedUrl?.trim() ?? ''
  const mapHref = /^(https?:)?\/\//i.test(mapUrl) ? mapUrl : null

  const hasDetails = Boolean(address || phone || email || officeHours || mapHref)

  return (
    <footer ref={ref} className="site-footer reveal">
      <div className="footer-grid">
        <section aria-labelledby="footer-college">
          <h2 id="footer-college" className="footer-heading">
            {collegeName}
          </h2>
          {tagline && <p className="footer-text">{tagline}</p>}
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
          {loading ? (
            <div role="status" aria-label="Loading contact details">
              <span className="skeleton footer-contact-skeleton" aria-hidden="true">Loading contact details</span>
            </div>
          ) : error ? (
            <p className="footer-text">Contact details are unavailable right now.</p>
          ) : hasDetails ? (
            <ul className="footer-list">
              {address && <li className="footer-text">{address}</li>}
              {phone && <li><a href={`tel:${phone}`}>{phone}</a></li>}
              {email && <li><a href={`mailto:${email}`}>{email}</a></li>}
              {officeHours && <li className="footer-text">{officeHours}</li>}
              {mapHref && (
                <li>
                  <a href={mapHref} target="_blank" rel="noreferrer noopener">View on map</a>
                </li>
              )}
            </ul>
          ) : (
            <p className="footer-text">Contact details will be available soon.</p>
          )}
        </section>
      </div>

      <p className="footer-bottom">
        &copy; {new Date().getFullYear()} {collegeName}. All rights reserved.
      </p>
    </footer>
  )
}
