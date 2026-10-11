import { Link } from 'react-router-dom'
import type { FacultyMember } from '../api/types'
import { IconArrowRight, IconBuilding, IconMail } from './icons'

// `streamSlug` is kept so existing callers keep compiling; the card links to the
// faculty member's own page, so the department link was removed to keep one link per card.
export default function FacultyCard({ member, streamSlug: _streamSlug }: { member: FacultyMember; streamSlug?: string }) {
  return (
    <article className="faculty-card">
      {member.title && <span className="card-eyebrow">{member.title}</span>}
      <h3 className="card-title">
        <Link to={`/faculty/${member.id}`} className="card-stretched">
          {member.name}
        </Link>
      </h3>
      {member.bio && <p className="card-clamp">{member.bio}</p>}
      <ul className="card-facts">
        {member.department && (
          <li className="card-fact">
            <IconBuilding />
            <span className="faculty-dept">{member.department}</span>
          </li>
        )}
        {member.email && (
          <li className="card-fact">
            <IconMail />
            <span>{member.email}</span>
          </li>
        )}
      </ul>
      <div className="card-footer">
        <span className="card-cta">
          View profile <IconArrowRight />
        </span>
      </div>
    </article>
  )
}
