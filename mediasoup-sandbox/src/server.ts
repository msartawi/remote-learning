import express from 'express'
import * as mediasoup from 'mediasoup'
import { randomUUID } from 'node:crypto'

type Room = {
  id: string
  router: mediasoup.types.Router
  transports: Map<string, mediasoup.types.WebRtcTransport>
  producers: Map<string, mediasoup.types.Producer>
}

const app = express()
app.use(express.json())

const listenIp = process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0'
const announcedIp = process.env.MEDIASOUP_ANNOUNCED_IP || undefined
const port = Number(process.env.MEDIASOUP_PORT || 4001)

const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
    preferredPayloadType: 111,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
    preferredPayloadType: 96,
  },
]

const rooms = new Map<string, Room>()
let worker: mediasoup.types.Worker | null = null

async function ensureWorker() {
  if (worker) return worker
  worker = await mediasoup.createWorker()
  worker.on('died', () => {
    console.error('mediasoup worker died')
    process.exit(1)
  })
  return worker
}

async function getOrCreateRoom(roomId?: string) {
  const id = roomId || randomUUID()
  const existing = rooms.get(id)
  if (existing) return existing
  const currentWorker = await ensureWorker()
  const router = await currentWorker.createRouter({ mediaCodecs })
  const room: Room = {
    id,
    router,
    transports: new Map(),
    producers: new Map(),
  }
  rooms.set(id, room)
  return room
}

function getRoomOrThrow(roomId: string) {
  const room = rooms.get(roomId)
  if (!room) {
    const error = new Error('room_not_found')
    ;(error as Error & { status?: number }).status = 404
    throw error
  }
  return room
}

async function createWebRtcTransport(router: mediasoup.types.Router) {
  return router.createWebRtcTransport({
    listenIps: [
      {
        ip: listenIp,
        announcedIp,
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  })
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/rooms', async (req, res, next) => {
  try {
    const roomId = typeof req.body.roomId === 'string' ? req.body.roomId : undefined
    const room = await getOrCreateRoom(roomId)
    res.json({
      roomId: room.id,
      rtpCapabilities: room.router.rtpCapabilities,
    })
  } catch (err) {
    next(err)
  }
})

app.get('/rooms/:roomId', (req, res, next) => {
  try {
    const room = getRoomOrThrow(req.params.roomId)
    res.json({
      roomId: room.id,
      rtpCapabilities: room.router.rtpCapabilities,
    })
  } catch (err) {
    next(err)
  }
})

app.post('/rooms/:roomId/transports', async (req, res, next) => {
  try {
    const room = getRoomOrThrow(req.params.roomId)
    const transport = await createWebRtcTransport(room.router)
    room.transports.set(transport.id, transport)
    res.json({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    })
  } catch (err) {
    next(err)
  }
})

app.post('/rooms/:roomId/transports/:transportId/connect', async (req, res, next) => {
  try {
    const room = getRoomOrThrow(req.params.roomId)
    const transport = room.transports.get(req.params.transportId)
    if (!transport) {
      return res.status(404).json({ error: 'transport_not_found' })
    }
    await transport.connect({ dtlsParameters: req.body.dtlsParameters })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

app.post('/rooms/:roomId/producers', async (req, res, next) => {
  try {
    const room = getRoomOrThrow(req.params.roomId)
    const transport = room.transports.get(req.body.transportId)
    if (!transport) {
      return res.status(404).json({ error: 'transport_not_found' })
    }
    const producer = await transport.produce({
      kind: req.body.kind,
      rtpParameters: req.body.rtpParameters,
    })
    room.producers.set(producer.id, producer)
    res.json({ id: producer.id })
  } catch (err) {
    next(err)
  }
})

app.post('/rooms/:roomId/consumers', async (req, res, next) => {
  try {
    const room = getRoomOrThrow(req.params.roomId)
    const transport = room.transports.get(req.body.transportId)
    if (!transport) {
      return res.status(404).json({ error: 'transport_not_found' })
    }
    const producer = room.producers.get(req.body.producerId)
    if (!producer) {
      return res.status(404).json({ error: 'producer_not_found' })
    }
    const rtpCapabilities = req.body.rtpCapabilities
    if (!room.router.canConsume({ producerId: producer.id, rtpCapabilities })) {
      return res.status(400).json({ error: 'cannot_consume' })
    }
    const consumer = await transport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: false,
    })
    res.json({
      id: consumer.id,
      producerId: producer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    })
  } catch (err) {
    next(err)
  }
})

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = (err as { status?: number })?.status ?? 500
  const message = err instanceof Error ? err.message : 'Unexpected error'
  res.status(status).json({ error: message })
})

app.listen(port, () => {
  console.log(`mediasoup sandbox listening on ${port}`)
})
