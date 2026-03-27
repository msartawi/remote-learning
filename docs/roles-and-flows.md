# Roles and Onboarding Flows

Last updated: 2026-03-27

## Roles

### org_admin

- Create organizations
- Manage org settings (storage mode, room overrides)
- Create rooms
- Create invites for any role
- Assign roles in Keycloak

### teacher

- Create rooms in assigned orgs
- Create invites for student/teacher
- View org settings (read-only)

### student

- Join rooms
- Redeem invite codes
- View org and room lists (read-only)

## Onboarding flows

### Self-registration (no invite)

1. User registers with email + password.
2. Default role applied (`DEFAULT_ROLE`).
3. User sees dashboard with role-appropriate controls.

### Invite-based onboarding

1. Admin/teacher generates invite (`/api/orgs/:orgId/invites`).
2. User registers with invite code.
3. Invite role overrides self-selected role.
4. Org membership is created.

### Post-registration role assignment

- Org admins assign realm roles in Keycloak.
- Role changes apply to the next authenticated session refresh.

## Storage mode behavior

- `metadata_only`: chat + whiteboard enabled, files allowed.
- `encrypted_blobs`: chat + whiteboard enabled, files allowed.
- `fully_p2p`: chat + whiteboard enabled, files disabled.
