import { Link } from 'react-router-dom'

const effectiveDate = '2026-03-13'

function Privacy() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-10 text-slate-200">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">FEMT Remote Learning</p>
        <h1 className="text-3xl font-semibold text-white">Privacy Policy</h1>
        <p className="text-sm text-slate-400">
          Effective date: <span className="font-medium text-slate-300">{effectiveDate}</span>
        </p>
      </header>

      <section className="space-y-4 text-sm leading-7 text-slate-300">
        <p>
          FEMT Remote Learning (&quot;FEMT&quot;, &quot;we&quot;, &quot;us&quot;) provides collaboration and virtual classroom
          services for organizations, teachers, students, and teams. This policy explains what
          information we process, why we process it, and your choices.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Information we process</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm text-slate-300">
          <li>Account data: email, name, organization, and role assignments.</li>
          <li>Security metadata: IP address, login timestamps, device/browser details, and audit logs.</li>
          <li>Service data: orgs, rooms, invitations, and session configuration metadata.</li>
          <li>Support communications you send to us.</li>
          <li>
            Collaboration content is designed for end-to-end encryption. Depending on org storage
            mode, encrypted blobs may be stored, or no content may be stored at all.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">How we use information</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm text-slate-300">
          <li>Provide authentication, access control, and secure session management.</li>
          <li>Enforce organization policies and role-based permissions.</li>
          <li>Maintain service reliability, monitor abuse, and prevent unauthorized access.</li>
          <li>Send essential service communications (welcome and password reset).</li>
          <li>Comply with legal obligations when required.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Sharing and subprocessors</h2>
        <p className="text-sm leading-7 text-slate-300">
          We do not sell personal data. We share only what is needed to provide the service, for
          example: identity and access (Keycloak), SMTP email delivery, and infrastructure hosting.
          Organization administrators may access organization data and membership information.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Cookies and security</h2>
        <p className="text-sm leading-7 text-slate-300">
          FEMT uses essential HTTP-only security cookies for authentication and session continuity.
          These cookies are not used for advertising. We apply role checks, encryption controls, and
          transport security to protect your data. We encourage organizations to enable end-to-end
          encryption features where available.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Retention</h2>
        <p className="text-sm leading-7 text-slate-300">
          We retain account and operational records only as long as needed to provide services,
          maintain security, and meet legal obligations. Organization administrators can request data
          export or removal based on configured policies. Security and audit logs are retained for a
          limited period to detect abuse.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Your rights</h2>
        <p className="text-sm leading-7 text-slate-300">
          Subject to local law, you may request access, correction, deletion, or restriction of your
          personal data. Contact your organization administrator first, or contact us directly.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Children and education use</h2>
        <p className="text-sm leading-7 text-slate-300">
          FEMT is intended for use by organizations and schools. Students should use the service
          under the supervision of their organization and with appropriate consent where required.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Contact</h2>
        <p className="text-sm leading-7 text-slate-300">
          Privacy requests: <a href="mailto:privacy@femt.llc" className="text-emerald-300">privacy@femt.llc</a>
        </p>
      </section>

      <footer className="border-t border-slate-800 pt-6 text-sm text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/legal" className="text-indigo-300 hover:text-indigo-200">
            Legal Terms
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

export default Privacy
