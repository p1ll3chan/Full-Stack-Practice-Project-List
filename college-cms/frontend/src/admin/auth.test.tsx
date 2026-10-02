import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { api, setAuthToken, setUnauthorizedHandler } from '../api/client'
import { jsonResponse } from '../tests/testUtils'
import { AuthProvider, RequireAuth } from './auth'
import LoginPage from './LoginPage'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  setAuthToken(null)
  setUnauthorizedHandler(null)
})

function renderAuthRoutes() {
  return render(
    <MemoryRouter initialEntries={['/admin/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/admin" element={<RequireAuth />}>
            <Route index element={<div>admin dashboard</div>} />
          </Route>
          <Route path="/admin/login" element={<LoginPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('admin access control', () => {
  it('redirects signed-out visitors away from protected routes', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/admin" element={<RequireAuth />}>
              <Route index element={<div>admin dashboard</div>} />
            </Route>
            <Route path="/admin/login" element={<div>login screen</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('login screen')).toBeTruthy()
    expect(screen.queryByText('admin dashboard')).toBeNull()
  })

  it('signs in only after the backend confirms the token', async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input
      void init
      return jsonResponse({ data: { role: 'editor' } })
    })
    vi.stubGlobal('fetch', fetchSpy)

    renderAuthRoutes()
    fireEvent.change(screen.getByLabelText('Access token'), { target: { value: 'sekrit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await screen.findByText('admin dashboard')
    const firstCall = fetchSpy.mock.calls[0]
    if (!firstCall) throw new Error('fetch was never called')
    const init = firstCall[1] as RequestInit
    expect(init).toBeTruthy()
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sekrit')
  })

  it('stays on the login screen when the token is rejected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: { code: 'unauthorized', message: 'Unauthorized' } }, 401)),
    )

    renderAuthRoutes()
    fireEvent.change(screen.getByLabelText('Access token'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('That token was not accepted')
    expect(screen.queryByText('admin dashboard')).toBeNull()
  })

  it('invokes the logout handler when a later request gets a 401', async () => {
    const handler = vi.fn()
    setAuthToken('stale-token')
    setUnauthorizedHandler(handler)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: { code: 'unauthorized', message: 'Unauthorized' } }, 401)),
    )

    await expect(api.get('/admin/pages')).rejects.toMatchObject({ status: 401 })
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
