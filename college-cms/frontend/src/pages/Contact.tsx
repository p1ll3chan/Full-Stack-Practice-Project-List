import { Link } from 'react-router-dom'
import { useContact } from '../api/hooks'
import { Loading } from '../components/states'
import CmsSection from './CmsSection'

function ContactDetails() {
  const { data: contact, loading, error } = useContact()

  if (loading) return <Loading label="Loading contact details…" />
  if (error || !contact) return null

  const hasDetails =
    contact.address || contact.phone || contact.email || contact.officeHours || contact.collegeName
  if (!hasDetails) return null

  const mapHref =
    contact.mapEmbedUrl && /^(https?:)?\/\//i.test(contact.mapEmbedUrl) ? contact.mapEmbedUrl : null

  return (
    <section className="contact-card" aria-label="Contact details">
      {contact.collegeName && <h2>{contact.collegeName}</h2>}
      {contact.tagline && <p className="page-subtitle">{contact.tagline}</p>}
      <dl className="contact-list">
        {contact.address && (
          <>
            <dt>Address</dt>
            <dd>{contact.address}</dd>
          </>
        )}
        {contact.phone && (
          <>
            <dt>Phone</dt>
            <dd>
              <a href={`tel:${contact.phone}`}>{contact.phone}</a>
            </dd>
          </>
        )}
        {contact.email && (
          <>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </dd>
          </>
        )}
        {contact.officeHours && (
          <>
            <dt>Office hours</dt>
            <dd>{contact.officeHours}</dd>
          </>
        )}
      </dl>
      {mapHref && (
        <p>
          <a href={mapHref} target="_blank" rel="noreferrer noopener">
            View on map
          </a>
        </p>
      )}
      <p>
        <Link to="/departments">Browse departments</Link>
      </p>
    </section>
  )
}

export default function Contact() {
  return (
    <CmsSection slug="contact">
      <ContactDetails />
    </CmsSection>
  )
}
