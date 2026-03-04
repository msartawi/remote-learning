import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-800/70 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/20'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, ready, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (ready && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [ready, isAuthenticated, navigate])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="glass-panel p-8">
      <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
      <p className="mt-2 text-sm text-slate-400">
        Sign in to manage sessions, rooms, and organization settings.
      </p>
      {error ? (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
          {error}
        </div>
      ) : null}

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="text-sm text-slate-300">
          Email address
          <input
            type="email"
            placeholder="you@femt.llc"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-sm text-slate-300">
          Password
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </label>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-700 bg-slate-900" />
            Keep me signed in
          </label>
          <button type="button" className="text-emerald-300 hover:text-emerald-200">
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        New here?{' '}
        <Link to="/register" className="font-semibold text-emerald-300 hover:text-emerald-200">
          Create an account
        </Link>
      </p>
    </div>
  )
}

export default Login
