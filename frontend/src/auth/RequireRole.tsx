import { Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import AccessDenied from '../components/AccessDenied'

type RequireRoleProps = {
  roles: string[]
  message?: string
}

function RequireRole({ roles, message }: RequireRoleProps) {
  const { hasAnyRole } = useAuth()

  if (!hasAnyRole(roles)) {
    return <AccessDenied message={message} />
  }

  return <Outlet />
}

export default RequireRole
