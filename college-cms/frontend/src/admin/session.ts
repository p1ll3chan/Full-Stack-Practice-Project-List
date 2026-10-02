import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setAuthToken, setUnauthorizedHandler } from '../api/client'

export type AuthRole = 'editor' | 'admin'

export interface AuthSession {
  token: string
  role: AuthRole
}

export interface AuthContextValue {
  session: AuthSession | null
  login: (token: string) => Promise<AuthRole>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuthValue(): AuthContextValue {
  const [session, setSession] = useState<AuthSession | null>(null)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthToken(null)
      setSession(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (token: string): Promise<AuthRole> => {
    const candidate = token.trim()
    if (candidate === '') throw new Error('Paste your access token to continue.')
    setAuthToken(candidate)
    try {
      const data = await api.get<{ role: AuthRole }>('/admin/whoami')
      setSession({ token: candidate, role: data.role })
      return data.role
    } catch (error) {
      setAuthToken(null)
      setSession(null)
      throw error
    }
  }, [])

  const logout = useCallback(() => {
    setAuthToken(null)
    setSession(null)
  }, [])

  return useMemo(() => ({ session, login, logout }), [session, login, logout])
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
