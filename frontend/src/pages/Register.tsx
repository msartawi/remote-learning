import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-800/70 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/20'

function Register() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organization, setOrganization] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { register, ready, isAuthenticated } = useAuth()
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
      await register({
        email,
        password,
        firstName,
        lastName,
        organization,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <div className="glass-panel p-8">
      <h2 className="text-2xl font-semibold text-white">Create your account</h2>
      <p className="mt-2 text-sm text-slate-400">
        Register an organization or join an existing workspace.
      </p>
      {error ? (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
          {error}
        </div>
      ) : null}

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="text-sm text-slate-300">
          First name
          <input
            type="text"
            placeholder="Your name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-sm text-slate-300">
          Last name
          <input
            type="text"
            placeholder="Family name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-sm text-slate-300">
          Work email
          <input
            type="email"
            placeholder="you@school.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-sm text-slate-300">
          Organization / Group
          <input
            type="text"
            placeholder="FEMT Learning Hub"
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-sm text-slate-300">
          Password
          <input
            type="password"
            placeholder="Create a secure password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-indigo-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have access?{' '}
        <Link to="/login" className="font-semibold text-indigo-300 hover:text-indigo-200">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default Register
