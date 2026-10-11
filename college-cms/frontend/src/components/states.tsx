import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="loading-state" role="status" aria-live="polite">
      {label}
    </p>
  )
}

/** Six placeholder cards shown while a list is loading. The label stays in the DOM for screen readers. */
export function CardGridSkeleton({ label = 'Loading…', count = 6 }: { label?: string; count?: number }) {
  return (
    <div className="card-grid-loading" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      <ul className="card-grid" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <li key={index}>
            <div className="skeleton-card">
              <span className="skeleton skeleton-line skeleton-line--short" />
              <span className="skeleton skeleton-line skeleton-line--title" />
              <span className="skeleton skeleton-line" />
              <span className="skeleton skeleton-line skeleton-line--short" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
}: {
  error: Error | null
  onRetry?: () => void
  title?: string
}) {
  const isNotFound = (error as { status?: number } | null)?.status === 404
  if (isNotFound) return <NotFoundPage message={error?.message} />
  return (
    <div className="state-card error" role="alert">
      <h2>{title}</h2>
      <p>{error?.message ?? 'The request failed.'}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  message,
  hint,
  action,
}: {
  message: string
  hint?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="state-card empty-state">
      <svg className="empty-illustration" viewBox="0 0 120 96" aria-hidden="true" focusable="false">
        <rect className="ill-base" x="10" y="22" width="100" height="62" rx="10" />
        <path className="ill-tab" d="M10 32a10 10 0 0 1 10-10h24l8 10H10z" />
        <circle className="ill-accent" cx="88" cy="20" r="13" />
        <path className="ill-line" d="M34 50h52M34 62h34" />
      </svg>
      <p>{message}</p>
      {hint && <p className="empty-hint">{hint}</p>}
      {action && (
        <button type="button" className="btn" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

export function NotFoundPage({ message }: { message?: string }) {
  usePageTitle('Page not found')
  return (
    <section className="not-found" data-testid="not-found">
      <h1>Page not found</h1>
      <p>{message ?? 'The page you are looking for does not exist or is no longer available.'}</p>
      <div className="quick-links">
        <Link to="/" className="btn-primary btn">
          Back to home
        </Link>
        <Link to="/departments" className="btn">
          Browse departments
        </Link>
      </div>
    </section>
  )
}
