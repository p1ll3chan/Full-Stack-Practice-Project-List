import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthContext, useAuth, useAuthValue } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthValue()
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function RequireAuth() {
  const { session } = useAuth()
  const location = useLocation()
  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
