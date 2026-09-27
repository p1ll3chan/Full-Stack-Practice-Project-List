import { useApi } from '../hooks/useApi'
import type { FacultyMember } from '../api/types'

export default function Faculty() {
  const { data: faculty, loading, error } = useApi<FacultyMember[]>('/faculty')

  if (loading) return <p>Loading faculty...</p>
  if (error) return <p className="error">Failed to load faculty: {error}</p>

  return (
    <section>
      <h1>Faculty</h1>
      <div className="faculty-grid">
        {faculty?.map((member) => (
          <article key={member.id} className="faculty-card">
            <h3>{member.name}</h3>
            <p className="faculty-title">{member.title}</p>
            <p className="faculty-dept">{member.department}</p>
            <p>{member.bio}</p>
            <a href={`mailto:${member.email}`}>{member.email}</a>
          </article>
        ))}
      </div>
    </section>
  )
}
