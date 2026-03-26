import type { StorageMode } from '../types'

export type CollabChannel = 'chat' | 'whiteboard' | 'files'

export type CollabCapabilities = Record<CollabChannel, boolean>

export type ChatMessageEvent = {
  type: 'chat.message'
  roomId: string
  encryptedPayload: string
  sender: string
  createdAt: string
}

export type WhiteboardPatchEvent = {
  type: 'whiteboard.patch'
  roomId: string
  encryptedPatch: string
  sender: string
  createdAt: string
}

export type FileEnvelopeEvent = {
  type: 'files.envelope'
  roomId: string
  encryptedDescriptor: string
  sender: string
  createdAt: string
}

export type CollabEvent = ChatMessageEvent | WhiteboardPatchEvent | FileEnvelopeEvent

export function capabilitiesForStorageMode(storageMode: StorageMode): CollabCapabilities {
  if (storageMode === 'fully_p2p') {
    return { chat: true, whiteboard: true, files: false }
  }
  return { chat: true, whiteboard: true, files: true }
}
