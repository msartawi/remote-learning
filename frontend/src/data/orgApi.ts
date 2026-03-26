import type { Org, OrgInvite, Room, SessionBootstrap, StorageMode } from '../types'

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

export async function getOrgInvites(
  authFetch: AuthFetch,
  baseUrl: string,
  orgId: string
): Promise<OrgInvite[]> {
  return handleResponse<OrgInvite[]>(
    await authFetch(`${baseUrl}/orgs/${orgId}/invites`)
  )
}

export async function createOrgInvite(
  authFetch: AuthFetch,
  baseUrl: string,
  orgId: string,
  payload: { role: 'org_admin' | 'teacher' | 'student'; expires_in_days: number; max_uses: number }
): Promise<OrgInvite> {
  return handleResponse<OrgInvite>(
    await authFetch(`${baseUrl}/orgs/${orgId}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  )
}

export async function redeemInvite(
  authFetch: AuthFetch,
  baseUrl: string,
  code: string
): Promise<{ org_id: string; role: string; code: string }> {
  return handleResponse<{ org_id: string; role: string; code: string }>(
    await authFetch(`${baseUrl}/invites/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
  )
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
