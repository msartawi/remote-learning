import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { API_BASE_URL } from '../config'
import { useAuth } from '../auth/AuthContext'
import { getSessionBootstrap } from '../data/sessionApi'
import type { SessionBootstrap } from '../types'
import { capabilitiesForStorageMode } from '../collab/contracts'
import { CollabTransport } from '../collab/transport'

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string
        parentNode: HTMLElement
        width: string
        height: string
        userInfo?: { displayName?: string }
        configOverwrite?: Record<string, unknown>
        interfaceConfigOverwrite?: Record<string, unknown>
      }
    ) => { dispose: () => void }
  }
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

type EncryptedChatMessage = {
  id: string
  sender: string
  encryptedPayload: string
  plaintext: string
  createdAt: string
}

type WhiteboardStroke = {
  id: string
  sender: string
  color: string
  width: number
  points: Array<{ x: number; y: number }>
  createdAt: string
}

function bufferToBase64(data: ArrayBuffer) {
  const bytes = new Uint8Array(data)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function base64ToBuffer(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function deriveSessionKey(passphrase: string, salt: string) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: textEncoder.encode(salt),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptText(key: CryptoKey, plaintext: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(plaintext)
  )
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)
  return bufferToBase64(combined.buffer)
}

async function decryptText(key: CryptoKey, payload: string) {
  const buffer = new Uint8Array(base64ToBuffer(payload))
  const iv = buffer.slice(0, 12)
  const ciphertext = buffer.slice(12)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
  return textDecoder.decode(plaintext)
}

