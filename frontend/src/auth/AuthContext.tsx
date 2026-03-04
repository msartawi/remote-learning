import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { KeycloakLoginOptions, KeycloakProfile } from 'keycloak-js'
import { keycloak } from './keycloak'
import { KEYCLOAK_CLIENT_ID } from '../config'

type AuthContextValue = {
  ready: boolean
  isAuthenticated: boolean
  profile?: KeycloakProfile
  roles: string[]
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  login: (options?: KeycloakLoginOptions) => Promise<void>
  register: (options?: KeycloakLoginOptions) => Promise<void>
  registerWithPrefill: (prefill: RegisterPrefill) => Promise<void>
  logout: () => Promise<void>
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type RegisterPrefill = {
  email?: string
  firstName?: string
  lastName?: string
  organization?: string
  redirectUri?: string
}

type TokenParsed = {
  realm_access?: { roles?: string[] }
  resource_access?: Record<string, { roles?: string[] }>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [profile, setProfile] = useState<KeycloakProfile | undefined>()

  useEffect(() => {
    let mounted = true
    keycloak
      .init({
        onLoad: 'check-sso',
        checkLoginIframe: false,
        pkceMethod: 'S256',
      })
      .then(async (authenticated) => {
        if (!mounted) return
        setIsAuthenticated(Boolean(authenticated))
        if (authenticated) {
          const userProfile = await keycloak.loadUserProfile()
          if (mounted) setProfile(userProfile)
        }
      })
      .finally(() => {
        if (mounted) setReady(true)
      })

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => {
        void keycloak.login()
      })
    }

    return () => {
      mounted = false
      keycloak.onTokenExpired = undefined
    }
  }, [])

  const login = useCallback(async (options?: KeycloakLoginOptions) => {
    await keycloak.login(options)
  }, [])

  const register = useCallback(async (options?: KeycloakLoginOptions) => {
    await keycloak.register(options)
  }, [])

  const registerWithPrefill = useCallback(async (prefill: RegisterPrefill) => {
    const baseUrl = await keycloak.createRegisterUrl({
      loginHint: prefill.email,
      redirectUri: prefill.redirectUri || `${window.location.origin}/dashboard`,
    })
    const url = new URL(baseUrl)
    if (prefill.email) url.searchParams.set('email', prefill.email)
    if (prefill.firstName) url.searchParams.set('firstName', prefill.firstName)
    if (prefill.lastName) url.searchParams.set('lastName', prefill.lastName)
    if (prefill.organization) url.searchParams.set('organization', prefill.organization)
    window.location.assign(url.toString())
  }, [])

  const logout = useCallback(async () => {
    await keycloak.logout({
      redirectUri: `${window.location.origin}/login`,
    })
  }, [])

  const authFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!keycloak.authenticated) {
      throw new Error('User is not authenticated')
    }
    await keycloak.updateToken(30)
    const headers = new Headers(init?.headers)
    if (keycloak.token) {
      headers.set('Authorization', `Bearer ${keycloak.token}`)
    }
    return fetch(input, { ...init, headers })
  }, [])

  const roles = useMemo(() => {
    const parsed = keycloak.tokenParsed as TokenParsed | undefined
    const realmRoles = parsed?.realm_access?.roles ?? []
    const clientRoles = parsed?.resource_access?.[KEYCLOAK_CLIENT_ID]?.roles ?? []
    return Array.from(new Set([...realmRoles, ...clientRoles]))
  }, [isAuthenticated])

  const hasRole = useCallback(
    (role: string) => roles.includes(role),
    [roles]
  )

  const hasAnyRole = useCallback(
    (requiredRoles: string[]) => requiredRoles.some((role) => roles.includes(role)),
    [roles]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      isAuthenticated,
      profile,
      roles,
      hasRole,
      hasAnyRole,
      login,
      register,
      registerWithPrefill,
      logout,
      authFetch,
    }),
    [
      ready,
      isAuthenticated,
      profile,
      roles,
      hasRole,
      hasAnyRole,
      login,
      register,
      registerWithPrefill,
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
