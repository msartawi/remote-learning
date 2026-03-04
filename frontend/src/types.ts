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
