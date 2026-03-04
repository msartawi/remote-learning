import type { Org, Room, StorageMode } from '../types'

export type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export async function getOrgs(authFetch: AuthFetch, baseUrl: string): Promise<Org[]> {
  const orgs = await handleResponse<Omit<Org, 'rooms'>[]>(
    await authFetch(`${baseUrl}/orgs`)
  )
  const withRooms = await Promise.all(
    orgs.map(async (org) => {
      const rooms = await getOrgRooms(authFetch, baseUrl, org.id)
      return { ...org, rooms }
    })
  )
  return withRooms
}

export async function getOrgRooms(
  authFetch: AuthFetch,
  baseUrl: string,
  orgId: string
): Promise<Room[]> {
  return handleResponse<Room[]>(
    await authFetch(`${baseUrl}/orgs/${orgId}/rooms`)
  )
}

export async function createOrg(
  authFetch: AuthFetch,
  baseUrl: string,
  name: string,
  storageMode: StorageMode
): Promise<Org> {
  const created = await handleResponse<Omit<Org, 'rooms'>>(
    await authFetch(`${baseUrl}/orgs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, default_storage_mode: storageMode }),
    })
  )
  return { ...created, rooms: [] }
}

export async function createRoom(
  authFetch: AuthFetch,
  baseUrl: string,
  orgId: string,
  name: string,
  override: StorageMode | null
): Promise<Room> {
  return handleResponse<Room>(
    await authFetch(`${baseUrl}/orgs/${orgId}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, storage_mode_override: override }),
    })
  )
}
