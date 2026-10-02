import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="loading-state" role="status" aria-live="polite">
      {label}
    </p>
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

export function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="state-card empty-state">
      <p>{message}</p>
      {hint && <p className="empty-hint">{hint}</p>}
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
