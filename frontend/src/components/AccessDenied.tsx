import { Link } from 'react-router-dom'

type AccessDeniedProps = {
  message?: string
}

function AccessDenied({ message = 'You do not have access to this area yet.' }: AccessDeniedProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Access denied</p>
      <h1 className="text-2xl font-semibold text-white">Permission required</h1>
      <p className="max-w-md text-sm text-slate-400">{message}</p>
      <Link
        to="/dashboard"
        className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
      >
        Back to dashboard
      </Link>
    </div>
  )
}

export default AccessDenied
