import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

function Session() {
  const { id } = useParams()
  const sessionId = useMemo(() => id ?? 'session-preview', [id])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live session</p>
          <h1 className="text-xl font-semibold text-white">Session {sessionId}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="chip">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            E2EE enabled
          </span>
          <button className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950">
            Start broadcast
          </button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[2.1fr_1fr]">
        <section className="glass-panel flex min-h-[520px] flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Stage</h2>
            <div className="chip">Screen share ready</div>
          </div>
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-700/70 bg-slate-950/40 text-sm text-slate-400">
            Video & screen share surface
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {['Teacher', 'Student A', 'Student B'].map((name) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-200"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-400" />
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
          </div>
          <div className="space-y-3">
            {[
              { title: 'Chat', note: 'Encrypted messages' },
              { title: 'Whiteboard', note: 'Live sketches' },
              { title: 'Files', note: 'Secure handouts' },
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
              https://femt.llc/session/{sessionId}
              <button className="text-emerald-300">Copy</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Session
