import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuth } from './session'

export default function LoginPage() {
  usePageTitle('Sign in')
  const { session, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/admin/login' ? from : '/admin'} replace />
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(token)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/admin/login' ? from : '/admin', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError('That token was not accepted. Check the ADMIN_TOKEN or EDITOR_TOKEN value from backend/.env.')
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Sign-in failed.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>CMS sign in</h1>
        <p className="login-hint">
          Paste the bearer token configured as <code>ADMIN_TOKEN</code> or <code>EDITOR_TOKEN</code> in{' '}
          <code>backend/.env</code>. Tokens are verified by the backend; this form never creates accounts and
          the token is kept only in memory for this tab.
        </p>
        <label htmlFor="login-token">Access token</label>
        <input
          id="login-token"
          type="password"
          autoComplete="off"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          required
        />
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
