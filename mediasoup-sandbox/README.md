# Mediasoup Sandbox (Spike)

This sandbox validates the Jitsi → mediasoup migration path by providing a minimal room control API.

## Run locally

```bash
cd mediasoup-sandbox
npm install
npm run dev
```

Environment variables:

- `MEDIASOUP_PORT` (default `4001`)
- `MEDIASOUP_LISTEN_IP` (default `0.0.0.0`)
- `MEDIASOUP_ANNOUNCED_IP` (optional public IP for NAT)

## API overview

- `POST /rooms` → `{ roomId, rtpCapabilities }`
- `GET /rooms/:roomId`
- `POST /rooms/:roomId/transports`
- `POST /rooms/:roomId/transports/:transportId/connect`
- `POST /rooms/:roomId/producers`
- `POST /rooms/:roomId/consumers`

This API matches the minimal shape required by mediasoup-client.
