import { Link } from 'react-router-dom'

function ResetSessionExpired() {
  return (
    <div className="glass-panel p-8">
      <h2 className="text-2xl font-semibold text-white">Reset link expired</h2>
      <p className="mt-2 text-sm text-slate-400">
        For security, password reset links expire after a short time or once used.
      </p>

      <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Please request a new reset email to continue.
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/forgot-password"
          className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Request new link
        </Link>
        <Link
          to="/login"
          className="rounded-xl border border-slate-700/80 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
        >
          Back to login
        </Link>
      </div>
    </div>
  )
}

export default ResetSessionExpired
