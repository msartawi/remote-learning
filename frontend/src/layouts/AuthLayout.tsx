import { Outlet } from 'react-router-dom'
import BrandMark from '../components/BrandMark'

const highlights = [
  'Secure classrooms with end-to-end encryption',
  'Role-based spaces for teachers, students, and teams',
  'Works across web, desktop, and mobile devices',
]

function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex flex-col justify-between overflow-hidden border-b border-slate-800/70 px-8 py-10 lg:border-b-0 lg:border-r">
          <div className="relative z-10 space-y-10">
            <BrandMark />
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold text-white md:text-5xl">
                Remote learning, built for real collaboration.
              </h1>
              <p className="max-w-xl text-base text-slate-300 md:text-lg">
                FEMT connects organizations, schools, and teams with secure video sessions, real-time
                collaboration, and flexible storage modes.
              </p>
              <ul className="space-y-3 text-sm text-slate-300">
                {highlights.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="relative z-10 mt-12 text-xs text-slate-400">
            Open-source roadmap • Built on secure, community-first tooling
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-slate-950 to-slate-950" />
          <div className="pointer-events-none absolute -right-48 top-32 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-40 bottom-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        </section>

        <section className="flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </section>
      </div>
    </div>
  )
}

export default AuthLayout
