# Portal Onboarding and Role Flow

Last updated: 2026-03-13

## Finalized policy

- Default role on self-registration: `student` (configurable with `DEFAULT_ROLE`).
- Optional self-assign roles: controlled via `ALLOW_SELF_ASSIGN_ROLES`.
- Invite-based onboarding: invite role overrides self-selected role and creates org membership.

## Backend flow

1. User submits `/api/auth/register` with optional `invite_code`.
2. If invite exists and is valid:
   - role is taken from invite
   - `org_memberships` entry is created/updated
   - invite usage counter increments
3. Session is established with HTTP-only cookie.
4. Auth context is enriched with org memberships for org-scoped API filtering.

## New API endpoints

- `GET /api/orgs/:orgId/invites` - list recent invite codes.
- `POST /api/orgs/:orgId/invites` - create invite code with role/expiry/max-uses.
- `POST /api/invites/redeem` - redeem invite code for authenticated user.

## Frontend flow

- Register page accepts optional invite code (`?invite=` supported).
- Dashboard provides:
  - invite redeem panel for all authenticated users
  - invite creation/listing for teacher/org_admin roles
