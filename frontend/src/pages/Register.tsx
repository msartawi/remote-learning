import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-800/70 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/20'

function Register() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organization, setOrganization] = useState('')
  const { registerWithPrefill } = useAuth()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await registerWithPrefill({
      email,
      firstName,
      lastName,
      organization,
      redirectUri: `${window.location.origin}/dashboard`,
    })
  }

  return (
    <div className="glass-panel p-8">
      <h2 className="text-2xl font-semibold text-white">Create your account</h2>
      <p className="mt-2 text-sm text-slate-400">
        Register an organization or join an existing workspace.
      </p>
      <p className="mt-3 text-xs text-slate-500">
        Registration completes in Keycloak. Make sure registration is enabled in the realm.
      </p>

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
          <input type="password" placeholder="Create a secure password" className={inputClass} />
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-indigo-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300"
        >
          Continue to secure registration
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
