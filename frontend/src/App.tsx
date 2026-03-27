import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './layouts/AppShell'
import AuthLayout from './layouts/AuthLayout'
import RequireAuth from './auth/RequireAuth'
import RequireRole from './auth/RequireRole'
import Dashboard from './pages/Dashboard'
import Legal from './pages/Legal'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Privacy from './pages/Privacy'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ResetSessionExpired from './pages/ResetSessionExpired'
import Session from './pages/Session'

function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-session-expired" element={<ResetSessionExpired />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/legal" element={<Legal />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route
            element={
              <RequireRole
                roles={['org_admin', 'teacher', 'student']}
                message="Ask your admin to assign you a role in the organization."
              />
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/session/:id" element={<Session />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
