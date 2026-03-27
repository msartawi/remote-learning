import { useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../config'

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-800/70 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/20'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to request reset email')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request reset email')
    }
  }

  return (
    <div className="glass-panel p-8">
      <h2 className="text-2xl font-semibold text-white">Reset password</h2>
      <p className="mt-2 text-sm text-slate-400">
        Enter your account email to receive a secure password reset link.
      </p>

      {submitted ? (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          If your email is registered, a reset link has been sent.
        </div>
      ) : null}

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
            required
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Send reset link
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Back to{' '}
        <Link to="/login" className="font-semibold text-emerald-300 hover:text-emerald-200">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default ForgotPassword
