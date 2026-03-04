const rawApiBase = import.meta.env.VITE_API_BASE_URL || '/api'

export const API_BASE_URL = rawApiBase.endsWith('/')
  ? rawApiBase.slice(0, -1)
  : rawApiBase

export const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'https://auth.femt.llc'
export const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'femt'
export const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'femt-frontend'
