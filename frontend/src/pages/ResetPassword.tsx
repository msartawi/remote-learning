import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE_URL } from '../config'

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-800/70 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/20'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!token) {
      navigate('/reset-session-expired', { replace: true })
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password }),
    })

    if (response.status === 410) {
      navigate('/reset-session-expired', { replace: true })
      return
    }
    if (!response.ok) {
      const text = await response.text()
      setError(text || 'Unable to reset password')
      return
    }
    setDone(true)
  }

  return (
    <div className="glass-panel p-8">
      <h2 className="text-2xl font-semibold text-white">Set new password</h2>
      <p className="mt-2 text-sm text-slate-400">
        Use a unique password with at least 8 characters.
      </p>

      {!token ? (
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          This reset link is invalid.
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
          {error}
        </div>
      ) : null}

      {done ? (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Password updated successfully. You can now sign in.
        </div>
      ) : (
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="text-sm text-slate-300">
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="text-sm text-slate-300">
            Confirm password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClass}
              required
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Update password
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-400">
        Return to{' '}
        <Link to="/login" className="font-semibold text-emerald-300 hover:text-emerald-200">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default ResetPassword