function Session() {
  const { id } = useParams()
  const sessionId = useMemo(() => id ?? 'session-preview', [id])
  const { authFetch } = useAuth()
  const [bootstrap, setBootstrap] = useState<SessionBootstrap | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [collabMode] = useState(() => new CollabTransport())
  const [e2eePassphrase, setE2eePassphrase] = useState('')
  const [e2eeReady, setE2eeReady] = useState(false)
  const [e2eeError, setE2eeError] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<EncryptedChatMessage[]>([])
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<WhiteboardStroke[]>([])
  const jitsiNodeRef = useRef<HTMLDivElement | null>(null)
  const jitsiApiRef = useRef<{ dispose: () => void } | null>(null)
  const e2eeKeyRef = useRef<CryptoKey | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef<WhiteboardStroke | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    getSessionBootstrap(authFetch, API_BASE_URL, sessionId)
      .then((result) => {
        if (active) setBootstrap(result)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load session')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [authFetch, sessionId])

  useEffect(() => {
    if (!e2eePassphrase) {
      setE2eePassphrase(sessionId)
    }
  }, [e2eePassphrase, sessionId])

  useEffect(() => {
    let active = true
    setE2eeReady(false)
    setE2eeError(null)
    if (!e2eePassphrase) return () => {}
    deriveSessionKey(e2eePassphrase, sessionId)
      .then((key) => {
        if (!active) return
        e2eeKeyRef.current = key
        setE2eeReady(true)
      })
      .catch((err) => {
        if (!active) return
        setE2eeError(err instanceof Error ? err.message : 'Unable to initialize E2EE key')
      })
    return () => {
      active = false
    }
  }, [e2eePassphrase, sessionId])

  useEffect(() => {
    if (!bootstrap || !jitsiNodeRef.current) return
    let cancelled = false

    const mountJitsi = () => {
      if (cancelled || !window.JitsiMeetExternalAPI || !jitsiNodeRef.current) return
      jitsiNodeRef.current.innerHTML = ''
      jitsiApiRef.current?.dispose()
      jitsiApiRef.current = new window.JitsiMeetExternalAPI(bootstrap.jitsi_domain, {
        roomName: bootstrap.jitsi_room_name,
        parentNode: jitsiNodeRef.current,
        width: '100%',
        height: '100%',
        userInfo: {
          displayName: bootstrap.display_name,
        },
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableE2EE: true,
        },
      })
    }

    if (window.JitsiMeetExternalAPI) {
      mountJitsi()
    } else {
      const script = document.createElement('script')
      script.src = `https://${bootstrap.jitsi_domain}/external_api.js`
      script.async = true
      script.onload = mountJitsi
      document.body.appendChild(script)
    }

    return () => {
      cancelled = true
      jitsiApiRef.current?.dispose()
      jitsiApiRef.current = null
    }
  }, [bootstrap])

  useEffect(() => {
    if (!bootstrap) return () => {}
    const unsubscribe = collabMode.subscribe(async (event) => {
      if (event.roomId !== sessionId) return
      const key = e2eeKeyRef.current
      if (!key) return
      try {
        if (event.type === 'chat.message') {
          const plaintext = await decryptText(key, event.encryptedPayload)
          setChatMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              sender: event.sender,
              encryptedPayload: event.encryptedPayload,
              plaintext,
              createdAt: event.createdAt,
            },
          ])
        }
        if (event.type === 'whiteboard.patch') {
          const plaintext = await decryptText(key, event.encryptedPatch)
          const patch = JSON.parse(plaintext) as {
            points: Array<{ x: number; y: number }>
            color: string
            width: number
          }
          setWhiteboardStrokes((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              sender: event.sender,
              points: patch.points,
              color: patch.color,
              width: patch.width,
              createdAt: event.createdAt,
            },
          ])
        }
      } catch {
        // Ignore events that fail to decrypt with the current session key.
      }
    })
    return unsubscribe
  }, [bootstrap, collabMode, sessionId])

  const renderWhiteboard = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const strokes = drawingRef.current
      ? [...whiteboardStrokes, drawingRef.current]
      : whiteboardStrokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      stroke.points.forEach((point, index) => {
        const x = point.x * canvas.width
        const y = point.y * canvas.height
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.stroke()
    })
  }

  useEffect(() => {
    renderWhiteboard()
  }, [whiteboardStrokes])

  const handleSendChat = async (event: FormEvent) => {
    event.preventDefault()
    const message = chatInput.trim()
    const key = e2eeKeyRef.current
    if (!message || !key || !bootstrap) return
    const encryptedPayload = await encryptText(key, message)
    collabMode.publish({
      type: 'chat.message',
      roomId: sessionId,
      encryptedPayload,
      sender: bootstrap.display_name,
      createdAt: new Date().toISOString(),
    })
    setChatInput('')
  }

  const handlePointerStart = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!capabilities?.whiteboard) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const point = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    }
    drawingRef.current = {
      id: crypto.randomUUID(),
      sender: bootstrap?.display_name || 'FEMT User',
      color: '#34d399',
      width: 2,
      points: [point],
      createdAt: new Date().toISOString(),
    }
    renderWhiteboard()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const point = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    }
    drawingRef.current.points.push(point)
    renderWhiteboard()
  }

  const handlePointerEnd = async () => {
    const stroke = drawingRef.current
    const key = e2eeKeyRef.current
    if (!stroke || stroke.points.length < 2 || !key || !bootstrap) {
      drawingRef.current = null
      renderWhiteboard()
      return
    }
    drawingRef.current = null
    const payload = JSON.stringify({
      points: stroke.points,
      color: stroke.color,
      width: stroke.width,
    })
    const encryptedPatch = await encryptText(key, payload)
    collabMode.publish({
      type: 'whiteboard.patch',
      roomId: sessionId,
      encryptedPatch,
      sender: bootstrap.display_name,
      createdAt: new Date().toISOString(),
    })
    renderWhiteboard()
  }

  const capabilities = useMemo(
    () => (bootstrap ? capabilitiesForStorageMode(bootstrap.storage_mode) : null),
    [bootstrap]
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live session</p>
          <h1 className="text-xl font-semibold text-white">
            Session {bootstrap?.room_name || sessionId}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="chip">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            E2EE enabled
          </span>
          <button className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950">
            {bootstrap?.can_broadcast ? 'Start broadcast' : 'Viewer mode'}
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="glass-panel p-6 text-sm text-slate-400">Loading secure session bootstrap...</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[2.1fr_1fr]">
        <section className="glass-panel flex min-h-[520px] flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Stage</h2>
            <div className="chip">
              {bootstrap ? `Storage: ${bootstrap.storage_mode}` : 'Preparing media'}
            </div>
          </div>
          <div
            ref={jitsiNodeRef}
            className="flex min-h-[360px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-700/70 bg-slate-950/40 text-sm text-slate-400"
          >
            Jitsi session surface
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {['Teacher', 'Student A', 'Student B'].map((name) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-200"
              >
                <div className="h-8 w-8 rounded-full bg-linear-to-br from-indigo-500 to-emerald-400" />
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-slate-400">Connected</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="glass-panel flex flex-col gap-5 p-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Session tools</h2>
            <p className="mt-2 text-sm text-slate-400">
              Manage encrypted chat and whiteboard collaboration.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Collab transport: {collabMode.mode} • role: {bootstrap?.role ?? 'unknown'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-4 text-xs text-slate-300">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Shared E2EE key (demo)
              <input
                value={e2eePassphrase}
                onChange={(event) => setE2eePassphrase(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-800/70 bg-slate-900/80 px-3 py-2 text-xs text-slate-100"
              />
            </label>
            <p className="mt-2 text-[11px] text-slate-500">
              {e2eeError
                ? `Key error: ${e2eeError}`
                : e2eeReady
                  ? 'Key ready for encryption'
                  : 'Deriving key...'}
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-4 text-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Encrypted chat</h3>
              <span className="text-xs text-slate-500">
                {capabilities?.chat ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {capabilities?.chat ? (
              <>
                <div className="max-h-36 space-y-2 overflow-y-auto text-xs text-slate-300">
                  {chatMessages.length === 0 ? (
                    <p className="text-slate-500">No messages yet.</p>
                  ) : (
                    chatMessages.map((message) => (
                      <div key={message.id} className="rounded-lg border border-slate-800/70 px-3 py-2">
                        <p className="text-[11px] text-slate-500">{message.sender}</p>
                        <p className="text-slate-200">{message.plaintext}</p>
                      </div>
                    ))
                  )}
                </div>
                <form className="flex items-center gap-2" onSubmit={handleSendChat}>
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Send an encrypted message"
                    className="flex-1 rounded-lg border border-slate-800/70 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950"
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <p className="text-xs text-slate-500">Chat is disabled for this storage mode.</p>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-4 text-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Whiteboard</h3>
              <span className="text-xs text-slate-500">
                {capabilities?.whiteboard ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {capabilities?.whiteboard ? (
              <canvas
                ref={canvasRef}
                width={640}
                height={320}
                onPointerDown={handlePointerStart}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerLeave={handlePointerEnd}
                className="h-40 w-full rounded-lg border border-slate-800/70 bg-slate-950/40"
                style={{ touchAction: 'none' }}
              />
            ) : (
              <p className="text-xs text-slate-500">Whiteboard is disabled for this storage mode.</p>
            )}
          </div>

          <div className="space-y-3">
            {[
              { title: 'Files', note: capabilities?.files ? 'Secure handouts' : 'Disabled in P2P mode' },
              { title: 'Attendance', note: 'Auto tracking' },
            ].map((tool) => (
              <div
                key={tool.title}
                className="flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{tool.title}</p>
                  <p className="text-xs text-slate-400">{tool.note}</p>
                </div>
                <button className="rounded-full border border-slate-700/70 px-3 py-1 text-xs text-slate-300 hover:border-indigo-400/70 hover:text-indigo-200">
                  Open
                </button>
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-4 text-xs text-slate-300">
            Invite link
            <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-[11px] text-slate-400">
              https://femt.llc/session/{bootstrap?.room_id || sessionId}
              <button className="text-emerald-300">Copy</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Session
