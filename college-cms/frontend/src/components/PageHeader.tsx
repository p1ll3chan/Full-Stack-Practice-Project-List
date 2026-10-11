import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'

export interface Crumb {
  label: string
  /** omit for the current page */
  to?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  breadcrumbs?: Crumb[]
}

export default function PageHeader({ title, subtitle, eyebrow, breadcrumbs }: PageHeaderProps) {
  usePageTitle(title, subtitle)
  return (
    <header className="page-header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol>
            {breadcrumbs.map((crumb, index) => {
              const isCurrent = index === breadcrumbs.length - 1
              return (
                <li key={`${crumb.label}-${index}`}>
                  {crumb.to && !isCurrent ? (
                    <Link to={crumb.to}>{crumb.label}</Link>
                  ) : (
                    <span aria-current={isCurrent ? 'page' : undefined}>{crumb.label}</span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      )}
      {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </header>
  )
}
