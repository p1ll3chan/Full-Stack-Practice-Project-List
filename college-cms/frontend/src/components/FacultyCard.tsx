import { Link } from 'react-router-dom'
import type { FacultyMember } from '../api/types'

export default function FacultyCard({ member, streamSlug }: { member: FacultyMember; streamSlug?: string }) {
  return (
    <article className="faculty-card">
      <h3>{member.name}</h3>
      <p className="faculty-title">{member.title}</p>
      <p className="faculty-dept">{member.department}</p>
      {member.bio && <p>{member.bio}</p>}
      {member.email && <a href={`mailto:${member.email}`}>{member.email}</a>}
      {streamSlug && (
        <p className="faculty-stream">
          <Link to={`/departments/${streamSlug}`}>Department page</Link>
        </p>
      )}
    </article>
  )
}
