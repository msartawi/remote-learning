import type { SessionBootstrap } from '../types'
import type { AuthFetch } from './orgApi'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export async function getSessionBootstrap(
  authFetch: AuthFetch,
  baseUrl: string,
  roomId: string
): Promise<SessionBootstrap> {
  return handleResponse<SessionBootstrap>(
    await authFetch(`${baseUrl}/sessions/${encodeURIComponent(roomId)}/bootstrap`)
  )
}
