import { NavLink, Outlet } from 'react-router-dom'
import BrandMark from '../components/BrandMark'
import { useAuth } from '../auth/AuthContext'

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Sessions', to: '/session/demo-room' },
  { label: 'People', to: '/dashboard#people' },
  { label: 'Settings', to: '/dashboard#settings' },
]

function AppShell() {
  const { profile, logout, roles } = useAuth()
  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName ?? ''}`.trim()
    : profile?.username ?? 'Org Admin'
  const displayEmail = profile?.email ?? 'unknown@femt.llc'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col gap-8 border-b border-slate-800/70 bg-slate-950 px-6 py-8 lg:border-b-0 lg:border-r">
          <BrandMark compact />
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                    isActive
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-950/30'
                      : 'text-slate-300 hover:bg-slate-900/70 hover:text-white',
                  ].join(' ')
                }
              >
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-4 text-xs text-slate-300">
            Storage mode: <span className="font-semibold text-emerald-300">metadata_only</span>
            <p className="mt-2 text-[11px] text-slate-400">
              Switch per organization from the settings panel.
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/70 px-8 py-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Organization</p>
              <h2 className="text-xl font-semibold text-white">FEMT Learning Hub</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-slate-800/70 bg-slate-900 px-4 py-2 text-xs text-slate-300 md:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Secure session ready
              </div>
              <div className="hidden flex-wrap items-center gap-2 text-xs text-slate-400 md:flex">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <span key={role} className="rounded-full border border-slate-700/70 px-3 py-1">
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-slate-700/70 px-3 py-1">no roles</span>
                )}
              </div>
              <div className="flex items-center gap-3 rounded-full border border-slate-800/70 bg-slate-900 px-4 py-2 text-sm text-slate-200">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-400" />
                <div>
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-slate-400">{displayEmail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-full border border-slate-700/70 px-4 py-2 text-xs text-slate-300 transition hover:border-emerald-400/70 hover:text-emerald-200"
              >
                Sign out
              </button>
            </div>
          </header>

          <main className="flex-1 px-8 py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppShell
