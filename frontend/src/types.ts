export type StorageMode = 'metadata_only' | 'encrypted_blobs' | 'fully_p2p'

export type Room = {
  id: string
  name: string
  storage_mode_override: StorageMode | null
}

export type Org = {
  id: string
  name: string
  default_storage_mode: StorageMode
  allow_room_override: boolean
  rooms: Room[]
}

export type OrgInvite = {
  id: string
  org_id: string
  code: string
  role: 'org_admin' | 'teacher' | 'student'
  expires_at: string | null
  max_uses: number
  uses_count: number
  revoked: boolean
  created_at: string
  redeem_url?: string | null
}

export type SessionBootstrap = {
  room_id: string
  room_name: string
  jitsi_domain: string
  jitsi_room_name: string
  display_name: string
  role: string
  can_broadcast: boolean
  storage_mode: StorageMode
  collab_channels: {
    chat: boolean
    whiteboard: boolean
    files: boolean
  }
}
