import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_BASE_URL } from '../config'
import { useAuth } from '../auth/AuthContext'
import { getSessionBootstrap } from '../data/sessionApi'
import type { SessionBootstrap } from '../types'
import { capabilitiesForStorageMode } from '../collab/contracts'
import { CollabTransport } from '../collab/transport'

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string
        parentNode: HTMLElement
        width: string
        height: string
        userInfo?: { displayName?: string }
        configOverwrite?: Record<string, unknown>
        interfaceConfigOverwrite?: Record<string, unknown>
      }
    ) => { dispose: () => void }
  }
}

function Session() {
  const { id } = useParams()
  const sessionId = useMemo(() => id ?? 'session-preview', [id])
  const { authFetch } = useAuth()
  const [bootstrap, setBootstrap] = useState<SessionBootstrap | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [collabMode] = useState(() => new CollabTransport())
  const jitsiNodeRef = useRef<HTMLDivElement | null>(null)
  const jitsiApiRef = useRef<{ dispose: () => void } | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    getSessionBootstrap(authFetch, API_BASE_URL, sessionId)
      .then((result) => {
        if (active) setBootstrap(result)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load session')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [authFetch, sessionId])

  useEffect(() => {
    if (!bootstrap || !jitsiNodeRef.current) return
    let cancelled = false

    const mountJitsi = () => {
      if (cancelled || !window.JitsiMeetExternalAPI || !jitsiNodeRef.current) return
      jitsiNodeRef.current.innerHTML = ''
      jitsiApiRef.current?.dispose()
      jitsiApiRef.current = new window.JitsiMeetExternalAPI(bootstrap.jitsi_domain, {
        roomName: bootstrap.jitsi_room_name,
        parentNode: jitsiNodeRef.current,
        width: '100%',
        height: '100%',
        userInfo: {
          displayName: bootstrap.display_name,
        },
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
        },
      })
    }

    if (window.JitsiMeetExternalAPI) {
      mountJitsi()
    } else {
      const script = document.createElement('script')
      script.src = `https://${bootstrap.jitsi_domain}/external_api.js`
      script.async = true
      script.onload = mountJitsi
      document.body.appendChild(script)
    }

    return () => {
      cancelled = true
      jitsiApiRef.current?.dispose()
      jitsiApiRef.current = null
    }
  }, [bootstrap])

  const capabilities = useMemo(
    () => (bootstrap ? capabilitiesForStorageMode(bootstrap.storage_mode) : null),
    [bootstrap]
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live session</p>
          <h1 className="text-xl font-semibold text-white">
            Session {bootstrap?.room_name || sessionId}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="chip">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            E2EE enabled
          </span>
          <button className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950">
            {bootstrap?.can_broadcast ? 'Start broadcast' : 'Viewer mode'}
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="glass-panel p-6 text-sm text-slate-400">Loading secure session bootstrap...</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[2.1fr_1fr]">
        <section className="glass-panel flex min-h-[520px] flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Stage</h2>
            <div className="chip">
              {bootstrap ? `Storage: ${bootstrap.storage_mode}` : 'Preparing media'}
            </div>
          </div>
          <div
            ref={jitsiNodeRef}
            className="flex min-h-[360px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-700/70 bg-slate-950/40 text-sm text-slate-400"
          >
            Jitsi session surface
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {['Teacher', 'Student A', 'Student B'].map((name) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-200"
              >
                <div className="h-8 w-8 rounded-full bg-linear-to-br from-indigo-500 to-emerald-400" />
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-slate-400">Connected</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="glass-panel flex flex-col gap-5 p-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Session tools</h2>
            <p className="mt-2 text-sm text-slate-400">
              Manage chat, notes, files, and attendance in one panel.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Collab transport: {collabMode.mode} • role: {bootstrap?.role ?? 'unknown'}
            </p>
          </div>
          <div className="space-y-3">
            {[
              { title: 'Chat', note: capabilities?.chat ? 'Encrypted messages' : 'Disabled in this mode' },
              {
                title: 'Whiteboard',
                note: capabilities?.whiteboard ? 'Live sketches' : 'Disabled in this mode',
              },
              { title: 'Files', note: capabilities?.files ? 'Secure handouts' : 'Disabled in P2P mode' },
              { title: 'Attendance', note: 'Auto tracking' },
            ].map((tool) => (
              <div
                key={tool.title}
                className="flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{tool.title}</p>
                  <p className="text-xs text-slate-400">{tool.note}</p>
                </div>
                <button className="rounded-full border border-slate-700/70 px-3 py-1 text-xs text-slate-300 hover:border-indigo-400/70 hover:text-indigo-200">
                  Open
                </button>
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-4 text-xs text-slate-300">
            Invite link
            <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-[11px] text-slate-400">
              https://femt.llc/session/{bootstrap?.room_id || sessionId}
              <button className="text-emerald-300">Copy</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Session
