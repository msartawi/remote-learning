import { Link } from 'react-router-dom'

const effectiveDate = '2026-03-13'

function Legal() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-10 text-slate-200">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">FEMT Remote Learning</p>
        <h1 className="text-3xl font-semibold text-white">Legal Terms</h1>
        <p className="text-sm text-slate-400">
          Effective date: <span className="font-medium text-slate-300">{effectiveDate}</span>
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">1. Acceptance of terms</h2>
        <p className="text-sm leading-7 text-slate-300">
          By accessing or using FEMT services, you agree to these terms on behalf of yourself and,
          when applicable, your organization.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">2. Service use</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm text-slate-300">
          <li>Use the service only for lawful educational, collaboration, and organizational purposes.</li>
          <li>Do not attempt unauthorized access, disruption, reverse engineering, or abuse.</li>
          <li>Organization admins are responsible for user provisioning and role assignment.</li>
          <li>You are responsible for content shared in your sessions and compliance with local laws.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">3. Accounts and security</h2>
        <p className="text-sm leading-7 text-slate-300">
          You are responsible for maintaining credential confidentiality and reporting suspected
          compromise. FEMT may suspend accounts that present security or abuse risks.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">4. Data and content</h2>
        <p className="text-sm leading-7 text-slate-300">
          You retain ownership of your content. FEMT processes data only to deliver and secure the
          service, as described in the Privacy Policy. Storage behavior depends on your organization
          storage mode configuration.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">5. Third-party services</h2>
        <p className="text-sm leading-7 text-slate-300">
          FEMT may rely on third-party services for identity, email delivery, and hosting. Your use of
          FEMT is subject to their applicable terms where required.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">6. Availability and changes</h2>
        <p className="text-sm leading-7 text-slate-300">
          We aim for reliable service but do not guarantee uninterrupted availability. We may modify
          features, security controls, or policies to maintain platform integrity and compliance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">7. Liability limitations</h2>
        <p className="text-sm leading-7 text-slate-300">
          To the maximum extent permitted by law, FEMT is not liable for indirect, incidental, or
          consequential damages arising from service use.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">8. Termination</h2>
        <p className="text-sm leading-7 text-slate-300">
          We may suspend or terminate access for violations of these terms, security threats, or legal
          requirements.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">9. Governing law</h2>
        <p className="text-sm leading-7 text-slate-300">
          These terms are governed by applicable laws in the jurisdiction where FEMT is operated,
          unless superseded by mandatory local law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">10. Contact</h2>
        <p className="text-sm leading-7 text-slate-300">
          Legal inquiries: <a href="mailto:legal@femt.llc" className="text-emerald-300">legal@femt.llc</a>
        </p>
      </section>

      <footer className="border-t border-slate-800 pt-6 text-sm text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/privacy" className="text-indigo-300 hover:text-indigo-200">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link to="/login" className="text-indigo-300 hover:text-indigo-200">
            Back to sign in
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default Legal
