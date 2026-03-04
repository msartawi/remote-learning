import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { API_BASE_URL, KEYCLOAK_URL } from '../config'
import { useAuth } from '../auth/AuthContext'
import { createOrg, createRoom, getOrgRooms, getOrgs } from '../data/orgApi'
import type { Org, StorageMode } from '../types'

const storageOptions: StorageMode[] = ['metadata_only', 'encrypted_blobs', 'fully_p2p']

function storageLabel(mode: StorageMode) {
  if (mode === 'metadata_only') return 'Metadata only'
  if (mode === 'encrypted_blobs') return 'Encrypted blobs'
  return 'Fully P2P'
}

function Dashboard() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')
  const [orgMode, setOrgMode] = useState<StorageMode>('metadata_only')
  const [roomDrafts, setRoomDrafts] = useState<Record<string, { name: string; mode: string }>>({})
  const { authFetch, hasAnyRole, hasRole, roles } = useAuth()
  const canCreateOrg = hasAnyRole(['org_admin'])
  const canCreateRoom = hasAnyRole(['org_admin', 'teacher'])
  const isStudentOnly = hasRole('student') && !hasAnyRole(['org_admin', 'teacher'])
  const isTeacher = hasRole('teacher')
  const keycloakAdminUrl = `${KEYCLOAK_URL}/admin/master/console/`

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    getOrgs(authFetch, API_BASE_URL)
      .then((data) => {
        if (active) setOrgs(data)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load orgs')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [authFetch])

  const totalRooms = useMemo(
    () => orgs.reduce((count, org) => count + org.rooms.length, 0),
    [orgs]
  )

  const handleCreateOrg = async (event: FormEvent) => {
    event.preventDefault()
    if (!orgName.trim()) return
    try {
      const created = await createOrg(authFetch, API_BASE_URL, orgName.trim(), orgMode)
      setOrgs((prev) => [created, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create org')
    }
    setOrgName('')
  }

  const handleCreateRoom = async (orgId: string, event: FormEvent) => {
    event.preventDefault()
    const draft = roomDrafts[orgId]
    if (!draft?.name?.trim()) return
    const override = draft.mode ? (draft.mode as StorageMode) : null
    try {
      await createRoom(authFetch, API_BASE_URL, orgId, draft.name.trim(), override)
      const refreshedRooms = await getOrgRooms(authFetch, API_BASE_URL, orgId)
      setOrgs((prev) =>
        prev.map((org) => (org.id === orgId ? { ...org, rooms: refreshedRooms } : org))
      )
      setRoomDrafts((prev) => ({ ...prev, [orgId]: { name: '', mode: '' } }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    }
  }

  const updateRoomDraft = (orgId: string, patch: Partial<{ name: string; mode: string }>) => {
    setRoomDrafts((prev) => {
      const current = prev[orgId] ?? { name: '', mode: '' }
      return {
        ...prev,
        [orgId]: { ...current, ...patch },
      }
    })
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel p-6">
          <h1 className="text-2xl font-semibold text-white">Organization dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage org access, storage modes, and classroom sessions.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Organizations</p>
              <p className="mt-3 text-2xl font-semibold text-white">{orgs.length}</p>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rooms</p>
              <p className="mt-3 text-2xl font-semibold text-white">{totalRooms}</p>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active sessions</p>
              <p className="mt-3 text-2xl font-semibold text-white">3</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6">
          {canCreateOrg ? (
            <>
              <h2 className="text-lg font-semibold text-white">Create organization</h2>
              <p className="mt-2 text-sm text-slate-400">
                New organizations can inherit a default storage mode.
              </p>
              <form className="mt-6 space-y-4" onSubmit={handleCreateOrg}>
                <input
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                  placeholder="Organization name"
                  className="w-full rounded-xl border border-slate-800/70 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
                <select
                  value={orgMode}
                  onChange={(event) => setOrgMode(event.target.value as StorageMode)}
                  className="w-full rounded-xl border border-slate-800/70 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                >
                  {storageOptions.map((option) => (
                    <option key={option} value={option}>
                      {storageLabel(option)}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  Create organization
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white">Your access</h2>
              <p className="mt-2 text-sm text-slate-400">
                Access is scoped to your assigned role. Ask an org admin to expand permissions.
              </p>
              <div className="mt-6 space-y-3 text-sm text-slate-300">
                <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3">
                  Current role: <span className="font-semibold">{roles.join(', ') || 'none'}</span>
                </div>
                {isTeacher ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-100">
                    Teachers can create rooms inside their organization.
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100">
                    You need the <span className="font-semibold">org_admin</span> role to create
                    organizations.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {isStudentOnly ? (
        <section className="glass-panel p-6">
          <h2 className="text-lg font-semibold text-white">Student view</h2>
          <p className="mt-2 text-sm text-slate-400">
            You can join rooms and participate in live sessions. Room creation is disabled for your role.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {orgs.flatMap((org) => org.rooms).slice(0, 4).map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{room.name}</p>
                  <p className="text-xs text-slate-400">Ready to join</p>
                </div>
                <button className="rounded-full border border-slate-700/70 px-3 py-1 text-xs text-slate-300 hover:border-emerald-400/70 hover:text-emerald-200">
                  Join
                </button>
              </div>
            ))}
            {orgs.flatMap((org) => org.rooms).length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800/70 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
                No rooms available yet. Ask your teacher to create one.
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {canCreateOrg ? (
        <section className="glass-panel p-6">
          <h2 className="text-lg font-semibold text-white">Role assignments</h2>
          <p className="mt-2 text-sm text-slate-400">
            Assign org_admin, teacher, and student roles in Keycloak to control who can manage rooms.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={keycloakAdminUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Open Keycloak Admin Console
            </a>
            <span className="text-xs text-slate-500">
              Use Realm Roles or Client Roles for femt-frontend.
            </span>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Organizations & rooms</h2>
            <p className="mt-1 text-xs text-slate-500">
              Roles detected: {roles.length > 0 ? roles.join(', ') : 'none'}
            </p>
          </div>
          <div className="chip">Storage-aware controls for every room</div>
        </div>
        {error ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="glass-panel p-6 text-sm text-slate-400">Loading organizations...</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {orgs.map((org) => (
              <div key={org.id} className="glass-panel p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{org.name}</h3>
                    <p className="text-xs text-slate-400">
                      Default storage: {storageLabel(org.default_storage_mode)}
                    </p>
                  </div>
                  <span className="chip">
                    {org.allow_room_override ? 'Room overrides enabled' : 'Room overrides locked'}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {org.rooms.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-800/70 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
                      No rooms yet. Create one to get started.
                    </div>
                  ) : (
                    org.rooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-white">{room.name}</p>
                          <p className="text-xs text-slate-400">
                            {room.storage_mode_override
                              ? `Override: ${storageLabel(room.storage_mode_override)}`
                              : `Inherits ${storageLabel(org.default_storage_mode)}`}
                          </p>
                        </div>
                        <button className="rounded-full border border-slate-700/70 px-3 py-1 text-xs text-slate-300 hover:border-emerald-400/70 hover:text-emerald-200">
                          Open room
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {canCreateRoom ? (
                  <form
                    className="mt-5 grid gap-3 rounded-xl border border-dashed border-slate-800/70 bg-slate-900/40 p-4"
                    onSubmit={(event) => handleCreateRoom(org.id, event)}
                  >
                    <input
                      value={roomDrafts[org.id]?.name ?? ''}
                      onChange={(event) => updateRoomDraft(org.id, { name: event.target.value })}
                      placeholder="New room name"
                      className="w-full rounded-lg border border-slate-800/70 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                    />
                    <select
                      value={roomDrafts[org.id]?.mode ?? ''}
                      onChange={(event) => updateRoomDraft(org.id, { mode: event.target.value })}
                      className="w-full rounded-lg border border-slate-800/70 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                    >
                      <option value="">Use org default</option>
                      {storageOptions.map((option) => (
                        <option key={option} value={option}>
                          {storageLabel(option)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                    >
                      Add room
                    </button>
                  </form>
                ) : (
                  <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                    You need <span className="font-semibold">org_admin</span> or{' '}
                    <span className="font-semibold">teacher</span> role to create rooms.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Dashboard
