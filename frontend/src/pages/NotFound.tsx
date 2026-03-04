import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">404</p>
      <h1 className="text-2xl font-semibold text-white">This page is not available</h1>
      <p className="max-w-md text-sm text-slate-400">
        The page you are looking for has moved or doesn&apos;t exist in this environment yet.
      </p>
      <Link
        to="/dashboard"
        className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
      >
        Back to dashboard
      </Link>
    </div>
  )
}

export default NotFound
