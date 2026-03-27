# Mediasoup Migration Notes (Spike)

Last updated: 2026-03-27

## Goal

Validate a Jitsi → mediasoup migration path by:

- Running a minimal mediasoup control plane (room + transport + producer/consumer API).
- Adding backend endpoints that enforce role permissions for room control.

## Sandbox service

Location: `mediasoup-sandbox/`

Key endpoints:

- `POST /rooms` → create or fetch a room with router RTP capabilities.
- `POST /rooms/:roomId/transports`
- `POST /rooms/:roomId/transports/:transportId/connect`
- `POST /rooms/:roomId/producers`
- `POST /rooms/:roomId/consumers`

## Backend proxy endpoints

The backend exposes role‑aware endpoints under `/api/mediasoup/*`:

- Room create and producing are limited to `org_admin` / `teacher`.
- Consume and transport setup are allowed for any authenticated role.

Configure the proxy target with:

```
MEDIASOUP_SANDBOX_URL=http://localhost:4001
```

## Mapping from Jitsi

- **Room control**: Jitsi room creation → mediasoup `/rooms` + `/transports`.
- **Role enforcement**: Jitsi moderator → backend role checks for `org_admin` / `teacher`.
- **Future UI**: swap Jitsi embed with mediasoup-client once transport/produce/consume paths are stable.
