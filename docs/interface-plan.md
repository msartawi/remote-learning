# FEMT Interface Plan

Last updated: 2026-03-27

## Goals

- Provide a clear portal experience per role (org admin, teacher, student).
- Keep session UI consistent across web/desktop/mobile with the same core layout.
- Make security and storage mode visible in the UI without overwhelming users.

## Global IA (web)

- Public:
  - `/login`, `/register`, `/privacy`, `/legal`
- Authenticated:
  - `/dashboard` (role-aware portal)
  - `/session/:id` (live session UI)

## Portal dashboards

### Org Admin

- Org overview: org count, room count, active sessions.
- Org settings:
  - Default storage mode
  - Allow room overrides
- Rooms:
  - Create rooms
  - Storage override (if allowed)
- Invites:
  - Create invite codes with role/expiry/max uses
  - View recent invites
- Role assignment:
  - Link to Keycloak admin console

### Teacher

- Org overview (read-only).
- Rooms:
  - Create rooms in assigned orgs
  - Storage override if allowed by org settings
- Invites:
  - Create invite codes for student/teacher
- Role assignment link hidden.

### Student

- Org access summary.
- Join room list (read-only).
- Invite code redemption.

## Session UI

### Core layout

- Top header: session name, role, E2EE status, broadcast control.
- Main stage: Jitsi surface (video/screen share).
- Right panel:
  - Encrypted chat
  - Whiteboard (PoC canvas)
  - Files (mode-aware placeholder)
  - Attendance (placeholder)

### Security cues

- “E2EE enabled” chip in header.
- Storage mode visible near stage.
- Invite link in side panel.

## UX constraints

- Keep role changes consistent with Keycloak realm roles.
- Avoid duplicating admin actions in the student view.
- In P2P mode, disable file transfer entry points.
