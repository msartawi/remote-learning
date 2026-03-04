import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type AuthUser = {
  id?: string
  username?: string
  email?: string
  name?: string
  firstName?: string
  lastName?: string
}

type AuthResponse = {
  user?: AuthUser
  roles?: string[]
  orgIds?: string[]
}

type AuthContextValue = {
  ready: boolean
  isAuthenticated: boolean
  user?: AuthUser
  roles: string[]
  orgIds: string[]
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

type RegisterPayload = {
  email: string
  password: string
  firstName?: string
  lastName?: string
  organization?: string
  role?: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | undefined>()
  const [roles, setRoles] = useState<string[]>([])
  const [orgIds, setOrgIds] = useState<string[]>([])

  const applyAuthResponse = useCallback((data: AuthResponse | null) => {
    if (!data?.user) {
      setIsAuthenticated(false)
      setUser(undefined)
      setRoles([])
      setOrgIds([])
      return
    }
    setIsAuthenticated(true)
    setUser(data.user)
    setRoles(data.roles ?? [])
    setOrgIds(data.orgIds ?? [])
  }, [])

  useEffect(() => {
    let mounted = true
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (res) => {
        if (!mounted) return
        if (!res.ok) {
          applyAuthResponse(null)
          return
        }
        const data = (await res.json()) as AuthResponse
        applyAuthResponse(data)
      })
      .catch(() => {
        if (mounted) applyAuthResponse(null)
      })
      .finally(() => {
        if (mounted) setReady(true)
      })

    return () => {
      mounted = false
    }
  }, [applyAuthResponse])

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Login failed')
      }
      const data = (await response.json()) as AuthResponse
      applyAuthResponse(data)
    },
    [applyAuthResponse]
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Registration failed')
      }
      const data = (await response.json()) as AuthResponse
      applyAuthResponse(data)
    },
    [applyAuthResponse]
  )

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    applyAuthResponse(null)
  }, [applyAuthResponse])

  const authFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, { ...init, credentials: 'include' })
  }, [])

  const hasRole = useCallback((role: string) => roles.includes(role), [roles])

  const hasAnyRole = useCallback(
    (requiredRoles: string[]) => requiredRoles.some((role) => roles.includes(role)),
    [roles]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      isAuthenticated,
      user,
      roles,
      orgIds,
      hasRole,
      hasAnyRole,
      login,
      register,
      logout,
      authFetch,
    }),
    [
      ready,
      isAuthenticated,
      user,
      roles,
      orgIds,
      hasRole,
      hasAnyRole,
      login,
      register,
      logout,
      authFetch,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
